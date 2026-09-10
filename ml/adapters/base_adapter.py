"""
GlucoSense: Abstract Base Adapter for Continuous Glucose Monitoring (CGM) Datasets.
Provides a standardized interface and robust validation for ingesting diverse CGM cohorts
while strictly enforcing physiological bounds, missing data handling, and leakage isolation.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
import pandas as pd


# Standard physiological bounds for continuous interstitial glucose (mg/dL)
PHYSIOLOGICAL_MIN_GLUCOSE = 30.0
PHYSIOLOGICAL_MAX_GLUCOSE = 500.0

# Sensor hardware clamping defaults (Dexcom G4/G5/G6 defaults, customizable)
DEFAULT_SENSOR_LOW_LIMIT = 40.0
DEFAULT_SENSOR_HIGH_LIMIT = 400.0


@dataclass
class Episode:
    """
    A continuous episode of uniformly sampled CGM readings from a single participant.
    Guaranteed to have no temporal gaps exceeding max_gap_minutes.
    """
    subject_id: str
    timestamps: np.ndarray             # Array of datetime64[ns]
    glucose: np.ndarray                # Array of float32 glucose values (mg/dL)
    is_imputed: np.ndarray             # Boolean array indicating whether reading was interpolated
    class_idx: int                     # Integer diagnosis label (e.g. 0=Normal, 1=Prediabetes, 2=T2D)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def __len__(self) -> int:
        return len(self.glucose)

    @property
    def duration_hours(self) -> float:
        if len(self.timestamps) < 2:
            return 0.0
        diff_ns = self.timestamps[-1] - self.timestamps[0]
        return float(diff_ns) / (1e9 * 3600.0)


@dataclass
class CohortData:
    """
    Standardized container holding all validated episodes and clinical metadata for a cohort.
    """
    cohort_name: str
    episodes: List[Episode]
    participants_df: pd.DataFrame       # Table with subject_id, diagnosis, demographic info
    class_mapping: Dict[str, int]
    display_class_mapping: Dict[int, str]

    @property
    def total_episodes(self) -> int:
        return len(self.episodes)

    @property
    def total_readings(self) -> int:
        return sum(len(ep) for ep in self.episodes)

    @property
    def unique_subjects(self) -> List[str]:
        return sorted(list(set(ep.subject_id for ep in self.episodes)))

    def get_subject_episodes(self, subject_id: str) -> List[Episode]:
        return [ep for ep in self.episodes if ep.subject_id == subject_id]

    def summarize(self) -> Dict[str, Any]:
        """Generate cohort-level health and distribution summary."""
        subj_counts = {}
        class_counts = {}
        total_hours = 0.0
        total_imputed = 0

        for ep in self.episodes:
            subj_counts[ep.subject_id] = subj_counts.get(ep.subject_id, 0) + 1
            class_counts[ep.class_idx] = class_counts.get(ep.class_idx, 0) + len(ep)
            total_hours += ep.duration_hours
            total_imputed += int(np.sum(ep.is_imputed))

        total_pts = self.total_readings
        impute_rate = (total_imputed / total_pts * 100.0) if total_pts > 0 else 0.0

        return {
            "cohort_name": self.cohort_name,
            "unique_subjects": len(self.unique_subjects),
            "total_episodes": self.total_episodes,
            "total_readings": total_pts,
            "total_monitored_hours": round(total_hours, 1),
            "imputed_readings": total_imputed,
            "imputation_percentage": round(impute_rate, 2),
            "readings_per_class": {
                self.display_class_mapping.get(k, str(k)): v for k, v in class_counts.items()
            }
        }


class CGMDatasetAdapter(ABC):
    """
    Abstract Base Class for ingesting and regularizing CGM datasets.
    Subclasses implement vendor- or repository-specific data readers.
    """

    def __init__(
        self,
        resample_interval_min: int = 5,
        max_gap_split_min: int = 60,
        max_interpolate_min: int = 30,
        phys_min: float = PHYSIOLOGICAL_MIN_GLUCOSE,
        phys_max: float = PHYSIOLOGICAL_MAX_GLUCOSE,
        sensor_low_clamping: float = DEFAULT_SENSOR_LOW_LIMIT,
        sensor_high_clamping: float = DEFAULT_SENSOR_HIGH_LIMIT
    ):
        self.resample_interval_min = resample_interval_min
        self.max_gap_split_min = max_gap_split_min
        self.max_interpolate_min = max_interpolate_min
        self.phys_min = phys_min
        self.phys_max = phys_max
        self.sensor_low_clamping = sensor_low_clamping
        self.sensor_high_clamping = sensor_high_clamping

    @abstractmethod
    def load_cohort(self) -> CohortData:
        """Load raw source files and return a validated CohortData container."""
        pass

    def clean_telemetry_table(
        self,
        df: pd.DataFrame,
        subject_col: str,
        time_col: str,
        glucose_col: str
    ) -> pd.DataFrame:
        """
        Cleans sensor table:
        - Casts string sensor limit tokens ('Low' -> clamp_low, 'High' -> clamp_high)
        - Drops non-numeric or unparseable timestamps
        - Filters physiological limits [phys_min, phys_max]
        - Deduplicates identical timestamps per subject
        - Sorts chronologically
        """
        cleaned = df.copy()

        # 1. Clean glucose string tokens
        g_series = cleaned[glucose_col].astype(str).str.strip().str.lower()
        g_series = g_series.replace({
            "low": str(self.sensor_low_clamping),
            "<40": str(self.sensor_low_clamping),
            "high": str(self.sensor_high_clamping),
            ">400": str(self.sensor_high_clamping),
        })
        cleaned["_glucose"] = pd.to_numeric(g_series, errors="coerce")
        cleaned = cleaned.dropna(subset=["_glucose"])

        # 2. Physiological filter
        cleaned = cleaned[
            (cleaned["_glucose"] >= self.phys_min) &
            (cleaned["_glucose"] <= self.phys_max)
        ]

        # 3. Parse timestamp
        cleaned["_timestamp"] = pd.to_datetime(cleaned[time_col], errors="coerce")
        cleaned = cleaned.dropna(subset=["_timestamp"])

        # 4. Format subject identifier
        cleaned["_subject_id"] = cleaned[subject_col].astype(str).str.strip()

        # 5. Deduplicate and sort
        cleaned = cleaned.drop_duplicates(subset=["_subject_id", "_timestamp"])
        cleaned = cleaned.sort_values(by=["_subject_id", "_timestamp"])

        return cleaned[["_subject_id", "_timestamp", "_glucose"]].rename(
            columns={"_subject_id": "subject_id", "_timestamp": "timestamp", "_glucose": "glucose"}
        )

    def segment_episodes(
        self,
        cleaned_df: pd.DataFrame,
        subject_id: str,
        class_idx: int,
        metadata: Optional[Dict[str, Any]] = None
    ) -> List[Episode]:
        """
        Segments a single patient's continuous series into gap-free regular episodes:
        - Detects temporal gaps exceeding max_gap_split_min and splits episodes.
        - Resamples each segment to a uniform grid (e.g. 5 minutes).
        - Linearly interpolates short missing points (<= max_interpolate_min).
        - Marks interpolated readings with boolean mask is_imputed.
        """
        episodes: List[Episode] = []
        if "subject_id" in cleaned_df.columns:
            if cleaned_df["subject_id"].nunique() == 1:
                subj_df = cleaned_df.sort_values("timestamp")
            else:
                subj_df = cleaned_df[cleaned_df["subject_id"] == subject_id].sort_values("timestamp")
        else:
            subj_df = cleaned_df.sort_values("timestamp")

        if len(subj_df) < 2:
            return episodes

        # Calculate consecutive time gaps
        time_diffs = subj_df["timestamp"].diff().dt.total_seconds() / 60.0

        # Mark episode split points where gap > max_gap_split_min
        split_mask = time_diffs > self.max_gap_split_min
        episode_ids = split_mask.cumsum()

        freq_str = f"{self.resample_interval_min}min"
        max_interp_steps = max(1, int(self.max_interpolate_min / self.resample_interval_min))

        for _, ep_raw in subj_df.groupby(episode_ids):
            if len(ep_raw) < 2:
                continue

            ep_indexed = ep_raw.set_index("timestamp")

            # Resample to regular interval grid using bucket mean
            resampled = ep_indexed[["glucose"]].resample(freq_str).mean()

            # Record which points were missing prior to interpolation
            was_missing = resampled["glucose"].isna().values

            # Linear interpolation with maximum limit on consecutive missing steps
            resampled_interp = resampled["glucose"].interpolate(
                method="time",
                limit=max_interp_steps,
                limit_direction="both"
            )

            # Drop any remaining unfillable NaN gaps (which exceed max_interp_steps)
            valid_mask = ~resampled_interp.isna()
            if not valid_mask.any():
                continue

            # If there are internal NaN blocks that weren't filled, split further
            # Group consecutive valid entries
            valid_blocks = (~valid_mask).cumsum()[valid_mask]
            for _, block_idx in valid_blocks.groupby(valid_blocks):
                block_series = resampled_interp.loc[block_idx.index]
                if len(block_series) < 4: # Require at least 20 mins of continuous data
                    continue

                t_vals = block_series.index.values.astype("datetime64[ns]")
                g_vals = block_series.values.astype(np.float32)
                sub_missing = was_missing[resampled.index.isin(block_series.index)]

                ep = Episode(
                    subject_id=subject_id,
                    timestamps=t_vals,
                    glucose=g_vals,
                    is_imputed=sub_missing,
                    class_idx=class_idx,
                    metadata=metadata or {}
                )
                episodes.append(ep)

        return episodes
