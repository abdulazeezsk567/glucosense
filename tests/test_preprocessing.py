"""
Unit tests for GlucoSense Preprocessing Pipeline
Verifies data cleaning, boundary conditions, feature generation,
and patient-level zero-leakage splitting.
"""

import unittest
import numpy as np
import pandas as pd
from ml.preprocess import (
    clean_cgm_readings,
    extract_episodes_and_windows,
    split_data_by_patient,
    fit_and_apply_scaler,
    DEXCOM_LOW_LIMIT,
    DEXCOM_HIGH_LIMIT,
    CLASS_MAP
)


class TestPreprocessingPipeline(unittest.TestCase):

    def setUp(self):
        # Create synthetic raw CGM table with boundary strings and edge cases
        self.raw_cgm = pd.DataFrame({
            "subjectId": ["SUBJ-01"] * 30 + ["SUBJ-02"] * 30 + ["SUBJ-03"] * 30,
            "DisplayTime": [
                pd.Timestamp("2024-01-01 08:00:00") + pd.Timedelta(minutes=5 * i)
                for _ in range(3) for i in range(30)
            ],
            "GlucoseValue": (
                ["Low"] + [100 + i * 2 for i in range(28)] + ["High"] +
                [140 + i for i in range(30)] +
                [200 + i * 3 for i in range(30)]
            )
        })

        self.clinical_df = pd.DataFrame({
            "userID": ["SUBJ-01", "SUBJ-02", "SUBJ-03"],
            "diagnosis": ["non-diabetic", "pre-diabetic", "diabetic"]
        })

    def test_clean_cgm_readings_boundaries(self):
        cleaned = clean_cgm_readings(self.raw_cgm)
        # Verify 'Low' is replaced by 40.0
        self.assertIn(DEXCOM_LOW_LIMIT, cleaned["glucose"].values)
        # Verify 'High' is replaced by 400.0
        self.assertIn(DEXCOM_HIGH_LIMIT, cleaned["glucose"].values)
        # Verify all values are valid floats
        self.assertTrue(np.all(np.isfinite(cleaned["glucose"].values)))
        # Verify chronological ordering
        for _, grp in cleaned.groupby("subject_id"):
            self.assertTrue(grp["timestamp"].is_monotonic_increasing)

    def test_window_extraction_shape_and_features(self):
        cleaned = clean_cgm_readings(self.raw_cgm)
        X, y, subjects, meta = extract_episodes_and_windows(
            cleaned, self.clinical_df, window_size=24, stride=6
        )
        self.assertGreater(len(X), 0)
        self.assertEqual(X.shape[1], 24) # window_size
        self.assertEqual(X.shape[2], 3)  # [glucose, rate_of_change, delta_norm]
        self.assertEqual(len(X), len(y))
        self.assertEqual(len(X), len(subjects))
        # Check label mapping validity
        for label in y:
            self.assertIn(label, [0, 1, 2])

    def test_patient_level_zero_leakage(self):
        cleaned = clean_cgm_readings(self.raw_cgm)
        X, y, subjects, _ = extract_episodes_and_windows(
            cleaned, self.clinical_df, window_size=24, stride=6
        )
        # Build 24 synthetic subjects (8 per class) to test splitting
        synth_subjects = np.array([f"SUBJ-{i:02d}" for i in range(24) for _ in range(5)])
        synth_y = np.array([i % 3 for i in range(24) for _ in range(5)])
        synth_X = np.zeros((len(synth_y), 24, 3), dtype=np.float32)
        synth_clinical = pd.DataFrame({
            "userID": [f"SUBJ-{i:02d}" for i in range(24)],
            "diagnosis": ["non-diabetic" if i % 3 == 0 else "pre-diabetic" if i % 3 == 1 else "diabetic" for i in range(24)]
        })

        splits = split_data_by_patient(synth_X, synth_y, synth_subjects, synth_clinical, seed=42)

        train_subjs = set(splits["train"][2])
        val_subjs = set(splits["val"][2])
        test_subjs = set(splits["test"][2])

        # CRITICAL ASSERTION: No subject overlap across any split
        self.assertEqual(len(train_subjs.intersection(val_subjs)), 0)
        self.assertEqual(len(train_subjs.intersection(test_subjs)), 0)
        self.assertEqual(len(val_subjs.intersection(test_subjs)), 0)

    def test_scaler_fitted_on_train_only(self):
        # Create distinct train and test data
        train_X = np.ones((10, 24, 3), dtype=np.float32) * 100.0
        test_X = np.ones((5, 24, 3), dtype=np.float32) * 200.0

        splits = {
            "train": (train_X, np.zeros(10), np.array(["S1"] * 10)),
            "val": (train_X, np.zeros(10), np.array(["S2"] * 10)),
            "test": (test_X, np.zeros(5), np.array(["S3"] * 5))
        }

        scaled_splits, config = fit_and_apply_scaler(splits)
        # Means should be derived from train_X (100.0)
        self.assertAlmostEqual(config["means"][0], 100.0, places=2)


if __name__ == "__main__":
    unittest.main()
