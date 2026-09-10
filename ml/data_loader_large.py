"""
GlucoSense: Scalable, Leakage-Free Dataset Loader & Window Generator
Supports large multi-patient cohorts with configurable sequence horizons (e.g., 2h vs 24h),
strict participant-level splitting, training-only feature standardizer calibration,
and total exclusion of diagnostic/clinical biomarkers from model inputs.
"""

import os
import json
from typing import Dict, Any, List, Tuple, Optional
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from ml.adapters.base_adapter import CohortData, Episode


class ScalableCGMDataset:
    """
    Manages sliding window generation, leak-free participant splitting,
    and training-only feature normalization for large CGM cohorts.
    """

    def __init__(
        self,
        window_size: int = 24,          # Sequence length: 24 steps = 2h, 288 steps = 24h
        stride: int = 6,                # Step stride between consecutive windows
        include_imputed_channel: bool = False, # Channel 3: boolean is_imputed mask
        seed: int = 42
    ):
        self.window_size = window_size
        self.stride = stride
        self.include_imputed_channel = include_imputed_channel
        self.seed = seed
        self.scaler_config: Optional[Dict[str, Any]] = None

    def extract_windows_from_cohort(
        self,
        cohort: CohortData
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray, pd.DataFrame]:
        """
        Extracts sliding windows from all episodes in the cohort:
        - Rejects episodes shorter than window_size.
        - Calculates 3 core channels:
            1. Glucose level (mg/dL)
            2. First difference / rate of change (mg/dL per step)
            3. Euglycemic normalized delta (G - 100) / 50
        - Optional Channel 4: is_imputed boolean indicator (0.0 or 1.0)
        - Strictly excludes all clinical biomarkers (HbA1c, FBG, BMI, etc.) from X.
        """
        X_list: List[np.ndarray] = []
        y_list: List[int] = []
        subject_list: List[str] = []
        meta_list: List[Dict[str, Any]] = []

        for ep in cohort.episodes:
            if len(ep) < self.window_size:
                continue

            g_vals = ep.glucose
            t_vals = ep.timestamps
            imp_vals = ep.is_imputed

            # Slide window across continuous episode
            for start_idx in range(0, len(g_vals) - self.window_size + 1, self.stride):
                end_idx = start_idx + self.window_size
                w_g = g_vals[start_idx:end_idx]
                w_imp = imp_vals[start_idx:end_idx].astype(np.float32)

                # Channel 0: Raw Interstitial Glucose
                # Channel 1: First difference (rate of change)
                diff = np.diff(w_g, prepend=w_g[0])

                # Channel 2: Euglycemic deviation from 100 mg/dL
                delta_norm = (w_g - 100.0) / 50.0

                channels = [w_g, diff, delta_norm]
                if self.include_imputed_channel:
                    channels.append(w_imp)

                # Window array: shape (window_size, num_channels)
                window_features = np.column_stack(channels).astype(np.float32)

                X_list.append(window_features)
                y_list.append(ep.class_idx)
                subject_list.append(ep.subject_id)

                meta_list.append({
                    "subject_id": ep.subject_id,
                    "class_idx": ep.class_idx,
                    "class_name": cohort.display_class_mapping.get(ep.class_idx, str(ep.class_idx)),
                    "mean_glucose": float(np.mean(w_g)),
                    "std_glucose": float(np.std(w_g)),
                    "min_glucose": float(np.min(w_g)),
                    "max_glucose": float(np.max(w_g)),
                    "tir_70_180": float(np.mean((w_g >= 70.0) & (w_g <= 180.0)) * 100.0),
                    "imputed_points_count": int(np.sum(w_imp)),
                    "start_time": str(t_vals[start_idx]),
                    "end_time": str(t_vals[end_idx - 1])
                })

        if not X_list:
            raise ValueError(
                f"No windows extracted. Check if episode lengths exceed window_size={self.window_size}."
            )

        X = np.array(X_list, dtype=np.float32)
        y = np.array(y_list, dtype=np.int64)
        subjects = np.array(subject_list)
        meta_df = pd.DataFrame(meta_list)

        return X, y, subjects, meta_df

    def split_by_patient(
        self,
        X: np.ndarray,
        y: np.ndarray,
        subjects: np.ndarray,
        train_ratio: float = 0.70,
        val_ratio: float = 0.15,
        test_ratio: float = 0.15
    ) -> Dict[str, Tuple[np.ndarray, np.ndarray, np.ndarray]]:
        """
        Enforces STRICT PARTICIPANT-LEVEL STRATIFIED PARTITIONING.
        Every sliding window from subject S is assigned exclusively to Train, Val, or Test.
        Guarantees zero overlap across partitions.
        """
        assert abs((train_ratio + val_ratio + test_ratio) - 1.0) < 1e-5, "Ratios must sum to 1.0"

        # Map each subject to their dominant class label
        unique_subjs = np.unique(subjects)
        subj_classes = []
        for s in unique_subjs:
            s_mask = subjects == s
            labels, counts = np.unique(y[s_mask], return_counts=True)
            subj_classes.append(labels[np.argmax(counts)])

        subj_df = pd.DataFrame({
            "subject_id": unique_subjs,
            "class_idx": subj_classes
        })

        # Can stratify if every class has at least 2 subjects
        min_class_count = subj_df["class_idx"].value_counts().min()
        stratify_col = subj_df["class_idx"] if min_class_count >= 2 else None

        # Split 1: Train vs Temp (Val + Test)
        temp_ratio = val_ratio + test_ratio
        train_subjs, temp_subjs = train_test_split(
            subj_df,
            test_size=temp_ratio,
            random_state=self.seed,
            stratify=stratify_col
        )

        # Split 2: Val vs Test
        temp_stratify = temp_subjs["class_idx"] if (stratify_col is not None and temp_subjs["class_idx"].value_counts().min() >= 2) else None
        relative_test_ratio = test_ratio / temp_ratio
        val_subjs, test_subjs = train_test_split(
            temp_subjs,
            test_size=relative_test_ratio,
            random_state=self.seed,
            stratify=temp_stratify
        )

        train_ids = set(train_subjs["subject_id"])
        val_ids = set(val_subjs["subject_id"])
        test_ids = set(test_subjs["subject_id"])

        # Strict assertion of disjoint sets
        assert len(train_ids.intersection(val_ids)) == 0, "Leakage detected: Train and Val overlap!"
        assert len(train_ids.intersection(test_ids)) == 0, "Leakage detected: Train and Test overlap!"
        assert len(val_ids.intersection(test_ids)) == 0, "Leakage detected: Val and Test overlap!"

        train_mask = np.isin(subjects, list(train_ids))
        val_mask = np.isin(subjects, list(val_ids))
        test_mask = np.isin(subjects, list(test_ids))

        return {
            "train": (X[train_mask], y[train_mask], subjects[train_mask]),
            "val": (X[val_mask], y[val_mask], subjects[val_mask]),
            "test": (X[test_mask], y[test_mask], subjects[test_mask])
        }

    def fit_and_apply_scaler(
        self,
        splits: Dict[str, Tuple[np.ndarray, np.ndarray, np.ndarray]],
        class_mapping: Dict[str, int],
        display_class_mapping: Dict[int, str]
    ) -> Dict[str, Tuple[np.ndarray, np.ndarray, np.ndarray]]:
        """
        Fits feature standardizer STRICTLY ON THE TRAINING SPLIT.
        Validation and Test partitions are normalized using frozen training parameters.
        """
        X_train = splits["train"][0]
        n_channels = X_train.shape[-1]

        means: List[float] = []
        stds: List[float] = []

        feature_names = ["glucose", "rate_of_change", "delta_norm"]
        if self.include_imputed_channel:
            feature_names.append("is_imputed")

        for c in range(n_channels):
            # For boolean channel (is_imputed), keep unscaled or 0-1
            if c == 3 and self.include_imputed_channel:
                m_val = 0.0
                s_val = 1.0
            else:
                m_val = float(np.mean(X_train[:, :, c]))
                s_val = float(np.std(X_train[:, :, c]))
                if s_val == 0.0 or np.isnan(s_val):
                    s_val = 1.0

            means.append(m_val)
            stds.append(s_val)

        self.scaler_config = {
            "feature_names": feature_names,
            "means": means,
            "stds": stds,
            "window_size": int(self.window_size),
            "stride": int(self.stride),
            "include_imputed_channel": bool(self.include_imputed_channel),
            "class_mapping": class_mapping,
            "display_class_mapping": display_class_mapping
        }

        # Transform all splits using training statistics
        scaled_splits: Dict[str, Tuple[np.ndarray, np.ndarray, np.ndarray]] = {}
        for split_name, (X, y, subjs) in splits.items():
            X_scaled = X.copy()
            for c in range(n_channels):
                if c == 3 and self.include_imputed_channel:
                    continue # Keep boolean mask unscaled
                X_scaled[:, :, c] = (X_scaled[:, :, c] - means[c]) / stds[c]
            scaled_splits[split_name] = (X_scaled, y, subjs)

        return scaled_splits

    def save_processed_splits(
        self,
        scaled_splits: Dict[str, Tuple[np.ndarray, np.ndarray, np.ndarray]],
        meta_df: pd.DataFrame,
        output_dir: str,
        scaler_save_path: str
    ):
        """Persists processed splits, window metadata, and frozen scaler configuration."""
        os.makedirs(output_dir, exist_ok=True)
        os.makedirs(os.path.dirname(scaler_save_path), exist_ok=True)

        for split_name, (X_s, y_s, subjs_s) in scaled_splits.items():
            np.save(os.path.join(output_dir, f"X_{split_name}.npy"), X_s)
            np.save(os.path.join(output_dir, f"y_{split_name}.npy"), y_s)
            np.save(os.path.join(output_dir, f"subjects_{split_name}.npy"), subjs_s)

        meta_path = os.path.join(output_dir, "window_metadata.csv")
        meta_df.to_csv(meta_path, index=False)

        if self.scaler_config is not None:
            with open(scaler_save_path, "w") as f:
                json.dump(self.scaler_config, f, indent=2)

        print(f"[ScalableCGMDataset] Processed splits saved to: {output_dir}")
        print(f"[ScalableCGMDataset] Scaler configuration saved to: {scaler_save_path}")
