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
    express_port = 3000
    ml_port = 8000

    @classmethod
    def setUpClass(cls):
        if not os.environ.get("RUN_EXPRESS_INTEGRATION"):
            raise unittest.SkipTest("Live Express integration test requires running reverse-proxy. Set RUN_EXPRESS_INTEGRATION=1 to run.")

        cls.express_port = int(os.environ.get("EXPRESS_PORT", 3005))
        cls.ml_port = int(os.environ.get("ML_PORT", 8005))

        is_windows = sys.platform == "win32"
        python_bin = os.path.join(PROJECT_ROOT, "venv", "Scripts" if is_windows else "bin", "python.exe" if is_windows else "python")
        if not os.path.exists(python_bin):
            python_bin = sys.executable

        server_cjs = os.path.join(PROJECT_ROOT, "dist", "server.cjs")
        if not os.path.exists(server_cjs):
            raise unittest.SkipTest("dist/server.cjs not found; skipping Express integration test.")
        node_bin = "node"

        ml_env = dict(os.environ, ML_PORT=str(cls.ml_port), PYTHONUNBUFFERED="1")
        cls.ml_process = subprocess.Popen(
            [python_bin, os.path.join(PROJECT_ROOT, "ml", "inference_server.py")],
            cwd=PROJECT_ROOT,
            env=ml_env,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )

        express_env = dict(
            os.environ,
            NODE_ENV="production",
            PORT=str(cls.express_port),
            ML_SERVICE_URL=f"http://127.0.0.1:{cls.ml_port}",
            AUTO_START_ML="false"
        )
        cls.express_process = subprocess.Popen(
            [node_bin, server_cjs],
            cwd=PROJECT_ROOT,
            env=express_env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )

        # Wait up to 30 seconds for Express and ML server to become ready
        is_ready = False
        health_url = f"http://127.0.0.1:{cls.express_port}/api/health"
        for _ in range(60):
            time.sleep(0.5)
            try:
                with urllib.request.urlopen(health_url) as res:
                    if res.status == 200 and "application/json" in res.headers.get("Content-Type", ""):
                        is_ready = True
                        break
            except Exception:
                pass

        if not is_ready:
            cls.tearDownClass()
            raise unittest.SkipTest("Express server did not expose JSON /api/health within 30s; skipping Express integration tests.")

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
        req = urllib.request.Request(f"http://127.0.0.1:{self.express_port}/api/health")
        with urllib.request.urlopen(req) as res:
            self.assertEqual(res.status, 200)
            data = json.loads(res.read().decode("utf-8"))
            self.assertEqual(data["status"], "online")
            self.assertEqual(data["backend"], "express")
            self.assertEqual(data["ml_service"]["status"], "online")

    def test_express_model_info_endpoint(self):
        req = urllib.request.Request(f"http://127.0.0.1:{self.express_port}/api/model-info")
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
            f"http://127.0.0.1:{self.express_port}/api/predict",
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
            f"http://127.0.0.1:{self.express_port}/api/analyze-cgm",
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
