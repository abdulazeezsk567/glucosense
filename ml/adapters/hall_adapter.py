"""
GlucoSense: Hall et al. (2018) Dataset Adapter
Concrete adapter for the 57-patient Hall et al. continuous glucose monitoring cohort
(PLOS Biology, DOI: 10.1371/journal.pbio.2005143).
"""

import os
import sqlite3
from typing import Dict, Any, Optional
import pandas as pd
from ml.adapters.base_adapter import CGMDatasetAdapter, CohortData, Episode

CLASS_MAP_3 = {
    "non-diabetic": 0,
    "pre-diabetic": 1,
    "diabetic": 2
}

DISPLAY_CLASS_MAP_3 = {
    0: "Normal",
    1: "Prediabetes",
    2: "Type 2 Diabetes"
}


class HallDatasetAdapter(CGMDatasetAdapter):
    """
    Adapter for loading and regularizing the Hall et al. (2018) PLOS Biology dataset.
    """

    def __init__(
        self,
        raw_data_dir: Optional[str] = None,
        resample_interval_min: int = 5,
        max_gap_split_min: int = 60,
        max_interpolate_min: int = 30
    ):
        super().__init__(
            resample_interval_min=resample_interval_min,
            max_gap_split_min=max_gap_split_min,
            max_interpolate_min=max_interpolate_min,
            sensor_low_clamping=40.0,
            sensor_high_clamping=400.0
        )
        if raw_data_dir is None:
            project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            raw_data_dir = os.path.join(project_root, "data", "raw")
        self.raw_data_dir = raw_data_dir

    def load_cohort(self) -> CohortData:
        """Loads and structures the Hall et al. cohort into standardized Episode objects."""
        cgm_file = os.path.join(self.raw_data_dir, "cgm_readings_raw.tsv")
        gz_file = os.path.join(self.raw_data_dir, "pbio.2005143.s010.gz")
        summary_csv = os.path.join(self.raw_data_dir, "participants_summary.csv")
        db_file = os.path.join(self.raw_data_dir, "clinical_metadata.db")

        # 1. Load clinical metadata
        if os.path.exists(summary_csv):
            clinical_df = pd.read_csv(summary_csv)
            subj_col = "userID" if "userID" in clinical_df.columns else "subject_id"
        elif os.path.exists(db_file):
            conn = sqlite3.connect(db_file)
            clinical_df = pd.read_sql("SELECT * FROM clinical", conn)
            conn.close()
            subj_col = "userID"
        else:
            raise FileNotFoundError(f"Missing clinical metadata at {summary_csv} or {db_file}")

        clinical_df["subject_id"] = clinical_df[subj_col].astype(str).str.strip()
        diag_col = "diagnosis"
        clinical_df["diagnosis_clean"] = clinical_df[diag_col].astype(str).str.strip().str.lower()

        # Map diagnosis string to class index
        diagnosis_lookup = {}
        for _, row in clinical_df.iterrows():
            sid = row["subject_id"]
            d = row["diagnosis_clean"]
            if d in CLASS_MAP_3:
                diagnosis_lookup[sid] = CLASS_MAP_3[d]

        # 2. Load CGM telemetry (prefer full pbio gz file if available)
        if os.path.exists(gz_file):
            cgm_raw = pd.read_csv(gz_file, sep="\t", compression="gzip")
        elif os.path.exists(cgm_file):
            cgm_raw = pd.read_csv(cgm_file, sep="\t")
        else:
            raise FileNotFoundError(f"Missing CGM readings file at {gz_file} or {cgm_file}")

        # 3. Clean telemetry table
        cleaned_cgm = self.clean_telemetry_table(
            cgm_raw,
            subject_col="subjectId" if "subjectId" in cgm_raw.columns else "subject_id",
            time_col="DisplayTime" if "DisplayTime" in cgm_raw.columns else "timestamp",
            glucose_col="GlucoseValue" if "GlucoseValue" in cgm_raw.columns else "glucose"
        )

        # 4. Segment episodes for each participant
        episodes = []
        for sid, grp in cleaned_cgm.groupby("subject_id"):
            if sid not in diagnosis_lookup:
                continue
            class_idx = diagnosis_lookup[sid]
            patient_meta = clinical_df[clinical_df["subject_id"] == sid].to_dict(orient="records")
            p_meta = patient_meta[0] if patient_meta else {}

            subj_episodes = self.segment_episodes(
                grp,
                subject_id=sid,
                class_idx=class_idx,
                metadata=p_meta
            )
            episodes.extend(subj_episodes)

        return CohortData(
            cohort_name="Hall et al. (2018) PLOS Biology",
            episodes=episodes,
            participants_df=clinical_df,
            class_mapping=CLASS_MAP_3,
            display_class_mapping=DISPLAY_CLASS_MAP_3
        )
