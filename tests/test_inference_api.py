"""
Unit tests for GlucoSense Inference Engine and FastAPI Service
"""

import unittest
from fastapi.testclient import TestClient
from ml.inference_server import app
from ml.inference import GlucoSenseInferenceEngine


class TestInferenceAPI(unittest.TestCase):

    def setUp(self):
        self.client = TestClient(app)
        self.engine = GlucoSenseInferenceEngine.get_instance()

    def test_health_endpoint(self):
        resp = self.client.get("/health")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["status"], "online")
        self.assertTrue(data["model_loaded"])

    def test_model_info_endpoint(self):
        resp = self.client.get("/model-info")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("model_metadata", data)
        self.assertIn("disclaimer", data)

    def test_predict_normal_profile(self):
        normal_readings = [95, 98, 102, 100, 97, 101, 103, 99, 100, 102, 98, 96] * 2
        resp = self.client.post("/predict", json={
            "glucose_readings": normal_readings,
            "fasting_insulin": 8.0,
            "hba1c": 5.2
        })
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn(data["classification"], [
            "Normal", "Prediabetes", "Type 1 Diabetes", "Type 2 Diabetes",
            "Type 3c Diabetes", "Gestational Diabetes"
        ])
        self.assertIn("probabilities", data)
        self.assertIn("risk_assessment", data)
        self.assertFalse(data["model_metadata"]["is_mock"])

    def test_analyze_cgm_endpoint(self):
        readings = [105, 110, 118, 125, 130, 142, 138, 126, 115, 108] * 2
        resp = self.client.post("/analyze-cgm", json={
            "readings": readings,
            "fasting_insulin": 14.0
        })
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("summary_metrics", data)
        self.assertIn("time_in_range_70_180", data["summary_metrics"])
        self.assertEqual(data["summary_metrics"]["reading_count"], 20)
        self.assertIn("risk_assessment", data)

    def test_empty_readings_error_handling(self):
        resp = self.client.post("/analyze-cgm", json={"readings": []})
        self.assertEqual(resp.status_code, 400)


if __name__ == "__main__":
    unittest.main()
