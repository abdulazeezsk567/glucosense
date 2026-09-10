# syntax=docker/dockerfile:1

# =======================================================
# Stage 1: Build React/Vite Frontend & Compile Express Server
# =======================================================
FROM node:20-slim AS builder
WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json ./
RUN npm ci

# Copy build configuration & source files
COPY tsconfig.json vite.config.ts index.html ./
COPY src/ ./src/
COPY server.ts ./

# Compile frontend to dist/ and server to dist/server.cjs
RUN npm run build

# =======================================================
# Stage 2: Production Unified Runtime (Python + Node.js)
# =======================================================
FROM python:3.11-slim AS runner
WORKDIR /app

# Set production environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    ML_SERVICE_URL=http://127.0.0.1:8000 \
    PYTHONUNBUFFERED=1

# Install system dependencies and Node.js 20 runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && apt-get purge -y --auto-remove curl \
    && rm -rf /var/lib/apt/lists/*

# Install lightweight PyTorch CPU wheel (avoids 2GB+ CUDA overhead)
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

# Install Python ML inference service dependencies
COPY requirements-prod.txt ./
RUN pip install --no-cache-dir -r requirements-prod.txt

# Install Node.js production dependencies only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built frontend assets and server bundle from builder stage
COPY --from=builder /app/dist ./dist

# Copy strictly required ML inference code
COPY ml/inference.py ml/inference_server.py ml/model.py ml/risk_assessment.py ./ml/

# Copy authoritative frozen model weights and scaler
COPY models/combined_cnn_lstm.pt models/combined_scaler.json ./models/

# Copy container process supervisor
COPY start.sh ./
RUN chmod +x start.sh

# Default container port (Render overrides with $PORT at runtime)
EXPOSE 3000

# Start both Python FastAPI and Express via process supervisor
CMD ["./start.sh"]
