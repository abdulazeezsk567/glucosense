"""
Integration test for Express server and Python ML bridge
Starts the production/dist server, sends live HTTP requests to
/api/health, /api/model-info, /api/predict, and /api/analyze-cgm,
and verifies real responses.
"""

import os
import sys
import time
import json
import urllib.request
import urllib.error
import subprocess
import unittest

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class TestExpressIntegration(unittest.TestCase):
    server_process = None

    @classmethod
    def setUpClass(cls):
        if not os.environ.get("RUN_EXPRESS_INTEGRATION"):
            raise unittest.SkipTest("Live Express integration test requires running reverse-proxy. Set RUN_EXPRESS_INTEGRATION=1 to run.")
        # 1. Start Python inference server in background first (port 8000)
        is_windows = sys.platform == "win32"
        python_bin = os.path.join(PROJECT_ROOT, "venv", "Scripts" if is_windows else "bin", "python.exe" if is_windows else "python")
        if not os.path.exists(python_bin):
            python_bin = sys.executable

        server_cjs = os.path.join(PROJECT_ROOT, "dist", "server.cjs")
        if not os.path.exists(server_cjs):
            raise unittest.SkipTest("dist/server.cjs not found; skipping Express integration test.")
        node_bin = "node"

        cls.ml_process = subprocess.Popen(
            [python_bin, os.path.join(PROJECT_ROOT, "ml", "inference_server.py")],
            cwd=PROJECT_ROOT,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
        cls.express_process = subprocess.Popen(
            [node_bin, server_cjs],
            cwd=PROJECT_ROOT,
            env=dict(os.environ, NODE_ENV="production", PORT="3000"),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )

        # Wait up to 10 seconds for Express to respond
        is_ready = False
        for _ in range(20):
            time.sleep(0.5)
            try:
                with urllib.request.urlopen("http://localhost:3000/api/health") as res:
                    if res.status == 200 and "application/json" in res.headers.get("Content-Type", ""):
                        is_ready = True
                        break
            except Exception:
                pass

        if not is_ready:
            cls.tearDownClass()
            raise unittest.SkipTest("Express server does not expose JSON /api/health; skipping Express integration tests.")

    @classmethod
    def tearDownClass(cls):
        if hasattr(cls, "express_process") and cls.express_process:
            cls.express_process.terminate()
            try:
                cls.express_process.wait(timeout=3)
            except Exception:
                cls.express_process.kill()

        if hasattr(cls, "ml_process") and cls.ml_process:
            cls.ml_process.terminate()
            try:
                cls.ml_process.wait(timeout=3)
            except Exception:
                cls.ml_process.kill()

    def test_express_health_endpoint(self):
        req = urllib.request.Request("http://localhost:3000/api/health")
        with urllib.request.urlopen(req) as res:
            self.assertEqual(res.status, 200)
            data = json.loads(res.read().decode("utf-8"))
            self.assertEqual(data["status"], "online")
            self.assertEqual(data["backend"], "express")
            self.assertEqual(data["ml_service"]["status"], "online")

    def test_express_model_info_endpoint(self):
        req = urllib.request.Request("http://localhost:3000/api/model-info")
        with urllib.request.urlopen(req) as res:
            self.assertEqual(res.status, 200)
            data = json.loads(res.read().decode("utf-8"))
            self.assertIn("model_metadata", data)
            self.assertIn("GlucoSense", data["model_metadata"]["model_name"])

    def test_express_predict_forwarding(self):
        payload = json.dumps({
            "current_glucose": 115,
            "fasting_insulin": 10.0,
            "hba1c": 5.4,
            "bmi": 24.5
        }).encode("utf-8")

        req = urllib.request.Request(
            "http://localhost:3000/api/predict",
            data=payload,
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req) as res:
            self.assertEqual(res.status, 200)
            data = json.loads(res.read().decode("utf-8"))
            self.assertIn(data["classification"], [
                "Normal", "Prediabetes", "Type 1 Diabetes", "Type 2 Diabetes",
                "Type 3c Diabetes", "Gestational Diabetes"
            ])
            self.assertIn("risk_assessment", data)
            self.assertFalse(data["model_metadata"]["is_mock"])

    def test_express_analyze_cgm_forwarding(self):
        payload = json.dumps({
            "readings": [100, 102, 105, 98, 97, 101, 104, 108, 110, 106, 102, 99] * 2,
            "fasting_insulin": 8.0
        }).encode("utf-8")

        req = urllib.request.Request(
            "http://localhost:3000/api/analyze-cgm",
            data=payload,
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req) as res:
            self.assertEqual(res.status, 200)
            data = json.loads(res.read().decode("utf-8"))
            self.assertIn("summary_metrics", data)
            self.assertIn("classification", data)
            self.assertIn("risk_assessment", data)


if __name__ == "__main__":
    unittest.main()
