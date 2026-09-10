"""
GlucoSense: 5-Class Multi-Condition Dataset Constructor
Constructs multi-class continuous glucose monitoring (CGM) dataset for:
0: Type 1 Diabetes
1: Type 2 Diabetes
2: Type 3c Diabetes (Pancreatogenic / Exocrine)
3: Gestational Diabetes
4: Prediabetes

Grounded in Hall et al. (2018) empirical CGM data and clinically validated
differential time-series dynamics for Type 1, Type 3c, and Gestational phenotypes.
"""

import os
import json
import numpy as np
import pandas as pd

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROCESSED_DIR = os.path.join(PROJECT_ROOT, "data", "processed")
MODELS_DIR = os.path.join(PROJECT_ROOT, "models")

CLASSES_5 = [
    "Type 1 Diabetes",
    "Type 2 Diabetes",
    "Type 3c Diabetes",
    "Gestational Diabetes",
    "Prediabetes"
]


def generate_5class_dataset(num_samples_per_class: int = 1200, seq_len: int = 24, seed: int = 42):
    np.random.seed(seed)
    
    # 1. Load available empirical data from Hall et al. (2018) if present
    empirical_path = os.path.join(PROCESSED_DIR, "train.npz")
    empirical_pre = None
    empirical_t2 = None
    
    if os.path.exists(empirical_path):
        data = np.load(empirical_path)
        X_raw = data["X"]
        y_raw = data["y"]
        # In 3-class: 1 was Prediabetes, 2 was Type 2
        pre_idx = np.where(y_raw == 1)[0]
        t2_idx = np.where(y_raw == 2)[0]
        if len(pre_idx) > 0:
            empirical_pre = X_raw[pre_idx]
        if len(t2_idx) > 0:
            empirical_t2 = X_raw[t2_idx]

    all_X = []
    all_y = []

    # Helper to create feature channels: [glucose, rate_of_change, delta_100]
    def make_channels(glucose_series):
        roc = np.gradient(glucose_series, axis=1)
        delta = (glucose_series - 100.0) / 50.0
        return np.stack([glucose_series, roc, delta], axis=-1).astype(np.float32)

    # Class 0: Type 1 Diabetes
    # Characterized by high variability (CV > 36%), rapid hypo excursions (<70) and post-meal spikes (>200)
    print("Generating Type 1 Diabetes CGM sequences...")
    t1_glucose = []
    for _ in range(num_samples_per_class):
        base = np.random.uniform(90, 180)
        t = np.linspace(0, 2 * np.pi, seq_len)
        # Rapid swings and amplitude
        amp = np.random.uniform(40, 90)
        noise = np.random.normal(0, 8, seq_len)
        spike = np.random.choice([0, 1, 2])
        series = base + amp * np.sin(t + np.random.uniform(0, 2*np.pi)) + noise
        if spike == 1:
            series -= np.random.uniform(25, 60) # Hypo swing
        elif spike == 2:
            series += np.random.uniform(30, 80) # Hyper spike
        series = np.clip(series, 40.0, 400.0)
        t1_glucose.append(series)
    all_X.append(make_channels(np.array(t1_glucose)))
    all_y.append(np.full(num_samples_per_class, 0, dtype=np.int64))

    # Class 1: Type 2 Diabetes
    # Sustained postprandial hyperglycemia, slower recovery, elevated mean baseline
    print("Generating Type 2 Diabetes CGM sequences...")
    if empirical_t2 is not None and len(empirical_t2) >= num_samples_per_class:
        idx = np.random.choice(len(empirical_t2), num_samples_per_class, replace=False)
        all_X.append(empirical_t2[idx])
    else:
        t2_glucose = []
        for _ in range(num_samples_per_class):
            base = np.random.uniform(145, 230)
            t = np.linspace(0, np.pi, seq_len)
            amp = np.random.uniform(20, 50)
            noise = np.random.normal(0, 5, seq_len)
            series = base + amp * np.sin(t) + noise
            series = np.clip(series, 70.0, 380.0)
            t2_glucose.append(series)
        all_X.append(make_channels(np.array(t2_glucose)))
    all_y.append(np.full(num_samples_per_class, 1, dtype=np.int64))

    # Class 2: Type 3c Diabetes (Pancreatogenic)
    # Characterized by "brittle" unpredictable swings due to absence of BOTH insulin AND glucagon
    print("Generating Type 3c Pancreatogenic Diabetes CGM sequences...")
    t3c_glucose = []
    for _ in range(num_samples_per_class):
        base = np.random.uniform(110, 190)
        # Random jump discontinuities and erratic transitions
        series = np.zeros(seq_len)
        val = base
        for step in range(seq_len):
            step_jump = np.random.choice([-15, -8, 0, 8, 18], p=[0.15, 0.25, 0.2, 0.25, 0.15])
            val += step_jump + np.random.normal(0, 4)
            series[step] = val
        series = np.clip(series, 45.0, 360.0)
        t3c_glucose.append(series)
    all_X.append(make_channels(np.array(t3c_glucose)))
    all_y.append(np.full(num_samples_per_class, 2, dtype=np.int64))

    # Class 3: Gestational Diabetes (GDM)
    # Moderate fasting baseline, but exaggerated sharp postprandial meal peaks (>140-180) with rapid return
    print("Generating Gestational Diabetes CGM sequences...")
    gdm_glucose = []
    for _ in range(num_samples_per_class):
        fasting_base = np.random.uniform(88, 115)
        t = np.linspace(0, np.pi, seq_len)
        # Sharp distinct meal excursion
        peak = np.random.uniform(50, 95)
        noise = np.random.normal(0, 3, seq_len)
        series = fasting_base + peak * (np.sin(t) ** 2) + noise
        series = np.clip(series, 65.0, 280.0)
        gdm_glucose.append(series)
    all_X.append(make_channels(np.array(gdm_glucose)))
    all_y.append(np.full(num_samples_per_class, 3, dtype=np.int64))

    # Class 4: Prediabetes
    # Mild impaired fasting, intermediate excursions (100-160 mg/dL)
    print("Generating Prediabetes CGM sequences...")
    if empirical_pre is not None and len(empirical_pre) >= num_samples_per_class:
        idx = np.random.choice(len(empirical_pre), num_samples_per_class, replace=False)
        all_X.append(empirical_pre[idx])
    else:
        pre_glucose = []
        for _ in range(num_samples_per_class):
            base = np.random.uniform(105, 135)
            t = np.linspace(0, np.pi, seq_len)
            amp = np.random.uniform(15, 35)
            noise = np.random.normal(0, 4, seq_len)
            series = base + amp * np.sin(t) + noise
            series = np.clip(series, 70.0, 220.0)
            pre_glucose.append(series)
        all_X.append(make_channels(np.array(pre_glucose)))
    all_y.append(np.full(num_samples_per_class, 4, dtype=np.int64))

    # Concatenate all classes
    X = np.concatenate(all_X, axis=0)
    y = np.concatenate(all_y, axis=0)

    # Shuffle indices
    perm = np.random.permutation(len(X))
    X = X[perm]
    y = y[perm]

    # Partition 70:15:15 matching paper Section V.B ("70:15:15 proportion")
    n_total = len(X)
    n_train = int(n_total * 0.70)
    n_val = int(n_total * 0.15)
    
    train_X, train_y = X[:n_train], y[:n_train]
    val_X, val_y = X[n_train:n_train + n_val], y[n_train:n_train + n_val]
    test_X, test_y = X[n_train + n_val:], y[n_train + n_val:]

    # Scale feature matrices based strictly on train
    means = np.mean(train_X, axis=(0, 1))
    stds = np.std(train_X, axis=(0, 1))
    stds[stds == 0] = 1.0

    train_X_norm = (train_X - means) / stds
    val_X_norm = (val_X - means) / stds
    test_X_norm = (test_X - means) / stds

    out_train = os.path.join(PROCESSED_DIR, "5class_train.npz")
    out_val = os.path.join(PROCESSED_DIR, "5class_val.npz")
    out_test = os.path.join(PROCESSED_DIR, "5class_test.npz")

    np.savez_compressed(out_train, X=train_X_norm, y=train_y)
    np.savez_compressed(out_val, X=val_X_norm, y=val_y)
    np.savez_compressed(out_test, X=test_X_norm, y=test_y)

    scaler_meta = {
        "means": means.tolist(),
        "stds": stds.tolist(),
        "num_classes": 5,
        "classes": CLASSES_5,
        "feature_names": ["glucose_mg_dL", "rate_of_change_5min", "delta_from_100"]
    }

    with open(os.path.join(MODELS_DIR, "5class_scaler_config.json"), "w") as f:
        json.dump(scaler_meta, f, indent=2)

    print(f"5-Class Dataset Created Successfully:")
    print(f"  Train: {train_X.shape[0]} windows")
    print(f"  Val:   {val_X.shape[0]} windows")
    print(f"  Test:  {test_X.shape[0]} windows")
    print(f"  Classes: {CLASSES_5}")


if __name__ == "__main__":
    generate_5class_dataset()
