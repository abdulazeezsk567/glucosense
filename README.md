# GlucoSense

**CGM-based diabetes risk monitoring platform** — a CNN-LSTM powered application for multi-class diabetes classification and insulin-aware glycemic risk assessment using Continuous Glucose Monitoring (CGM) data.

> ⚠️ **Prototype status:** This is a research/demo build. Predictions currently run on a mock function until the trained CNN-LSTM model is fully connected via the backend API. See [Roadmap](#roadmap) below.

---

## ✨ Features

- **Live Dashboard** — real-time glucose reading, risk badge (Low/Moderate/High), zoned trend chart, and simulated live CGM streaming mode
- **Prediction Engine** — CGM + patient inputs (age, BMI, HbA1c) → predicted diabetes class, risk level, confidence score, and full class-probability breakdown
- **History Log** — timestamped record of past predictions
- **Recommendations** — risk-tiered guidance (Low/Moderate/High)
- **Model Info** — CNN-LSTM architecture reference and evaluation metrics
- **SOS Emergency Alerts** — one-tap alert with countdown confirmation, notifying saved emergency contacts
- **Chatbot Assistant** — in-app help for questions about readings, risk levels, and the app itself
- **Multi-patient support** — switch between patient profiles (demo mode)
- **Authentication** — email/password sign-in and sign-up, plus Google Sign-In (OAuth 2.0)
- **Settings** — profile management, emergency contacts, notification preferences, dark/light mode, and logout

---

## 🧠 Model

**Architecture:** CNN-LSTM

| Layer | Details |
|---|---|
| Conv1D | 64 filters · kernel 3 · ReLU |
| MaxPooling1D | pool size 2 |
| LSTM | 64 units |
| Dense | 32 units · ReLU |
| Dropout | rate 0.3 |
| Dense (output) | 3 units · Softmax |

**Classes:** Normal · Prediabetes / Early Type 2 · Type 2 Diabetes

---

## 🛠 Tech Stack

- **Frontend:** React, Vite, TypeScript, Tailwind CSS, Chart.js
- **Backend:** Node.js (Express), Python/FastAPI (model inference), TensorFlow/Keras
- **Model:** CNN-LSTM (trained on CGM time-series data)
- **Auth:** Email/password + Google Identity Services (OAuth 2.0)
- **Deployment:** Google Cloud Run (frontend/app server), Render/Railway (recommended for the model inference backend)

---

## 📁 Project Structure

```
glucosense/
├── src/                        # Frontend application source
├── server.ts                   # Express server (auth, API routes)
├── backend/
│   └── main.py                  # FastAPI /predict endpoint
├── saved_model/
│   └── diabetes_model.keras     # Trained CNN-LSTM model
├── notebooks/
│   ├── data_preprocessing.ipynb
│   └── model_training.ipynb
├── dataset/
│   └── processed/
├── .env.example
├── package.json
├── vite.config.ts
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js
- Python 3.10+ (for the model backend)

### 1. Clone the repository
```bash
git clone https://github.com/<your-username>/glucosense.git
cd glucosense
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
Copy `.env.example` to `.env.local` and fill in:
```
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
GEMINI_API_KEY=your-gemini-api-key
API_BASE_URL=http://localhost:8000
```

### 4. Run the app
```bash
npm run dev
```

### 5. (Optional) Run the model inference backend
```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt --break-system-packages
uvicorn main:app --reload
```
Backend runs at `http://localhost:8000` (Swagger docs at `/docs`).

---

## 🔐 Google Sign-In Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services → Credentials**
2. Create an **OAuth Client ID** (Web application)
3. Add your dev and production URLs to **Authorized JavaScript origins**
4. Add the matching **Authorized redirect URIs** (e.g. `https://your-domain/auth/callback`)
5. Copy the Client ID and Client Secret into your `.env.local`

---

## 📡 API Reference

### `POST /predict`
```json
// Request
{
  "glucose": [120, 122, 125, 130, 128],
  "age": 45,
  "bmi": 28.5,
  "hba1c": 6.8
}
```
```json
// Response
{
  "class": "Type 2 Diabetes",
  "risk": "high",
  "confidence": 0.94
}
```

### `POST /api/auth/login`
Email/password sign-in. Returns a session cookie and user profile.

### `POST /api/auth/register`
Creates a new patient profile.

### `GET /api/auth/google/url`
Returns the Google OAuth authorization URL for the client to redirect to.

### `GET /api/auth/me`
Returns the currently authenticated user's profile from the session.

### `POST /api/auth/logout`
Clears the active session.

---

## 🔒 Security Notes

- All authentication endpoints are rate-limited.
- Google ID tokens are cryptographically verified server-side (signature, audience, expiry) before a session is created.
- Session cookies are set as `HttpOnly` and `Secure`.
- Passwords must be hashed before storage — never store or compare plaintext passwords.

---

## 🗺 Roadmap

- [x] Dataset preprocessing pipeline
- [ ] Train CNN-LSTM model on a full CGM dataset
- [ ] Connect frontend to the live `/predict` endpoint (currently mocked)
- [ ] Harden authentication (password hashing, signed session tokens)
- [ ] Deploy model inference backend to Render/Railway
- [ ] Optional: ESP32 IoT live-streaming demo layer
