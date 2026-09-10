"""
GlucoSense: Frozen CNN-LSTM Model Inference Engine
Integrates the locked combined Hall + CGMacros model (models/combined_cnn_lstm.pt)
and scaler (models/combined_scaler.json) for 24-hour CGM-based glycemic-risk assessment.

FROZEN SPECIFICATION:
- Input: 24-hour CGM sequence (288 samples at 5-min resolution)
- Channels: Channel 0 = Glucose (mg/dL), Channel 1 = Rate of Change (diff)
- Classes:
    0 = Normal
    1 = Prediabetes / Early Type 2
    2 = Type 2 Diabetes
- Decision Rule: argmax(probabilities)
- Multi-window Aggregation: Soft probability voting (mean probabilities across valid windows)
"""

import os
import sys
import json
from typing import List, Dict, Any, Union, Optional, Tuple
import numpy as np
import pandas as pd
import torch

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from ml.model import GlucoSenseCNNLSTM
from ml.risk_assessment import assess_glycemic_risk

MODELS_DIR = os.path.join(PROJECT_ROOT, "models")
CHECKPOINT_COMBINED = os.path.join(MODELS_DIR, "combined_cnn_lstm.pt")
SCALER_COMBINED = os.path.join(MODELS_DIR, "combined_scaler.json")

CLASSES_3 = [
    "Normal",
    "Prediabetes / Early Type 2",
    "Type 2 Diabetes"
]

PHYSIOLOGICAL_MIN_GLUCOSE = 30.0
PHYSIOLOGICAL_MAX_GLUCOSE = 500.0
SENSOR_LOW_CLAMPING = 40.0
SENSOR_HIGH_CLAMPING = 400.0
WINDOW_SIZE = 288
SAMPLING_INTERVAL_MIN = 5
MAX_INTERPOLATE_MIN = 30
MAX_GAP_SPLIT_MIN = 60
MMOL_TO_MGDL = 18.0


class GlucoSenseInferenceEngine:
    _instance: Optional["GlucoSenseInferenceEngine"] = None

    def __init__(self, device: str = "cpu"):
        self.device = device
        self.model: Optional[GlucoSenseCNNLSTM] = None
        self.scaler: Optional[Dict[str, Any]] = None
        self.means: List[float] = [125.29316711425781, -0.00029589180485345423]
        self.stds: List[float] = [39.7910270690918, 4.416027069091797]
        self.classes = CLASSES_3
        self.metadata: Dict[str, Any] = {}
        self._load_artifacts()

    @classmethod
    def get_instance(cls, device: str = "cpu") -> "GlucoSenseInferenceEngine":
        if cls._instance is None:
            cls._instance = cls(device=device)
        return cls._instance

    def _load_artifacts(self):
        """Loads the frozen model weights and scaler without modifying them."""
        if not os.path.exists(CHECKPOINT_COMBINED):
            raise FileNotFoundError(f"Locked checkpoint not found at: {CHECKPOINT_COMBINED}")
        if not os.path.exists(SCALER_COMBINED):
            raise FileNotFoundError(f"Locked scaler not found at: {SCALER_COMBINED}")

        # Load scaler
        with open(SCALER_COMBINED, "r") as f:
            self.scaler = json.load(f)
            self.means = self.scaler.get("means", self.means)
            self.stds = self.scaler.get("stds", self.stds)

        # Metadata reporting conforming to verified evaluation benchmarks
        self.metadata = {
            "model_name": "GlucoSense Combined 1D CNN-LSTM",
            "version": "1.0.0-combined",
            "checkpoint": "models/combined_cnn_lstm.pt",
            "scaler": "models/combined_scaler.json",
            "architecture": "1D CNN-LSTM (in_channels=2, seq_length=288, conv_filters=64, lstm_hidden=64, lstm_layers=2, num_classes=3)",
            "trainable_parameters": 88067,
            "total_parameters": 88067,
            "total_state_dict_elements": 88325,
            "input_specification": {
                "sequence_duration_hours": 24,
                "sequence_length_samples": 288,
                "sampling_interval_minutes": 5,
                "features": ["glucose", "rate_of_change"],
                "input_tensor_shape": [None, 288, 2]
            },
            "classes": self.classes,
            "decision_rule": "argmax(probabilities) with soft voting across multiple windows",
            "training_cohorts": {
                "cohorts": ["Hall (PLoS Biology 2018)", "CGMacros (PhysioNet 2025)"],
                "total_participants": 102,
                "type_2_participants": 19
            },
            "verified_evaluation": {
                "evaluation_type": "Research evaluation on held-out combined cohort (16 participants: 9 Normal, 4 Prediabetes, 3 T2D)",
                "total_participants": 16,
                "accuracy": 0.6875,
                "balanced_accuracy": 0.6481,
                "macro_f1": 0.6317,
                "per_class_recall": {
                    "normal": 0.778,
                    "prediabetes": 0.500,
                    "type2_diabetes": 0.667
                },
                "per_class_precision": {
                    "normal": 0.875,
                    "prediabetes": 0.667,
                    "type2_diabetes": 0.400
                }
            },
            "external_validation": {
                "cohort": "MOBILE",
                "status": "Not completed",
                "reason": "Participant-level traces were not acquired under controlled-access DUA requirements."
            },
            "is_mock": False,
            "disclaimer": "This AI model is a research prototype and has not been clinically validated. It is not intended to diagnose, treat, or manage diabetes. Consult a qualified healthcare professional for medical decisions."
        }

        # Initialize model architecture: 2 in_channels, 288 seq_length, 3 classes
        self.model = GlucoSenseCNNLSTM(
            in_channels=2,
            seq_length=WINDOW_SIZE,
            conv_filters=64,
            conv_kernel_size=3,
            lstm_hidden_size=64,
            lstm_num_layers=2,
            lstm_dropout=0.2,
            dense_units=64,
            dropout_rate=0.3,
            num_classes=3
        ).to(self.device)

        # Load weights into frozen evaluation mode
        checkpoint = torch.load(CHECKPOINT_COMBINED, map_location=self.device)
        state_dict = checkpoint["state_dict"] if "state_dict" in checkpoint else checkpoint
        self.model.load_state_dict(state_dict)
        self.model.eval()

    def clean_and_segment_telemetry(
        self,
        readings: List[Any],
        is_mmol_l: Optional[bool] = None
    ) -> List[np.ndarray]:
        """
        Parses, cleans, normalizes units, resamples to 5 minutes, and segments into
        continuous episodes without long gaps.

        Returns list of 1D numpy arrays of regular 5-minute glucose values (mg/dL).
        """
        if not readings or len(readings) == 0:
            return []

        # Determine input format: dicts with timestamp/glucose vs plain numeric values
        first_item = readings[0]
        has_timestamps = isinstance(first_item, dict) and any(
            k in first_item for k in ["timestamp", "time", "DisplayTime", "datetime"]
        )

        if has_timestamps:
            records = []
            for r in readings:
                if not isinstance(r, dict):
                    continue
                t = r.get("timestamp") or r.get("time") or r.get("DisplayTime") or r.get("datetime")
                g = r.get("glucose") or r.get("value") or r.get("GlucoseValue")
                if t is not None and g is not None:
                    records.append({"timestamp": t, "glucose": g})

            if not records:
                return []

            df = pd.DataFrame(records)

            # Clean glucose column (handle strings like "Low", "<40", "High", ">400")
            g_str = df["glucose"].astype(str).str.strip().str.lower()
            g_str = g_str.replace({
                "low": str(SENSOR_LOW_CLAMPING),
                "<40": str(SENSOR_LOW_CLAMPING),
                "high": str(SENSOR_HIGH_CLAMPING),
                ">400": str(SENSOR_HIGH_CLAMPING)
            })
            df["glucose"] = pd.to_numeric(g_str, errors="coerce")
            df = df.dropna(subset=["glucose"])

            # Unit detection / conversion
            if is_mmol_l is True:
                df["glucose"] = df["glucose"] * MMOL_TO_MGDL
            elif is_mmol_l is None:
                p99 = float(df["glucose"].quantile(0.99)) if len(df) > 0 else 100.0
                if p99 < 35.0:
                    df["glucose"] = df["glucose"] * MMOL_TO_MGDL

            # Physiological filter
            df = df[
                (df["glucose"] >= PHYSIOLOGICAL_MIN_GLUCOSE) &
                (df["glucose"] <= PHYSIOLOGICAL_MAX_GLUCOSE)
            ]

            # Parse timestamps
            df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce")
            df = df.dropna(subset=["timestamp"])
            if df.empty:
                return []

            # Deduplicate timestamps and sort
            df = df.groupby("timestamp").agg({"glucose": "mean"}).reset_index()
            df = df.sort_values("timestamp")

            if len(df) < 2:
                return []

            # Time gaps in minutes
            time_diffs = df["timestamp"].diff().dt.total_seconds() / 60.0
            split_mask = time_diffs > MAX_GAP_SPLIT_MIN
            episode_ids = split_mask.cumsum()

            episodes_glucose = []
            max_interp_steps = int(MAX_INTERPOLATE_MIN / SAMPLING_INTERVAL_MIN) # 6 steps

            for _, ep_raw in df.groupby(episode_ids):
                if len(ep_raw) < 2:
                    continue
                ep_indexed = ep_raw.set_index("timestamp")
                # Resample to uniform 5-minute grid
                resampled = ep_indexed[["glucose"]].resample(f"{SAMPLING_INTERVAL_MIN}min").mean()

                # Linear interpolate short gaps up to 30 mins
                resampled_interp = resampled["glucose"].interpolate(
                    method="time",
                    limit=max_interp_steps,
                    limit_direction="both"
                )

                valid_mask = ~resampled_interp.isna()
                if not valid_mask.any():
                    continue

                # Split further on any remaining unfillable NaN blocks (>30 min)
                valid_blocks = (~valid_mask).cumsum()[valid_mask]
                for _, block_idx in valid_blocks.groupby(valid_blocks):
                    block_series = resampled_interp.loc[block_idx.index]
                    episodes_glucose.append(block_series.values.astype(np.float32))

            return episodes_glucose

        else:
            # Plain numeric readings array
            vals = []
            for v in readings:
                if v is None:
                    continue
                try:
                    vals.append(float(v))
                except (ValueError, TypeError):
                    continue

            if len(vals) == 0:
                return []

            arr = np.array(vals, dtype=np.float32)

            # Unit detection / conversion
            if is_mmol_l is True:
                arr = arr * float(MMOL_TO_MGDL)
            elif is_mmol_l is None:
                p99 = float(np.percentile(arr, 99)) if len(arr) > 0 else 100.0
                if p99 < 35.0:
                    arr = arr * float(MMOL_TO_MGDL)

            # Filter physiological bounds
            arr = arr[(arr >= PHYSIOLOGICAL_MIN_GLUCOSE) & (arr <= PHYSIOLOGICAL_MAX_GLUCOSE)]
            return [arr] if len(arr) > 0 else []

    def extract_and_scale_windows(
        self,
        episodes_glucose: List[np.ndarray],
        stride: int = WINDOW_SIZE,
        allow_short: bool = False
    ) -> Tuple[Optional[np.ndarray], int, float]:
        """
        Extracts 288-sample windows with 2 channels:
        Channel 0: Interstitial Glucose (mg/dL)
        Channel 1: Rate of Change (first difference per 5-min step)

        Scales channels using the locked combined scaler parameters.
        Returns:
            tensor_array: (num_windows, sequence_length, 2) or None if no valid window
            valid_windows_count: int
            coverage: float
        """
        windows = []
        total_samples = 0

        for ep in episodes_glucose:
            total_samples += len(ep)
            if len(ep) < WINDOW_SIZE:
                if allow_short and len(ep) >= 12:
                    # Allow short single window for legacy compatibility
                    w_g = ep
                    diff = np.diff(w_g, prepend=w_g[0])
                    window_feat = np.column_stack([w_g, diff]).astype(np.float32)
                    window_feat[:, 0] = (window_feat[:, 0] - self.means[0]) / self.stds[0]
                    window_feat[:, 1] = (window_feat[:, 1] - self.means[1]) / self.stds[1]
                    windows.append(window_feat)
                continue

            # Slide window (stride=288 for non-overlapping 24-hour days)
            for start_idx in range(0, len(ep) - WINDOW_SIZE + 1, stride):
                w_g = ep[start_idx : start_idx + WINDOW_SIZE]
                if len(w_g) != WINDOW_SIZE:
                    continue

                # Channel 0: Raw glucose
                # Channel 1: Rate of change (diff with first element prepended)
                diff = np.diff(w_g, prepend=w_g[0])

                window_feat = np.column_stack([w_g, diff]).astype(np.float32)

                # Standardize using locked scaler
                window_feat[:, 0] = (window_feat[:, 0] - self.means[0]) / self.stds[0]
                window_feat[:, 1] = (window_feat[:, 1] - self.means[1]) / self.stds[1]

                windows.append(window_feat)

        if not windows:
            return None, 0, 0.0

        batch = np.array(windows, dtype=np.float32)
        coverage = min(1.0, float(len(windows) * WINDOW_SIZE) / max(1.0, float(total_samples)))
        return batch, len(windows), coverage

    def predict(
        self,
        glucose_readings: Optional[List[Any]] = None,
        readings: Optional[List[Any]] = None,
        current_glucose: Optional[float] = None,
        is_mmol_l: Optional[bool] = None,
        require_24h: bool = True,
        **kwargs  # Safely ignore any unapproved demographic or clinical inputs (age, BMI, HbA1c, etc.)
    ) -> Dict[str, Any]:
        """
        Executes strictly CGM-based inference using the frozen combined CNN-LSTM model.
        Clinical biomarkers (HbA1c, BMI, age, insulin) are EXCLUDED from model inputs.

        Returns structured prediction response or safe insufficient_data rejection.
        """
        # Accept readings or glucose_readings
        raw_readings = readings if readings is not None else glucose_readings
        if (not raw_readings or len(raw_readings) == 0) and current_glucose is not None:
            raw_readings = [current_glucose]

        if not raw_readings or len(raw_readings) == 0:
            return {
                "status": "insufficient_data",
                "message": "At least 24 hours of sufficiently complete CGM data is required.",
                "valid_windows": 0
            }

        # Clean, filter, resample, and segment into episodes
        episodes = self.clean_and_segment_telemetry(raw_readings, is_mmol_l=is_mmol_l)

        # Allow short sequences only if require_24h is False (legacy test compatibility)
        allow_short = not require_24h

        # Extract windows
        window_batch, num_windows, coverage = self.extract_and_scale_windows(
            episodes, stride=WINDOW_SIZE, allow_short=allow_short
        )

        if window_batch is None or num_windows == 0:
            return {
                "status": "insufficient_data",
                "message": "At least 24 hours of sufficiently complete CGM data is required.",
                "valid_windows": 0,
                "data_quality": {
                    "sampling_interval_minutes": SAMPLING_INTERVAL_MIN,
                    "sequence_length_required": WINDOW_SIZE,
                    "valid_windows": 0
                }
            }

        # Execute feed-forward inference in evaluation mode
        input_tensor = torch.tensor(window_batch, dtype=torch.float32).to(self.device)

        with torch.no_grad():
            logits = self.model(input_tensor) # shape: (num_windows, 3)
            probs = torch.softmax(logits, dim=-1).cpu().numpy() # shape: (num_windows, 3)

        # Soft probability voting across multiple valid windows
        # Aggregates probabilities using mean probability vector, then applies argmax once
        mean_probs = np.mean(probs, axis=0) # shape: (3,)
        pred_idx = int(np.argmax(mean_probs))
        confidence = float(mean_probs[pred_idx])
        pred_class = self.classes[pred_idx]

        probabilities_dict = {
            "normal": round(float(mean_probs[0]), 4),
            "prediabetes": round(float(mean_probs[1]), 4),
            "type2_diabetes": round(float(mean_probs[2]), 4),
            # Backward-compatible percentage keys for legacy test assertions
            "type2": round(float(mean_probs[2] * 100.0), 1),
            "type1": 0.0,
            "type3c": 0.0,
            "gestational": 0.0
        }

        # Non-diagnostic research guidance
        recommendations = []
        if pred_idx == 0:
            recommendations.append("Euglycemic diurnal stability observed across the 24-hour monitoring horizon.")
            recommendations.append("Continue standard wellness nutrition and periodic continuous glucose tracking.")
        elif pred_idx == 1:
            recommendations.append("Borderline glycemic excursions or elevated postprandial glycemic recovery times flagged.")
            recommendations.append("Structured lifestyle and dietary carbohydrate review may support glucose homeostasis.")
            recommendations.append("Consider consulting a healthcare provider for formal diagnostic testing (e.g. laboratory HbA1c).")
        else: # Type 2 Diabetes risk category
            recommendations.append("Elevated glycemic variability and sustained postprandial elevation patterns identified.")
            recommendations.append("Model classification reflects Type 2 Diabetes risk category on research benchmarks.")
            recommendations.append("Consult a qualified healthcare professional for medical diagnosis and clinical evaluation.")

        # Compute auxiliary time-series metrics if continuous values available
        flat_readings = [float(v) for ep in episodes for v in ep]
        risk_summary = assess_glycemic_risk(glucose_readings=flat_readings) if flat_readings else {}

        actual_seq_len = int(window_batch.shape[1])

        return {
            "status": "success",
            "prediction": pred_class,
            "classification": pred_class, # Alias for backward compatibility
            "predicted_class_id": pred_idx,
            "probabilities": probabilities_dict,
            "confidence": round(confidence if confidence <= 1.0 else confidence / 100.0, 4),
            "valid_windows": num_windows,
            "data_quality": {
                "sampling_interval_minutes": SAMPLING_INTERVAL_MIN,
                "sequence_length": actual_seq_len,
                "total_readings_analyzed": num_windows * actual_seq_len,
                "coverage": round(coverage, 2)
            },
            "recommendations": recommendations,
            "risk_assessment": risk_summary,
            "model_metadata": self.metadata,
            "disclaimer": "This AI model is a research prototype and has not been clinically validated. It is not intended to diagnose, treat, or manage diabetes. Consult a qualified healthcare professional for medical decisions."
        }


if __name__ == "__main__":
    engine = GlucoSenseInferenceEngine.get_instance()
    synthetic_trace = [100.0 + 10.0 * np.sin(i / 10.0) for i in range(288)]
    res = engine.predict(readings=synthetic_trace)
    print("Inference Test Result:\n", json.dumps(res, indent=2))
