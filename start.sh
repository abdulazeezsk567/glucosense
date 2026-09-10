#!/bin/bash
set -e

ML_PORT=${ML_PORT:-8000}
PORT=${PORT:-3000}

echo "[GlucoSense Production] Starting Python FastAPI ML inference service on 127.0.0.1:${ML_PORT}..."
python3 ml/inference_server.py &
PYTHON_PID=$!

cleanup() {
  echo "[GlucoSense Production] Received shutdown signal. Terminating services..."
  kill -TERM "$PYTHON_PID" 2>/dev/null || true
  if [ -n "$NODE_PID" ]; then
    kill -TERM "$NODE_PID" 2>/dev/null || true
  fi
  wait "$PYTHON_PID" 2>/dev/null || true
  if [ -n "$NODE_PID" ]; then
    wait "$NODE_PID" 2>/dev/null || true
  fi
  echo "[GlucoSense Production] Shutdown complete."
  exit 0
}

trap cleanup SIGTERM SIGINT

echo "[GlucoSense Production] Waiting for Python ML inference service to initialize..."
READY=0
for i in $(seq 1 40); do
  if python3 -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:${ML_PORT}/health')" >/dev/null 2>&1; then
    READY=1
    echo "[GlucoSense Production] ML inference service is ONLINE and model is loaded."
    break
  fi
  sleep 0.5
done

if [ "$READY" -ne 1 ]; then
  echo "[GlucoSense Production WARNING] ML inference service did not report ready within 20s. Continuing Express startup..."
fi

echo "[GlucoSense Production] Starting Express web server on port ${PORT}..."
node dist/server.cjs &
NODE_PID=$!

# Wait for either process to exit
wait -n $PYTHON_PID $NODE_PID
EXIT_STATUS=$?
echo "[GlucoSense Production] Process exited with status $EXIT_STATUS. Cleaning up..."
cleanup
exit $EXIT_STATUS
