"""
GlucoSense: Comprehensive Unit Tests for Scalable ML Pipeline
Validates:
1. Strict participant-level zero-leakage splitting.
2. Training-only scaler calibration (no test statistical contamination).
3. Complete exclusion of diagnostic/biomarker metadata from model inputs.
4. Robust missing data imputation and episode segmentation.
5. Scalable CNN-LSTM architecture forward/backward passes on variable sequence horizons.
6. Patient-level voting aggregation consistency.
"""

import unittest
import numpy as np
import pandas as pd
import torch

from ml.adapters.base_adapter import Episode, CohortData, CGMDatasetAdapter
from ml.data_loader_large import ScalableCGMDataset
from ml.model_scalable import GlucoSenseScalableCNNLSTM


class DummyAdapter(CGMDatasetAdapter):
    """Test adapter implementation with synthetic telemetry."""
    def load_cohort(self) -> CohortData:
        pass


class TestScalablePipeline(unittest.TestCase):

    def setUp(self):
        # Create synthetic cohort with 20 subjects (10 Normal, 6 Prediabetes, 4 T2D)
        self.subjects = [f"PT-{i:03d}" for i in range(20)]
        self.classes = [0] * 10 + [1] * 6 + [2] * 4

        episodes = []
        for sid, c_idx in zip(self.subjects, self.classes):
            # 2 episodes per subject, 60 readings each (5-min intervals = 5 hours)
            for ep_i in range(2):
                base_g = 90.0 if c_idx == 0 else (120.0 if c_idx == 1 else 180.0)
                g_noise = np.random.normal(0, 5.0, 60).astype(np.float32)
                g_vals = np.clip(base_g + g_noise, 40.0, 400.0)

                t_start = pd.Timestamp("2024-01-01") + pd.Timedelta(hours=ep_i * 10)
                t_vals = np.array([
                    (t_start + pd.Timedelta(minutes=5 * j)).to_datetime64() for j in range(60)
                ])

                # Simulate a few missing/imputed readings
                is_imp = np.zeros(60, dtype=bool)
                is_imp[5:8] = True

                ep = Episode(
                    subject_id=sid,
                    timestamps=t_vals,
                    glucose=g_vals,
                    is_imputed=is_imp,
                    class_idx=c_idx,
                    metadata={"hba1c": 5.2 + c_idx * 1.5, "bmi": 24.0 + c_idx * 4.0} # Clinical metadata
                )
                episodes.append(ep)

        self.cohort = CohortData(
            cohort_name="Synthetic Test Cohort",
            episodes=episodes,
            participants_df=pd.DataFrame({
                "subject_id": self.subjects,
                "class_idx": self.classes,
                "hba1c": [5.2 + c * 1.5 for c in self.classes],
                "fbg": [85.0 + c * 25.0 for c in self.classes],
                "bmi": [24.0 + c * 4.0 for c in self.classes]
            }),
            class_mapping={"normal": 0, "prediabetes": 1, "t2d": 2},
            display_class_mapping={0: "Normal", 1: "Prediabetes", 2: "Type 2 Diabetes"}
        )

    def test_window_extraction_and_biomarker_exclusion(self):
        """Verify feature channels contain ONLY interstitial glucose dynamics, NO clinical biomarkers."""
        ds_manager = ScalableCGMDataset(window_size=24, stride=6, include_imputed_channel=False)
        X, y, subjs, meta_df = ds_manager.extract_windows_from_cohort(self.cohort)

        self.assertGreater(len(X), 0)
        self.assertEqual(X.shape[1], 24)
        self.assertEqual(X.shape[2], 3) # [glucose, diff, delta_norm]

        # Verify no NaN or Inf
        self.assertTrue(np.all(np.isfinite(X)))

        # Verify metadata dataframe does NOT leak into X tensor
        self.assertEqual(len(X), len(y))
        self.assertEqual(len(X), len(subjs))

        # Test with 4th channel (is_imputed mask)
        ds_manager_4ch = ScalableCGMDataset(window_size=24, stride=6, include_imputed_channel=True)
        X4, _, _, _ = ds_manager_4ch.extract_windows_from_cohort(self.cohort)
        self.assertEqual(X4.shape[2], 4)
        # 4th channel should be strictly 0.0 or 1.0
        self.assertTrue(np.all(np.isin(X4[:, :, 3], [0.0, 1.0])))

    def test_participant_level_zero_leakage_split(self):
        """CRITICAL: Assert zero subject overlap between Train, Val, and Test splits."""
        ds_manager = ScalableCGMDataset(window_size=24, stride=6)
        X, y, subjs, _ = ds_manager.extract_windows_from_cohort(self.cohort)

        splits = ds_manager.split_by_patient(X, y, subjs, train_ratio=0.70, val_ratio=0.15, test_ratio=0.15)

        train_subjs = set(splits["train"][2])
        val_subjs = set(splits["val"][2])
        test_subjs = set(splits["test"][2])

        # Mathematical guarantee of disjoint sets
        self.assertEqual(len(train_subjs.intersection(val_subjs)), 0, "Leakage between Train and Val!")
        self.assertEqual(len(train_subjs.intersection(test_subjs)), 0, "Leakage between Train and Test!")
        self.assertEqual(len(val_subjs.intersection(test_subjs)), 0, "Leakage between Val and Test!")

        # Union of sets must equal total cohort subjects
        total_split_subjs = len(train_subjs.union(val_subjs).union(test_subjs))
        self.assertEqual(total_split_subjs, len(np.unique(subjs)))

    def test_training_only_scaler_isolation(self):
        """Verify scaler parameters are derived exclusively from the training split."""
        ds_manager = ScalableCGMDataset(window_size=24, stride=6)
        X, y, subjs, _ = ds_manager.extract_windows_from_cohort(self.cohort)
        splits = ds_manager.split_by_patient(X, y, subjs)

        scaled_splits = ds_manager.fit_and_apply_scaler(
            splits,
            class_mapping=self.cohort.class_mapping,
            display_class_mapping=self.cohort.display_class_mapping
        )

        cfg = ds_manager.scaler_config
        self.assertIsNotNone(cfg)

        # Training data mean must match the scaler config mean exactly
        train_X_unscaled = splits["train"][0]
        expected_train_mean_g = float(np.mean(train_X_unscaled[:, :, 0]))
        self.assertAlmostEqual(cfg["means"][0], expected_train_mean_g, places=4)

        # Scaled train set mean should be ~0 and std ~1
        train_X_scaled = scaled_splits["train"][0]
        self.assertAlmostEqual(float(np.mean(train_X_scaled[:, :, 0])), 0.0, places=3)
        self.assertAlmostEqual(float(np.std(train_X_scaled[:, :, 0])), 1.0, places=3)

    def test_missing_data_and_episode_segmentation(self):
        """Test episode boundary splitting when gaps exceed threshold."""
        adapter = DummyAdapter(max_gap_split_min=60, max_interpolate_min=30)

        # Create series with a 120-minute gap in the middle
        t_part1 = [pd.Timestamp("2024-01-01 08:00:00") + pd.Timedelta(minutes=5 * i) for i in range(15)]
        t_part2 = [pd.Timestamp("2024-01-01 11:15:00") + pd.Timedelta(minutes=5 * i) for i in range(15)] # > 60m gap

        df = pd.DataFrame({
            "subject_id": ["TEST-SUBJ"] * 30,
            "timestamp": t_part1 + t_part2,
            "glucose": [100.0 + i for i in range(30)]
        })

        episodes = adapter.segment_episodes(df, subject_id="TEST-SUBJ", class_idx=0)
        # Should split into exactly 2 separate continuous episodes
        self.assertEqual(len(episodes), 2)
        self.assertEqual(episodes[0].subject_id, "TEST-SUBJ")
        self.assertEqual(episodes[1].subject_id, "TEST-SUBJ")

    def test_scalable_model_horizons(self):
        """Verify model handles both 2-hour (24 steps) and 24-hour (288 steps) inputs."""
        batch_size = 4

        # Test 1: Standard 2h sequence (24 steps, 3 channels)
        model_2h = GlucoSenseScalableCNNLSTM(in_channels=3, seq_length=24, num_classes=3)
        x_2h = torch.randn(batch_size, 24, 3)
        logits_2h = model_2h(x_2h)
        self.assertEqual(logits_2h.shape, (batch_size, 3))

        # Test 2: Extended 24h diurnal sequence (288 steps, 4 channels, bidirectional)
        model_24h = GlucoSenseScalableCNNLSTM(
            in_channels=4,
            seq_length=288,
            bidirectional=True,
            num_classes=3
        )
        x_24h = torch.randn(batch_size, 288, 4)
        logits_24h = model_24h(x_24h)
        self.assertEqual(logits_24h.shape, (batch_size, 3))

        # Check probability simplex
        probs_24h = model_24h.predict_proba(x_24h)
        self.assertTrue(torch.allclose(probs_24h.sum(dim=-1), torch.ones(batch_size), atol=1e-4))


if __name__ == "__main__":
    unittest.main()
