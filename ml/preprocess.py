"""
GlucoSense: CGM Preprocessing and Sequence Generation Pipeline
Implements rigorous temporal cleaning, outlier filtering, gap detection,
feature extraction, and strictly leak-free patient-level splitting.
"""

import os
import sqlite3
import json
import numpy as np
import pandas as pd
from typing import Tuple, Dict, List, Optional
from sklearn.model_selection import StratifiedGroupKFold, train_test_split

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_DATA_DIR = os.path.join(PROJECT_ROOT, "data", "raw")
PROCESSED_DATA_DIR = os.path.join(PROJECT_ROOT, "data", "processed")

# Class mapping corresponding directly to GlucoSense classes
CLASS_MAP = {
    "non-diabetic": 0,    # Normal
    "pre-diabetic": 1,    # Prediabetes
    "diabetic": 2         # Type 2 Diabetes
}
INV_CLASS_MAP = {v: k for k, v in CLASS_MAP.items()}
DISPLAY_CLASS_MAP = {
    0: "Normal",
    1: "Prediabetes",
    2: "Type 2 Diabetes"
}

# Sensor limits and parameters
DEXCOM_LOW_LIMIT = 40.0   # mg/dL
DEXCOM_HIGH_LIMIT = 400.0 # mg/dL
SAMPLING_INTERVAL_MIN = 5 # minutes
MAX_GAP_INTERPOLATE_MIN = 30 # interpolate gaps up to 30 mins (6 missed readings)
MAX_GAP_SPLIT_MIN = 60 # split into new continuous episode if gap > 60 mins


def load_raw_data() -> Tuple[pd.DataFrame, pd.DataFrame]:
    """Load raw CGM readings and clinical metadata."""
    cgm_file = os.path.join(RAW_DATA_DIR, "cgm_readings_raw.tsv")
    db_file = os.path.join(RAW_DATA_DIR, "clinical_metadata.db")

    if not os.path.exists(cgm_file) or not os.path.exists(db_file):
        raise FileNotFoundError(f"Missing raw files. Please run ml/download_dataset.py first.")

    # 1. Load CGM readings
    cgm_df = pd.read_csv(cgm_file, sep="\t")

    # 2. Load Clinical participant table
    conn = sqlite3.connect(db_file)
    clinical_df = pd.read_sql("SELECT * FROM clinical", conn)
    conn.close()

    return cgm_df, clinical_df


def clean_cgm_readings(cgm_df: pd.DataFrame) -> pd.DataFrame:
    """
    Clean sensor readings:
    - Handle 'Low' and 'High' sensor boundaries
    - Cast to numeric
    - Parse timestamps and sort chronologically
    - Remove invalid physiological values (< 30 or > 500)
    - Deduplicate timestamps
    """
    df = cgm_df.copy()

    # Clean glucose value column
    val_str = df["GlucoseValue"].astype(str).str.strip().str.lower()
    val_str = val_str.replace({"low": str(DEXCOM_LOW_LIMIT), "high": str(DEXCOM_HIGH_LIMIT)})
    df["glucose"] = pd.to_numeric(val_str, errors="coerce")

    # Drop missing glucose
    df = df.dropna(subset=["glucose"])

    # Physiological filter
    df = df[(df["glucose"] >= 30.0) & (df["glucose"] <= 500.0)]

    # Parse timestamps
    df["timestamp"] = pd.to_datetime(df["DisplayTime"], errors="coerce")
    df = df.dropna(subset=["timestamp"])

    # Rename subject column
    df["subject_id"] = df["subjectId"].astype(str).str.strip()

    # Keep necessary columns and sort
    df = df[["subject_id", "timestamp", "glucose"]].sort_values(by=["subject_id", "timestamp"])

    # Deduplicate timestamps per subject (average if duplicates exist)
    df = df.groupby(["subject_id", "timestamp"]).agg({"glucose": "mean"}).reset_index()

    return df


def extract_episodes_and_windows(
    cgm_df: pd.DataFrame,
    clinical_df: pd.DataFrame,
    window_size: int = 24, # 24 * 5 min = 2 hours
    stride: int = 6        # 6 * 5 min = 30 minutes shift between windows
) -> Tuple[np.ndarray, np.ndarray, np.ndarray, pd.DataFrame]:
    """
    Segment CGM readings into continuous episodes and generate sliding temporal windows.
    Returns:
      X: (N, window_size, n_features)
      y: (N,) class label (0, 1, 2)
      subjects: (N,) subject ID string for patient-level grouping
      window_metadata: DataFrame with window stats
    """
    # Create participant diagnosis dict
    diag_dict = dict(zip(clinical_df["userID"].astype(str).str.strip(), clinical_df["diagnosis"].str.strip().str.lower()))

    X_list = []
    y_list = []
    subject_list = []
    meta_list = []

    for subject_id, group in cgm_df.groupby("subject_id"):
        if subject_id not in diag_dict:
            continue
        diag_label = diag_dict[subject_id]
        if diag_label not in CLASS_MAP:
            continue
        class_idx = CLASS_MAP[diag_label]

        group = group.sort_values(by="timestamp").reset_index(drop=True)
        time_diffs = group["timestamp"].diff().dt.total_seconds() / 60.0

        # Segment into continuous episodes when gap > MAX_GAP_SPLIT_MIN
        split_indices = [0] + list(np.where(time_diffs > MAX_GAP_SPLIT_MIN)[0]) + [len(group)]
        episodes = [group.iloc[split_indices[i]:split_indices[i+1]] for i in range(len(split_indices)-1)]

        for ep in episodes:
            if len(ep) < window_size:
                continue

            # Regularize episode by 5-min resampling with interpolation for small gaps
            ep = ep.set_index("timestamp")
            # Resample to exactly 5-minute intervals
            ep_resampled = ep[["glucose"]].resample("5min").mean()
            # Linear interpolate small gaps up to 6 missing readings (30 mins)
            ep_resampled["glucose"] = ep_resampled["glucose"].interpolate(method="linear", limit=6)
            ep_resampled = ep_resampled.dropna().reset_index()

            if len(ep_resampled) < window_size:
                continue

            glucose_vals = ep_resampled["glucose"].values
            timestamps = ep_resampled["timestamp"].values

            # Sliding window extraction
            for start_idx in range(0, len(glucose_vals) - window_size + 1, stride):
                end_idx = start_idx + window_size
                w_glucose = glucose_vals[start_idx:end_idx]

                # Feature 1: Glucose level (mg/dL)
                # Feature 2: First derivative (rate of change in mg/dL per 5 min)
                diff = np.diff(w_glucose, prepend=w_glucose[0])

                # Feature 3: Standardized delta from 100 mg/dL normal euglycemic setpoint
                delta_norm = (w_glucose - 100.0) / 50.0

                # Window array: shape (window_size, 3)
                window_features = np.column_stack([w_glucose, diff, delta_norm])

                X_list.append(window_features)
                y_list.append(class_idx)
                subject_list.append(subject_id)

                meta_list.append({
                    "subject_id": subject_id,
                    "class_idx": class_idx,
                    "class_name": DISPLAY_CLASS_MAP[class_idx],
                    "mean_glucose": float(np.mean(w_glucose)),
                    "std_glucose": float(np.std(w_glucose)),
                    "min_glucose": float(np.min(w_glucose)),
                    "max_glucose": float(np.max(w_glucose)),
                    "tir_70_180": float(np.mean((w_glucose >= 70) & (w_glucose <= 180)) * 100.0),
                    "start_time": str(timestamps[start_idx]),
                    "end_time": str(timestamps[end_idx - 1])
                })

    X = np.array(X_list, dtype=np.float32)
    y = np.array(y_list, dtype=np.int64)
    subjects = np.array(subject_list)
    window_metadata = pd.DataFrame(meta_list)

    return X, y, subjects, window_metadata


def split_data_by_patient(
    X: np.ndarray,
    y: np.ndarray,
    subjects: np.ndarray,
    clinical_df: pd.DataFrame,
    seed: int = 42
) -> Dict[str, Tuple[np.ndarray, np.ndarray, np.ndarray]]:
    """
    CRITICAL: Patient-level splitting ensuring 100% ZERO DATA LEAKAGE.
    Windows from the same patient are guaranteed to stay strictly within
    Train, Validation, or Test set.
    Stratified by diagnosis class.
    """
    # Build unique subjects dataframe with class labels
    diag_dict = dict(zip(clinical_df["userID"].astype(str).str.strip(), clinical_df["diagnosis"].str.strip().str.lower()))
    unique_subjects = np.unique(subjects)
    subj_labels = [CLASS_MAP[diag_dict[s]] for s in unique_subjects]

    subj_df = pd.DataFrame({
        "subject_id": unique_subjects,
        "class_idx": subj_labels
    })

    # First split: Train (70%) vs Temp (30%)
    train_subj, temp_subj = train_test_split(
        subj_df,
        test_size=0.30,
        random_state=seed,
        stratify=subj_df["class_idx"]
    )

    # Second split: Val (15%) vs Test (15%)
    val_subj, test_subj = train_test_split(
        temp_subj,
        test_size=0.50,
        random_state=seed,
        stratify=temp_subj["class_idx"]
    )

    train_set = set(train_subj["subject_id"])
    val_set = set(val_subj["subject_id"])
    test_set = set(test_subj["subject_id"])

    # Verify sets are disjoint
    assert len(train_set.intersection(val_set)) == 0
    assert len(train_set.intersection(test_set)) == 0
    assert len(val_set.intersection(test_set)) == 0

    train_mask = np.isin(subjects, list(train_set))
    val_mask = np.isin(subjects, list(val_set))
    test_mask = np.isin(subjects, list(test_set))

    splits = {
        "train": (X[train_mask], y[train_mask], subjects[train_mask]),
        "val": (X[val_mask], y[val_mask], subjects[val_mask]),
        "test": (X[test_mask], y[test_mask], subjects[test_mask])
    }

    print("\n========== PATIENT-LEVEL SPLIT SUMMARY (ZERO LEAKAGE) ==========")
    print(f"Train Patients: {len(train_set)} -> Windows: {len(splits['train'][0])} | Classes: {np.bincount(splits['train'][1])}")
    print(f"Val Patients:   {len(val_set)} -> Windows: {len(splits['val'][0])} | Classes: {np.bincount(splits['val'][1])}")
    print(f"Test Patients:  {len(test_set)} -> Windows: {len(splits['test'][0])} | Classes: {np.bincount(splits['test'][1])}")
    print("=================================================================\n")

    return splits


def fit_and_apply_scaler(
    splits: Dict[str, Tuple[np.ndarray, np.ndarray, np.ndarray]]
) -> Tuple[Dict[str, Tuple[np.ndarray, np.ndarray, np.ndarray]], Dict]:
    """
    Standardize features strictly using statistics computed on the TRAINING split.
    Saves mean and std for reproducible inference.
    """
    X_train = splits["train"][0]

    # Compute mean and std across train batch and time steps per feature
    # X shape: (N, window_size, n_features)
    n_features = X_train.shape[-1]
    feature_means = []
    feature_stds = []

    for f in range(n_features):
        mean_val = float(np.mean(X_train[:, :, f]))
        std_val = float(np.std(X_train[:, :, f]))
        if std_val == 0 or np.isnan(std_val):
            std_val = 1.0
        feature_means.append(mean_val)
        feature_stds.append(std_val)

    scaler_config = {
        "feature_names": ["glucose", "rate_of_change", "delta_norm"],
        "means": feature_means,
        "stds": feature_stds,
        "window_size": int(X_train.shape[1]),
        "class_mapping": CLASS_MAP,
        "display_class_mapping": DISPLAY_CLASS_MAP
    }

    # Transform all splits
    scaled_splits = {}
    for split_name, (X, y, subjs) in splits.items():
        X_scaled = X.copy()
        for f in range(n_features):
            X_scaled[:, :, f] = (X_scaled[:, :, f] - feature_means[f]) / feature_stds[f]
        scaled_splits[split_name] = (X_scaled, y, subjs)

    return scaled_splits, scaler_config


def run_pipeline(window_size: int = 24, stride: int = 6) -> Tuple[Dict, Dict]:
    """Run full preprocessing pipeline and persist processed datasets."""
    os.makedirs(PROCESSED_DATA_DIR, exist_ok=True)

    print("[1/5] Loading raw datasets...")
    cgm_df, clinical_df = load_raw_data()

    print("[2/5] Cleaning glucose readings and timestamps...")
    cleaned_cgm = clean_cgm_readings(cgm_df)
    print(f"Cleaned CGM readings: {len(cleaned_cgm):,} rows across {cleaned_cgm['subject_id'].nunique()} subjects")

    print(f"[3/5] Segmenting episodes and extracting sliding windows (size={window_size}, stride={stride})...")
    X, y, subjects, window_metadata = extract_episodes_and_windows(
        cleaned_cgm, clinical_df, window_size=window_size, stride=stride
    )
    print(f"Total extracted windows: {len(X):,} with shape {X.shape}")

    print("[4/5] Performing leak-free patient-level split...")
    splits = split_data_by_patient(X, y, subjects, clinical_df)

    print("[5/5] Fitting scaler strictly on training split...")
    scaled_splits, scaler_config = fit_and_apply_scaler(splits)

    # Save processed arrays
    for split_name, (X_s, y_s, subjs_s) in scaled_splits.items():
        np.save(os.path.join(PROCESSED_DATA_DIR, f"X_{split_name}.npy"), X_s)
        np.save(os.path.join(PROCESSED_DATA_DIR, f"y_{split_name}.npy"), y_s)
        np.save(os.path.join(PROCESSED_DATA_DIR, f"subjects_{split_name}.npy"), subjs_s)

    # Save scaler config
    scaler_path = os.path.join(PROJECT_ROOT, "models", "scaler_config.json")
    os.makedirs(os.path.dirname(scaler_path), exist_ok=True)
    with open(scaler_path, "w") as f:
        json.dump(scaler_config, f, indent=2)

    # Save window metadata
    window_metadata.to_csv(os.path.join(PROCESSED_DATA_DIR, "window_metadata.csv"), index=False)

    print(f"\n[DONE] Preprocessed datasets saved to {PROCESSED_DATA_DIR}")
    print(f"[DONE] Scaler config saved to {scaler_path}")

    return scaled_splits, scaler_config


if __name__ == "__main__":
    run_pipeline()
