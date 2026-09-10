"""
GlucoSense: Comprehensive Integration Tests for Frozen Model & Scaler
Validates the 14 integration requirements from the specification:
1. Model loads successfully
2. Scaler loads successfully
3. Correct input tensor shape (batch, 288, 2)
4. 288-sample sequence requirement
5. Glucose + ROC feature construction
6. Valid inference returns 3 probabilities
7. Probabilities sum approximately to 1.0 (simplex)
8. Argmax prediction matches highest probability
9. Insufficient data is rejected safely
10. Long gaps are not silently fabricated
11. Multiple windows use soft probability aggregation
12. Malformed readings return useful errors
13. Existing API endpoints still work
14. Model checkpoint & scaler integrity hashes remain untouched
"""

import os
import sys
import json
import hashlib
import unittest
import numpy as np
import pandas as pd
import torch
from fastapi.testclient import TestClient

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from ml.inference import GlucoSenseInferenceEngine
from ml.inference_server import app

EXPECTED_MODEL_SHA256 = "b9747f21e503f62b7134fbe3789c76c5eb8158aee620816a02a336ca1bf29440"
EXPECTED_SCALER_SHA256 = "d91d6355a4cd60de549591dc4c05639d6419dc889adec04cc5d3e4a93862c65a"


def compute_file_sha256(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(8192):
            h.update(chunk)
    return h.hexdigest().lower()


class TestModelIntegration(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        cls.engine = GlucoSenseInferenceEngine.get_instance()
        cls.client = TestClient(app)

    def test_01_model_loads_successfully(self):
        """1. Model checkpoint loads without modification, enters eval mode."""
        self.assertIsNotNone(self.engine.model)
        self.assertFalse(self.engine.model.training)
        # Check parameter count matches locked architecture (88,067 trainable parameters)
        total_params = sum(p.numel() for p in self.engine.model.parameters())
        self.assertIn(total_params, [88067, 88325])

    def test_02_scaler_loads_successfully(self):
        """2. Scaler loads frozen parameters without refitting."""
        self.assertIsNotNone(self.engine.scaler)
        self.assertEqual(self.engine.scaler.get("window_size"), 288)
        self.assertEqual(len(self.engine.means), 2)
        self.assertEqual(len(self.engine.stds), 2)
        # Verify frozen values
        self.assertAlmostEqual(self.engine.means[0], 125.293, places=2)
        self.assertAlmostEqual(self.engine.stds[0], 39.791, places=2)

    def test_03_correct_input_shape(self):
        """3. Input tensor strictly matches shape (batch, 288, 2)."""
        x_dummy = torch.randn(2, 288, 2)
        with torch.no_grad():
            out = self.engine.model(x_dummy)
        self.assertEqual(out.shape, (2, 3))

    def test_04_288_sample_sequence_requirement(self):
        """4. Window extraction enforces exactly 288 samples for 24-hour sequence."""
        trace = [100.0] * 288
        batch, num_w, cov = self.engine.extract_and_scale_windows([np.array(trace, dtype=np.float32)])
        self.assertEqual(num_w, 1)
        self.assertEqual(batch.shape, (1, 288, 2))

    def test_05_glucose_plus_roc_feature_construction(self):
        """5. Channel 0 is glucose, Channel 1 is rate of change (first difference)."""
        trace = np.array([100.0 + 2.0 * i for i in range(288)], dtype=np.float32)
        # Raw rate of change is 2.0 for all steps after 0
        batch, num_w, _ = self.engine.extract_and_scale_windows([trace])
        self.assertIsNotNone(batch)
        self.assertEqual(batch.shape[-1], 2)
        # Reverse standardization to verify feature arithmetic
        unscaled_c0 = batch[0, :, 0] * self.engine.stds[0] + self.engine.means[0]
        unscaled_c1 = batch[0, :, 1] * self.engine.stds[1] + self.engine.means[1]
        np.testing.assert_allclose(unscaled_c0, trace, atol=1e-3)
        self.assertAlmostEqual(float(unscaled_c1[1]), 2.0, places=2)

    def test_06_valid_inference_returns_three_probabilities(self):
        """6. Inference returns probabilities for Normal, Prediabetes, and Type 2."""
        trace = [110.0 + 10.0 * np.sin(i / 10.0) for i in range(288)]
        res = self.engine.predict(readings=trace, require_24h=True)
        self.assertEqual(res["status"], "success")
        probs = res["probabilities"]
        self.assertIn("normal", probs)
        self.assertIn("prediabetes", probs)
        self.assertIn("type2_diabetes", probs)

    def test_07_probabilities_sum_to_one(self):
        """7. Output class probabilities sum approximately to 1.0 (valid simplex)."""
        trace = [140.0 + 20.0 * np.sin(i / 8.0) for i in range(288)]
        res = self.engine.predict(readings=trace, require_24h=True)
        probs = res["probabilities"]
        total_p = probs["normal"] + probs["prediabetes"] + probs["type2_diabetes"]
        self.assertAlmostEqual(total_p, 1.0, places=3)

    def test_08_argmax_prediction_matches_highest_probability(self):
        """8. Predicted class strictly follows argmax decision rule."""
        trace = [95.0 + 5.0 * np.sin(i / 12.0) for i in range(288)]
        res = self.engine.predict(readings=trace, require_24h=True)
        probs = res["probabilities"]
        prob_vec = [probs["normal"], probs["prediabetes"], probs["type2_diabetes"]]
        expected_argmax = int(np.argmax(prob_vec))
        self.assertEqual(res["predicted_class_id"], expected_argmax)
        self.assertEqual(res["prediction"], self.engine.classes[expected_argmax])
        self.assertAlmostEqual(res["confidence"], prob_vec[expected_argmax], places=4)

    def test_09_insufficient_data_rejected_safely(self):
        """9. Sequences with < 288 samples are rejected safely without fabrication."""
        short_trace = [100.0] * 144 # Only 12 hours
        res = self.engine.predict(readings=short_trace, require_24h=True)
        self.assertEqual(res["status"], "insufficient_data")
        self.assertIn("24 hours", res["message"])
        self.assertEqual(res["valid_windows"], 0)

    def test_10_long_gaps_not_silently_fabricated(self):
        """10. Gaps exceeding 30/60 mins break episodes and are not silently filled."""
        # Create 200 readings, a 4-hour gap, then 100 readings
        t0 = pd.Timestamp("2024-01-01 00:00:00")
        part1 = [{"timestamp": (t0 + pd.Timedelta(minutes=5 * i)).isoformat(), "glucose": 110.0} for i in range(200)]
        t1 = t0 + pd.Timedelta(minutes=5 * 200) + pd.Timedelta(hours=4) # 4-hour missing gap
        part2 = [{"timestamp": (t1 + pd.Timedelta(minutes=5 * i)).isoformat(), "glucose": 115.0} for i in range(100)]
        gapped_data = part1 + part2

        # Neither segment alone reaches 288 samples
        res = self.engine.predict(readings=gapped_data, require_24h=True)
        self.assertEqual(res["status"], "insufficient_data")
        self.assertIn("24 hours", res["message"])

    def test_11_multiple_windows_use_probability_aggregation(self):
        """11. When >1 valid 24h window exists, soft voting averages probabilities before argmax."""
        # Two 24h days = 576 readings
        multi_day_trace = [100.0] * 576
        res = self.engine.predict(readings=multi_day_trace, require_24h=True)
        self.assertEqual(res["status"], "success")
        self.assertEqual(res["valid_windows"], 2)
        probs = res["probabilities"]
        self.assertAlmostEqual(probs["normal"] + probs["prediabetes"] + probs["type2_diabetes"], 1.0, places=3)

    def test_12_malformed_readings_return_useful_errors(self):
        """12. Malformed or unparseable payloads are handled gracefully."""
        res_empty = self.engine.predict(readings=[], require_24h=True)
        self.assertEqual(res_empty["status"], "insufficient_data")

        # FastAPI endpoint rejection
        resp = self.client.post("/api/ml/predict", json={"readings": []})
        self.assertEqual(resp.status_code, 400)

    def test_13_existing_api_endpoints_still_work(self):
        """13. Existing endpoints (/health, /model-info, /predict, /analyze-cgm) remain operational."""
        h_resp = self.client.get("/health")
        self.assertEqual(h_resp.status_code, 200)
        self.assertEqual(h_resp.json()["status"], "online")

        m_resp = self.client.get("/api/ml/model-info")
        self.assertEqual(m_resp.status_code, 200)
        self.assertIn("evaluation", m_resp.json())
        self.assertEqual(m_resp.json()["evaluation"]["held_out_participants"], 16)
        self.assertEqual(m_resp.json()["evaluation"]["patient_accuracy"], 0.6875)

        # /api/ml/predict endpoint
        trace_288 = [100.0 + 5.0 * np.sin(i / 10.0) for i in range(288)]
        p_resp = self.client.post("/api/ml/predict", json={"readings": trace_288})
        self.assertEqual(p_resp.status_code, 200)
        p_data = p_resp.json()
        self.assertEqual(p_data["status"], "success")
        self.assertIn("prediction", p_data)
        self.assertIn("disclaimer", p_data)

    def test_14_model_and_scaler_checksum_integrity(self):
        """14. Cryptographically asserts that model and scaler weights were NOT modified."""
        model_path = os.path.join(PROJECT_ROOT, "models", "combined_cnn_lstm.pt")
        scaler_path = os.path.join(PROJECT_ROOT, "models", "combined_scaler.json")

        actual_model_hash = compute_file_sha256(model_path)
        actual_scaler_hash = compute_file_sha256(scaler_path)

        self.assertEqual(actual_model_hash, EXPECTED_MODEL_SHA256,
                         "Model weights were modified! Expected frozen checkpoint.")
        self.assertEqual(actual_scaler_hash, EXPECTED_SCALER_SHA256,
                         "Scaler configuration was modified! Expected frozen scaler.")


if __name__ == "__main__":
    unittest.main()
