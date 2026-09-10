# GlucoSense

**AI-powered diabetes prediction and glycemic risk assessment** using a CNN-LSTM model trained on Continuous Glucose Monitoring (CGM) data.

---

## ✨ Features

- **Patient Dashboard** — live glucose reading, risk badge (Low/Moderate/High), trend chart, glycemia risk index
- **Prediction Engine** — CNN-LSTM based multi-class diabetes classification with confidence scores
- **Emergency SOS** — one-tap alert flow to notify saved emergency contacts
- **Chatbot Assistant** — in-app help for questions about readings and risk levels
- **Authentication** — email/password sign-in and sign-up, plus Google Sign-In (OAuth 2.0)
- **Settings** — profile management, emergency contacts, notification preferences

---

## 🧠 Model Architecture & ML Inference

The repository integrates the frozen, verified **GlucoSense Combined 1D CNN-LSTM** deep sequence network for continuous glucose monitoring (CGM) based glycemic-risk assessment.

### 🔬 Model Specifications
* **Locked Checkpoint**: `models/combined_cnn_lstm.pt` (Epoch 31, Val Macro-F1: 0.6168)
* **Locked Scaler**: `models/combined_scaler.json`
* **Network Family**: 1D CNN-LSTM (2 Conv1D blocks, MaxPool1D, 2-layer stacked LSTM, Representation Fusion, Dense Projection, Linear Head)
* **Total Parameters**: 88,325 (88,067 trainable)
* **Input Sequence Requirement**: Exactly 288 samples at 5-minute sampling resolution ($288 \times 5\text{ min} = 24\text{ hours}$)
* **Input Tensor Dimensions**: `(Batch_Size, 288, 2)`
  * **Channel 0**: Interstitial Glucose ($mg/dL$), normalized with frozen training parameters ($\mu = 125.293, \sigma = 39.791$)
  * **Channel 1**: Glucose Rate of Change ($\Delta G$ per 5-min step, $\mu = -0.0003, \sigma = 4.4160$)
* **Strict Biomarker Exclusion**: No laboratory biomarkers ($\text{HbA}_{1\text{c}}$, Fasting Blood Glucose), demographic attributes (age, gender, BMI), or clinical histories are used as inputs to the model.

### 🏷️ Output Classes & Decision Rule
The model outputs calibrated softmax probabilities across 3 mutually exclusive categories:
1. **Normal / Euglycemic** (`Class 0`)
2. **Prediabetes / Early Type 2** (`Class 1`)
3. **Type 2 Diabetes Mellitus** (`Class 2`)

* **Decision Rule**: Locked $\arg\max$ decision logic:
  $$\hat{y} = \arg\max_{c \in \{0, 1, 2\}} P(Y=c \mid \mathbf{x})$$
* **Multi-Window Aggregation**: When $\ge 2$ valid 24-hour windows exist, probabilities are aggregated via **soft probability voting** ($\bar{P} = \frac{1}{W} \sum_{w=1}^W P_w$), followed by a single $\arg\max$ operation. Experimental thresholds are strictly prohibited.
* **Missing Data Handling**: Short gaps ($\le 30$ minutes) are linearly interpolated. Large gaps ($> 30$ min unfillable / $> 60$ min gap) break the continuous episode. If no continuous 24-hour window ($\ge 288$ samples) exists, the pipeline safely returns `status: "insufficient_data"` without fabricating a classification.

### 📊 Training Datasets & Verified Research Results
* **Training Cohorts**: Pooled Hall et al. ($N=57$) + CGMacros PhysioNet ($N=45$) across 102 total participants ($N=19$ T2D).
* **Held-Out Combined Evaluation** ($N=16$ test participants: 9 Normal, 4 Prediabetes, 3 T2D; 102 24h windows):
  * **Patient Accuracy**: **68.75%** (11/16)
  * **Balanced Accuracy**: **64.81%**
  * **Macro-F1**: **0.6317**
  * **Per-Class Recall**: Normal: **77.8%** (7/9) · Prediabetes: **50.0%** (2/4) · Type 2 Diabetes: **66.7%** (2/3)
  * **Per-Class Precision**: Normal: **87.5%** (7/8) · Prediabetes: **66.7%** (2/3) · Type 2 Diabetes: **40.0%** (2/5)
* **External Validation Status (MOBILE Cohort)**: External validation was **NOT completed** because participant-level continuous CGM traces were not acquired under controlled-access DUA requirements. Zero traces were fabricated.
* **Research Documentation & Ground Truth**:
  * Detailed Research Summary: [`docs/FINAL_RESEARCH_STATUS.md`](docs/FINAL_RESEARCH_STATUS.md)
  * Model Card: [`docs/FINAL_MODEL_CARD.md`](docs/FINAL_MODEL_CARD.md)
  * Presentation Results: [`docs/PRESENTATION_RESULTS.md`](docs/PRESENTATION_RESULTS.md)
  * Cross-Cohort Validation: [`docs/CROSS_COHORT_VALIDATION_REPORT.md`](docs/CROSS_COHORT_VALIDATION_REPORT.md)
  * MOBILE Evaluation Report: [`docs/MOBILE_EXTERNAL_VALIDATION_RESULTS.md`](docs/MOBILE_EXTERNAL_VALIDATION_RESULTS.md)

### ⚠️ Medical Safety & Regulatory Notice
> **"This AI model is a research prototype and has not been clinically validated. It is not intended to diagnose, treat, or manage diabetes. Consult a qualified healthcare professional for medical decisions."**
> GlucoSense is an exploratory decision-support research prototype. It does NOT make clinical diagnoses or provide treatment directives. Model classifications represent risk category indications under research benchmark protocols.

### 🔌 API Endpoints
* `POST /api/ml/predict`: Primary 24-hour CGM inference endpoint. Accepts `{ "readings": [...] }` (values or timestamped readings) and optional `"is_mmol_l": true`.
* `GET /api/ml/model-info`: Detailed architecture specifications, training cohorts, verified holdout metrics, and safety disclaimers.
* `GET /api/health`: Health status gateway reporting Express and Python ML backend statuses.
* `POST /api/analyze-cgm`: CGM time-in-range telemetry analytics and neural risk classification.

---

## 🛠 Tech Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **Backend:** Express (`server.ts`), Node.js
- **Auth:** Email/password + Google OAuth 2.0 (`google-auth-library`)
- **AI:** Gemini API (via Google AI Studio)
- **Storage:** JSON-based user store (prototype only — see [Security Notes](#-security-notes))

---

## 📁 Project Structure

```
glucosense/
├── src/                  # React components, pages, hooks
├── assets/.aistudio/     # AI Studio project metadata
├── server.ts             # Express server — auth, OAuth, API routes
├── index.html            # App entry point
├── vite.config.ts        # Vite build config
├── metadata.json          # AI Studio app metadata
├── package.json
├── tsconfig.json
├── .env.example           # Documented environment variables (no secrets)
└── .gitignore
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+

### 1. Clone the repository
```bash
git clone https://github.com/abdulazeezsk567/glucosense.git
cd glucosense
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
Copy `.env.example` to `.env.local` and fill in your own values:
```bash
cp .env.example .env.local
```

| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Your Gemini API key from [Google AI Studio](https://ai.studio) |
| `GOOGLE_CLIENT_ID` | OAuth 2.0 Web Client ID from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | OAuth 2.0 Client Secret (server-side only — never exposed to the frontend) |
| `SESSION_SECRET` | Random secret used to sign session tokens |

**Never commit `.env.local` or real API keys/secrets.**

### 4. Run the app
```bash
npm run dev
```
The app runs at `http://localhost:3000`.

---

## 🔐 Google Sign-In Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services → Credentials**
2. Create an **OAuth Client ID** (Web application)
3. Add `http://localhost:3000` and your deployed domain to **Authorized JavaScript origins**
4. Add `http://localhost:3000/auth/callback` and `https://your-domain.com/auth/callback` to **Authorized redirect URIs**
5. Copy the Client ID and Client Secret into `.env.local`
6. If your OAuth consent screen is in **Testing** status, add your test Google account under **Test users**, or publish the app

---

## 🔒 Security Notes

This started as a hackathon/conference prototype. Before using it with real user data, make sure the following are addressed:

- [ ] **Password verification** — credential-based login must actually verify a hashed password (bcrypt/argon2), not just check that the email exists
- [ ] **Signed sessions** — session cookies should be signed (JWT or server-side session store), not a raw plaintext identifier
- [ ] **CSRF protection** on all state-changing endpoints (`/api/auth/login`, `/register`, `/logout`)
- [ ] **No PII in source control** — remove any hardcoded demo user data with realistic names/phone numbers/IDs from the codebase
- [ ] **`users-db.json`** (or equivalent data file) must stay in `.gitignore` and never be committed
- [ ] **Production error responses** should not expose Client IDs, redirect URIs, or internal diagnostics — gate verbose errors behind a dev-only check

Google OAuth token verification (`verifyIdToken` with signature/audience/expiry checks) is implemented correctly and should be preserved as-is when making changes.

---

## 📡 Deployment

GlucoSense deploys as a **unified, single-service containerized web application** on [Render](https://render.com) using Docker.

```
ONE Render Web Service (https://<glucosense-name>.onrender.com)
  ├── Express Web Server (0.0.0.0:$PORT)
  │     ├── Serves compiled React/Vite SPA assets (dist/)
  │     └── Reverse-proxies ML API routes (/api/ml/*)
  └── Python FastAPI ML Inference Engine (127.0.0.1:8000)
        └── Loads frozen PyTorch CNN-LSTM model & scaler
```

### 1. Render Deployment (Recommended)

1. Connect your repository to **Render**.
2. Create a new **Web Service**.
3. Select **Docker** as the Runtime environment.
4. Set the build branch to `main`.
5. Set the **Health Check Path** to `/api/health`.
6. Configure the following environment variables in the Render Dashboard:

| Variable | Description | Required | Default |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | Runtime mode | Yes | `production` |
| `ML_SERVICE_URL` | Internal URL for Python inference server | Yes | `http://127.0.0.1:8000` |
| `SESSION_SECRET` | Secret key for cryptographic cookie signing | Yes | Random 32-byte hex |
| `GEMINI_API_KEY` | Google Gemini API key for clinical guidance notes | Optional | None |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth Client ID for patient/provider sign-in | Optional | None |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | Optional | None |
| `APP_URL` | Public Render domain (e.g. `https://<glucosense-name>.onrender.com`) | Optional | None |

> Note: If using Render Blueprints, the provided [`render.yaml`](render.yaml) automatically configures the service, health check, and generates `SESSION_SECRET`.

### 2. Local Production Testing

You can build and test the production application locally without development servers:

```bash
# 1. Compile frontend and server bundle
npm run build

# 2. Start production server (auto-spawns ML inference service)
npm start
```

Visit `http://localhost:3000` to interact with the production build.

Verify production health:
```bash
curl http://localhost:3000/api/health
```

Expected output:
```json
{
  "status": "online",
  "backend": "express",
  "ml_service": {
    "status": "online",
    "service": "GlucoSense-ML",
    "model_loaded": true,
    "device": "cpu",
    "model_version": "1.0.0-combined"
  }
}
```

### 3. Docker Local Build

To build the optimized CPU-based production image locally:

```bash
docker build -t glucosense:production .
docker run -p 3000:3000 -e SESSION_SECRET="test-secret-key-12345" glucosense:production
```

### ⚠️ Medical Safety Notice
GlucoSense is an artificial intelligence research prototype and algorithmic risk decision-support tool. It has not been clinically validated as a diagnostic device. It does not provide medical diagnoses or replace physician guidance.

