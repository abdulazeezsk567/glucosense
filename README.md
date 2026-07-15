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

## 🧠 Model

**Architecture:** CNN-LSTM (Conv1D → MaxPooling1D → LSTM → Dense → Dropout → Dense/Softmax)

**Classes:** Normal · Prediabetes / Early Type 2 · Type 2 Diabetes

**Paper:** *A Unified Deep Learning Framework for Multi-Class Diabetes Classification and Insulin-Aware Glycemic Risk Assessment Using CGM Data*

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

- **Frontend + Express server:** Deployable to any Node host (Render, Railway, Google Cloud Run, etc.)
- Ensure all environment variables from `.env.example` are set in your hosting provider's dashboard — never bake secrets into the build.

---

## 👥 Authors

- Gundala Nageswara Rao
- Shaik Reshma
- Kantla Divya Sri
- Shaik Abdul Azeez

---

## 📄 License

Provided for academic and research purposes as part of ICEC2NT 2026.
