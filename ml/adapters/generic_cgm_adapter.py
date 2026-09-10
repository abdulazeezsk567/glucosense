"""
GlucoSense: Generic Continuous Glucose Monitoring (CGM) Dataset Adapter
A flexible, multi-format adapter capable of ingesting arbitrary public or clinical CGM datasets
(e.g., OhioT1DM, Shanghai, Jaeb Center, Abbott FreeStyle Libre, Dexcom Clarity, or custom folders).
Supports single combined files, multi-file patient directories, CSV/TSV/Parquet, and automatic unit conversion.
"""

import os
import glob
from typing import Dict, Any, Optional, List, Union, Tuple
import numpy as np
import pandas as pd
from ml.adapters.base_adapter import CGMDatasetAdapter, CohortData, Episode


MMOL_TO_MGDL = 18.0182

CANDIDATE_SUBJECT_COLS = ["subject_id", "subjectid", "subject", "patient_id", "patientid", "id", "ptid", "userid"]
CANDIDATE_TIME_COLS = ["timestamp", "displaytime", "devicetimestamp", "time", "datetime", "date_time", "record_time"]
CANDIDATE_GLUCOSE_COLS = ["glucose", "glucosevalue", "historic glucose", "glucose_mg_dl", "reading", "value", "cgm"]
CANDIDATE_DIAG_COLS = ["diagnosis", "condition", "status", "class", "group", "diabetes_type"]


def detect_column(df: pd.DataFrame, candidates: List[str]) -> Optional[str]:
    """Helper to detect matching column name case-insensitively."""
    lower_map = {c.lower().strip().replace(" ", "_"): c for c in df.columns}
    for cand in candidates:
        if cand in lower_map:
            return lower_map[cand]
    # Secondary check for substring match
    for col in df.columns:
        for cand in candidates:
            if cand in col.lower():
                return col
    return None


class GenericCGMAdapter(CGMDatasetAdapter):
    """
    Ingests and normalizes CGM telemetry from arbitrary clinical or open-source archives.
    """

    def __init__(
        self,
        telemetry_source: str,                        # File path, directory path, or glob pattern
        metadata_file: Optional[str] = None,          # Optional patient metadata table
        cohort_name: str = "Generic CGM Cohort",
        subject_col: Optional[str] = None,
        time_col: Optional[str] = None,
        glucose_col: Optional[str] = None,
        diagnosis_col: Optional[str] = None,
        class_mapping: Optional[Dict[str, int]] = None,
        display_class_mapping: Optional[Dict[int, str]] = None,
        default_class: int = 0,
        resample_interval_min: int = 5,
        max_gap_split_min: int = 60,
        max_interpolate_min: int = 30,
        is_mmol_l: Optional[bool] = None              # True to force mmol/L -> mg/dL; None for auto-detect
    ):
        super().__init__(
            resample_interval_min=resample_interval_min,
            max_gap_split_min=max_gap_split_min,
            max_interpolate_min=max_interpolate_min
        )
        self.telemetry_source = telemetry_source
        self.metadata_file = metadata_file
        self.cohort_name = cohort_name
        self.subject_col = subject_col
        self.time_col = time_col
        self.glucose_col = glucose_col
        self.diagnosis_col = diagnosis_col
        self.class_mapping = class_mapping or {
            "normal": 0, "healthy": 0, "control": 0, "non-diabetic": 0, "0": 0,
            "prediabetes": 1, "pre-diabetic": 1, "ifg": 1, "igt": 1, "1": 1,
            "t2d": 2, "type 2": 2, "diabetic": 2, "type 2 diabetes": 2, "diabetes": 2, "2": 2
        }
        self.display_class_mapping = display_class_mapping or {
            0: "Normal",
            1: "Prediabetes",
            2: "Type 2 Diabetes"
        }
        self.default_class = default_class
        self.is_mmol_l = is_mmol_l

    def _load_metadata(self) -> Tuple[pd.DataFrame, Dict[str, int]]:
        """Load and normalize clinical metadata if provided."""
        if self.metadata_file is None or not os.path.exists(self.metadata_file):
            return pd.DataFrame(), {}

        if self.metadata_file.endswith(".tsv"):
            m_df = pd.read_csv(self.metadata_file, sep="\t")
        elif self.metadata_file.endswith(".parquet"):
            m_df = pd.read_parquet(self.metadata_file)
        else:
            m_df = pd.read_csv(self.metadata_file)

        s_col = self.subject_col or detect_column(m_df, CANDIDATE_SUBJECT_COLS)
        d_col = self.diagnosis_col or detect_column(m_df, CANDIDATE_DIAG_COLS)

        if s_col is None:
            return m_df, {}

        m_df["subject_id"] = m_df[s_col].astype(str).str.strip()
        diagnosis_map = {}

        if d_col:
            for _, row in m_df.iterrows():
                sid = row["subject_id"]
                raw_d = str(row[d_col]).strip().lower()
                if raw_d in self.class_mapping:
                    diagnosis_map[sid] = self.class_mapping[raw_d]
                else:
                    # Partial matching
                    matched = False
                    for k, v in self.class_mapping.items():
                        if k in raw_d:
                            diagnosis_map[sid] = v
                            matched = True
                            break
                    if not matched:
                        diagnosis_map[sid] = self.default_class

        return m_df, diagnosis_map

    def _discover_and_load_telemetry(self) -> pd.DataFrame:
        """Loads telemetry from a single file or a directory of files."""
        files = []
        if os.path.isfile(self.telemetry_source):
            files = [self.telemetry_source]
        elif os.path.isdir(self.telemetry_source):
            for ext in ["*.csv", "*.tsv", "*.parquet"]:
                files.extend(glob.glob(os.path.join(self.telemetry_source, "**", ext), recursive=True))
        else:
            files = glob.glob(self.telemetry_source)

        if not files:
            raise FileNotFoundError(f"No telemetry files found matching: {self.telemetry_source}")

        dfs = []
        for f in files:
            try:
                if f.endswith(".tsv"):
                    sub_df = pd.read_csv(f, sep="\t")
                elif f.endswith(".parquet"):
                    sub_df = pd.read_parquet(f)
                else:
                    sub_df = pd.read_csv(f)

                # If file doesn't have subject column, use filename as subject ID
                s_col = self.subject_col or detect_column(sub_df, CANDIDATE_SUBJECT_COLS)
                if s_col is None:
                    file_stem = os.path.splitext(os.path.basename(f))[0]
                    sub_df["subject_id"] = file_stem
                dfs.append(sub_df)
            except Exception as e:
                print(f"[GenericCGMAdapter WARNING] Failed to read {f}: {e}")

        if not dfs:
            raise ValueError(f"Could not load any data from {self.telemetry_source}")

        combined = pd.concat(dfs, ignore_index=True)
        return combined

    def load_cohort(self) -> CohortData:
        """Executes full loading, cleaning, unit conversion, and episode segmentation."""
        meta_df, diagnosis_lookup = self._load_metadata()
        raw_telemetry = self._discover_and_load_telemetry()

        # Detect columns
        s_col = self.subject_col or detect_column(raw_telemetry, CANDIDATE_SUBJECT_COLS) or "subject_id"
        t_col = self.time_col or detect_column(raw_telemetry, CANDIDATE_TIME_COLS)
        g_col = self.glucose_col or detect_column(raw_telemetry, CANDIDATE_GLUCOSE_COLS)

        if t_col is None:
            raise ValueError(f"Could not auto-detect timestamp column in columns: {list(raw_telemetry.columns)}")
        if g_col is None:
            raise ValueError(f"Could not auto-detect glucose column in columns: {list(raw_telemetry.columns)}")

        # Clean telemetry table
        cleaned = self.clean_telemetry_table(raw_telemetry, subject_col=s_col, time_col=t_col, glucose_col=g_col)

        # Unit auto-detection: if 99th percentile glucose < 35, readings are in mmol/L
        convert_to_mgdl = False
        if self.is_mmol_l is True:
            convert_to_mgdl = True
        elif self.is_mmol_l is None:
            p99 = float(cleaned["glucose"].quantile(0.99))
            if p99 < 35.0:
                print(f"[GenericCGMAdapter] Auto-detected mmol/L units (p99={p99:.2f}). Converting to mg/dL.")
                convert_to_mgdl = True

        if convert_to_mgdl:
            cleaned["glucose"] = cleaned["glucose"] * MMOL_TO_MGDL

        # Filter physiological bounds after unit normalization
        cleaned = cleaned[
            (cleaned["glucose"] >= self.phys_min) &
            (cleaned["glucose"] <= self.phys_max)
        ]

        # Segment episodes per participant
        episodes: List[Episode] = []
        for sid, grp in cleaned.groupby("subject_id"):
            class_idx = diagnosis_lookup.get(sid, self.default_class)

            p_meta = {}
            if not meta_df.empty and "subject_id" in meta_df.columns:
                sub_meta = meta_df[meta_df["subject_id"] == sid]
                if not sub_meta.empty:
                    p_meta = sub_meta.iloc[0].to_dict()

            subj_episodes = self.segment_episodes(
                grp,
                subject_id=sid,
                class_idx=class_idx,
                metadata=p_meta
            )
            episodes.extend(subj_episodes)

        return CohortData(
            cohort_name=self.cohort_name,
            episodes=episodes,
            participants_df=meta_df if not meta_df.empty else pd.DataFrame({"subject_id": list(cleaned["subject_id"].unique())}),
            class_mapping=self.class_mapping,
            display_class_mapping=self.display_class_mapping
        )
