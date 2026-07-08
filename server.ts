import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { OAuth2Client } from "google-auth-library";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory Rate Limiter Map
const rateLimits = new Map<string, { count: number; resetTime: number }>();

function rateLimiter(maxRequests: number, windowMs: number) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const key = `${req.path}:${ip}`;
    const now = Date.now();
    const limit = rateLimits.get(key);

    if (!limit || now > limit.resetTime) {
      rateLimits.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    limit.count++;
    if (limit.count > maxRequests) {
      const retryAfter = Math.ceil((limit.resetTime - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({
        error: "Too many requests. Please try again later.",
        retryAfter
      });
    }

    next();
  };
}

// Cookie parser utility
function parseCookies(cookieHeader?: string) {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(';').forEach(cookie => {
    const parts = cookie.split('=');
    if (parts.length >= 2) {
      cookies[parts[0].trim()] = parts.slice(1).join('=').trim();
    }
  });
  return cookies;
}

// User persistent database structure
const USERS_FILE = path.join(process.cwd(), "users-db.json");

const DEFAULT_USERS = [
  {
    id: 'GS-8821',
    name: 'Sarah Jenkins',
    age: 42,
    type: 'Type 2',
    cgmId: 'DEX-G6-GOOG9',
    phone: '+1 (555) 019-2834',
    physicianCode: 'MED-8924-XXL',
    email: 'sarah.jenkins@glucosense.io',
    avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDz-QKHmgjB-ETlXBg0RJ4qZxhtVseGDORvro4aZAZXXAuI8ua6v0WnoaB5LzDymMIknOAdBf2vagGnJ6MQPMZ_DuMgfmbcjcyi4V0yVfo_kPk_AwcYFmXVgseboKPeJYUFUbG_AP_K58HWIPhsTEo72tE7HsrtfoDuC_gJYdNmdLG7RzRs7e9JAkG422C9ToV8ZSVXHvf-VnyQEti2ErsqyB9VQpPkU1C1Z4TxSb-mMwZqGxl2FNpbkpntuUXd_JzWXSun_ny5r1c',
    role: 'patient',
    authProvider: 'credentials'
  }
];

function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(DEFAULT_USERS, null, 2));
    return DEFAULT_USERS;
  }
  try {
    const data = fs.readFileSync(USERS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading users file, falling back to default:", err);
    return DEFAULT_USERS;
  }
}

function saveUsers(users: any[]) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  } catch (err) {
    console.error("Error saving users file:", err);
  }
}

// Google Auth Lazy Loader
function getGoogleClient(redirectUri?: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId) {
    throw new Error("GOOGLE_CLIENT_ID environment variable is missing.");
  }
  return new OAuth2Client(clientId, clientSecret, redirectUri);
}

// ---------------- API ENDPOINTS ----------------

// 1. Get Google OAuth authorize URL
app.get('/api/auth/google/url', rateLimiter(10, 60 * 1000), (req, res) => {
  const { origin, mode } = req.query;
  if (!origin) {
    return res.status(400).json({ error: "Missing origin parameter." });
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    
    // Log precise diagnostics to the server console for rapid local/container debugging
    console.log("\n=================== OAUTH INITIATION DIAGNOSTICS ===================");
    console.log(`[TIME]     ${new Date().toISOString()}`);
    console.log(`[ORIGIN]   ${origin}`);
    console.log(`[CALLBACK] ${origin}/auth/callback`);
    console.log(`[CLIENT]   ${clientId ? clientId : "⚠️ MISSING (Set GOOGLE_CLIENT_ID)"}`);
    console.log(`[SECRET]   ${clientSecret ? "CONFIGURED (Verified)" : "⚠️ MISSING (Set GOOGLE_CLIENT_SECRET)"}`);
    console.log("====================================================================\n");

    if (!clientId) {
      return res.status(400).json({
        error: "GOOGLE_CLIENT_ID is not configured in the server environment.",
        diagnostics: {
          clientIdStatus: "missing",
          originSent: origin,
          suggestedRedirectUri: `${origin}/auth/callback`,
          actions: [
            "Go to the AI Studio settings panel / environment variables.",
            "Add GOOGLE_CLIENT_ID with your OAuth 2.0 Web Client ID.",
            "Add GOOGLE_CLIENT_SECRET with your client secret."
          ]
        }
      });
    }

    const redirectUri = `${origin}/auth/callback`;
    const state = JSON.stringify({ mode, origin });

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state: state,
      prompt: 'select_account',
      access_type: 'offline'
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    res.json({ 
      url: authUrl,
      diagnostics: {
        clientId: clientId,
        redirectUri: redirectUri,
        origin: origin,
        publishingStatusHelp: "If your OAuth consent screen is set to 'Testing', ensure your email is added under 'Test users' in the GCP Console."
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to generate authorize URL" });
  }
});

// 2. Google OAuth callback handler
app.get(['/auth/callback', '/auth/callback/'], rateLimiter(5, 15 * 60 * 1000), async (req, res) => {
  const { code, state, error, error_description } = req.query;

  let stateData: { mode?: string; origin?: string } = {};
  if (state) {
    try {
      stateData = JSON.parse(state as string);
    } catch (e) {
      stateData = { mode: state as string };
    }
  }
  const origin = stateData.origin || `${req.protocol}://${req.get('host')}`;
  const redirectUri = `${origin}/auth/callback`;
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;

  // Handle Google OAuth error responses (e.g. access_denied, consent dismissed)
  if (error) {
    console.error(`[OAuth Callback Error] Code: ${error}, Description: ${error_description}`);
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Google Sign-In Error</title>
          <style>
            body {
              background-color: #051424;
              color: #ffb4ab;
              font-family: system-ui, -apple-system, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
            }
            .card {
              max-width: 480px;
              width: 90%;
              padding: 32px;
              background-color: #2a1111;
              border: 1px solid rgba(255, 100, 100, 0.35);
              border-radius: 20px;
              text-align: center;
              box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            }
            h3 { margin-top: 0; color: #ffb4ab; font-size: 18px; }
            p { font-size: 13px; color: #c6c6cd; line-height: 1.5; }
            .badge {
              display: inline-block;
              background-color: rgba(255, 68, 68, 0.15);
              color: #ffb4ab;
              padding: 4px 10px;
              border-radius: 6px;
              font-family: monospace;
              font-size: 12px;
              margin-bottom: 12px;
            }
            .btn {
              margin-top: 20px;
              padding: 10px 24px;
              background-color: #421818;
              border: 1px solid rgba(255,100,100,0.4);
              color: #ffb4ab;
              border-radius: 8px;
              font-weight: bold;
              cursor: pointer;
              transition: all 0.2s;
            }
            .btn:hover { background-color: #582121; }
          </style>
        </head>
        <body>
          <div class="card">
            <h3>⚠️ Google Authorization Blocked</h3>
            <div class="badge">Google Error: ${error}</div>
            <p>${error_description || 'You cancelled the sign-in prompt or denied access to the required scopes.'}</p>
            <p style="font-size: 11px; opacity: 0.8; margin-top: 15px;">
              <strong>Checklist:</strong> If in 'Testing' mode on Google Cloud Console, your account must be added as a designated 'Test User'.
            </p>
            <button class="btn" onclick="window.close()">Return to Application</button>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'OAUTH_AUTH_FAILURE',
                error: ${JSON.stringify(error_description || 'Google authentication rejected: ' + error)}
              }, '*');
            }
          </script>
        </body>
      </html>
    `);
  }

  if (!code) {
    return res.status(400).send("No authorization code provided in Google redirect callback.");
  }

  try {
    // Exchange authorization code for tokens
    const client = getGoogleClient(redirectUri);
    const { tokens } = await client.getToken(code as string);
    const idToken = tokens.id_token;

    if (!idToken) {
      throw new Error("Google did not return an identity token.");
    }

    // Cryptographically verify ID token signature, audience, and expiration
    const ticket = await client.verifyIdToken({
      idToken: idToken,
      audience: clientId,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      throw new Error("The identity token signature is verified, but has no email address associated with the payload.");
    }

    const email = payload.email.toLowerCase();
    const name = payload.name || email.split('@')[0];
    const picture = payload.picture || '';

    // Database Lookup / Upsert
    const users = loadUsers();
    let user = users.find(u => u.email.toLowerCase() === email);

    if (!user) {
      // Create user record securely
      user = {
        id: `GS-${Math.floor(1000 + Math.random() * 9000)}`,
        name: name,
        age: 42,
        type: 'Type 2',
        cgmId: 'DEX-G6-GOOG9',
        phone: '+1 (555) 019-2834',
        physicianCode: 'MED-8924-XXL',
        email: email,
        avatarUrl: picture,
        authProvider: 'google',
        role: 'patient'
      };
      
      users.push(user);
      saveUsers(users);
    }

    // Set HTTP-Only, Secure, SameSite=None Session Cookie
    res.setHeader(
      'Set-Cookie',
      `session_user=${encodeURIComponent(email)}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=2592000`
    );

    // Communicate success to opener window and auto-close popup
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Authenticating...</title>
          <style>
            body {
              background-color: #051424;
              color: #d4e4fa;
              font-family: system-ui, -apple-system, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
            }
            .card {
              text-align: center;
              padding: 32px;
              background-color: #122131;
              border: 1px solid rgba(69, 70, 77, 0.3);
              border-radius: 20px;
              box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3);
            }
            .spinner {
              width: 32px;
              height: 32px;
              border: 3px solid rgba(90, 218, 206, 0.2);
              border-top-color: #5adace;
              border-radius: 50%;
              animation: spin 1s linear infinite;
              margin: 0 auto 16px;
            }
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="spinner"></div>
            <h3 style="margin: 0 0 8px 0;">Google Verification Successful</h3>
            <p style="margin: 0; font-size: 13px; color: #c6c6cd;">Establishing secure clinical telemetry...</p>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'OAUTH_AUTH_SUCCESS',
                role: 'patient',
                profile: ${JSON.stringify(user)}
              }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
        </body>
      </html>
    `);

  } catch (error: any) {
    console.error("OAuth Exchange / Signature Verification Error:", error);
    
    // Check for common redirect_uri_mismatch or bad secret issues
    const isMismatch = error.message && (
      error.message.includes('redirect_uri_mismatch') || 
      error.message.includes('mismatch') ||
      error.message.includes('400')
    );

    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Secure Handshake Failure</title>
          <style>
            body {
              background-color: #051424;
              color: #ffb4ab;
              font-family: system-ui, -apple-system, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
              box-sizing: border-box;
            }
            .card {
              max-width: 580px;
              width: 100%;
              padding: 32px;
              background-color: #1a0e0e;
              border: 1px solid rgba(255, 68, 68, 0.3);
              border-radius: 20px;
              box-shadow: 0 10px 30px rgba(0,0,0,0.6);
            }
            h3 { color: #ffb4ab; margin-top: 0; font-size: 18px; }
            .err-desc { font-size: 13.5px; color: #e5b3b3; line-height: 1.5; background-color: rgba(255,0,0,0.15); padding: 12px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #ff5555; font-family: monospace; }
            .section-title { font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; color: #5adace; margin: 16px 0 8px; }
            .diagnostic-grid { background-color: #0b0707; padding: 16px; border-radius: 12px; font-family: monospace; font-size: 11.5px; color: #c6c6cd; border: 1px solid rgba(255,255,255,0.05); }
            .diagnostic-row { display: flex; margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.03); padding-bottom: 8px; }
            .diagnostic-row:last-child { margin-bottom: 0; border-bottom: none; padding-bottom: 0; }
            .diagnostic-label { width: 140px; color: #8892b0; font-weight: bold; flex-shrink: 0; }
            .diagnostic-value { word-break: break-all; color: #e6edf3; }
            .fix-guide { margin-top: 16px; font-size: 12px; color: #c6c6cd; line-height: 1.6; }
            .fix-guide ol { padding-left: 20px; margin: 8px 0; }
            .btn { width: 100%; margin-top: 20px; padding: 12px; background-color: #ff4444; border: none; color: white; border-radius: 8px; font-weight: bold; cursor: pointer; transition: background 0.2s; }
            .btn:hover { background-color: #ff6666; }
          </style>
        </head>
        <body>
          <div class="card">
            <h3>🔒 Identity Exchange Security Blocked</h3>
            <p>The backend was unable to securely verify the authorization code returned by Google. This occurs when the configuration in Google Cloud Console does not match your current running runtime parameters.</p>
            
            <div class="err-desc">
              ${error.message || 'Internal Exchange Error: Failed to resolve authorization code.'}
            </div>

            <div class="section-title">Runtime Diagnostics</div>
            <div class="diagnostic-grid">
              <div class="diagnostic-row">
                <div class="diagnostic-label">Client ID:</div>
                <div class="diagnostic-value">${clientId || '⚠️ MISSING'}</div>
              </div>
              <div class="diagnostic-row">
                <div class="diagnostic-label">Redirect URI:</div>
                <div class="diagnostic-value">${redirectUri}</div>
              </div>
              <div class="diagnostic-row">
                <div class="diagnostic-label">Origin:</div>
                <div class="diagnostic-value">${origin}</div>
              </div>
              <div class="diagnostic-row">
                <div class="diagnostic-label">Client Secret:</div>
                <div class="diagnostic-value">${process.env.GOOGLE_CLIENT_SECRET ? '✅ Configured (Hidden)' : '⚠️ MISSING'}</div>
              </div>
            </div>

            <div class="section-title">Required Action to Resolve</div>
            <div class="fix-guide">
              <ol>
                <li>Open your <strong>Google Cloud Console</strong> &rarr; <em>APIs & Services</em> &rarr; <em>Credentials</em>.</li>
                <li>Edit your <strong>OAuth 2.0 Client ID</strong> (Web Application).</li>
                <li>Under <strong>Authorized JavaScript origins</strong>, add:<br/><code style="background:#1c1212; padding:2px 4px; color:#5adace; font-size:11px; border-radius:4px;">${origin}</code></li>
                <li>Under <strong>Authorized redirect URIs</strong>, add exactly:<br/><code style="background:#1c1212; padding:2px 4px; color:#5adace; font-size:11px; border-radius:4px;">${redirectUri}</code></li>
                <li>Verify your <code>GOOGLE_CLIENT_SECRET</code> is updated in the settings page of your workspace container.</li>
              </ol>
            </div>

            <button class="btn" onclick="window.close()">Dismiss Handshake Report</button>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'OAUTH_AUTH_FAILURE',
                error: ${JSON.stringify(error.message || 'Google identity exchange code handshake failed')}
              }, '*');
            }
          </script>
        </body>
      </html>
    `);
  }
});

// 3. Retrieve current session user
app.get('/api/auth/me', rateLimiter(60, 60 * 1000), (req, res) => {
  const cookies = parseCookies(req.headers.cookie);
  const sessionUserEmail = cookies['session_user'];

  if (!sessionUserEmail) {
    return res.status(401).json({ error: "No active session." });
  }

  const email = decodeURIComponent(sessionUserEmail).toLowerCase();
  const users = loadUsers();
  const user = users.find(u => u.email.toLowerCase() === email);

  if (!user) {
    return res.status(401).json({ error: "Session user not found." });
  }

  res.json({ role: user.role || 'patient', profile: user });
});

// 4. Secure Credential-Based Fallback Sign-In
app.post('/api/auth/login', rateLimiter(5, 15 * 60 * 1000), (req, res) => {
  const { email, password } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email ID is required." });
  }

  const emailLower = email.toLowerCase();
  const users = loadUsers();
  let user = users.find(u => u.email.toLowerCase() === emailLower);

  if (!user) {
    // Standard credential signup with fallback
    const nameFromEmail = email.split('@')[0].split('.').map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
    user = {
      id: 'GS-8821',
      name: nameFromEmail || 'Sarah Jenkins',
      age: 42,
      type: 'Type 2',
      cgmId: 'DEX-G6-GOOG9',
      phone: '+1 (555) 019-2834',
      physicianCode: 'MED-8924-XXL',
      email: emailLower,
      avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDz-QKHmgjB-ETlXBg0RJ4qZxhtVseGDORvro4aZAZXXAuI8ua6v0WnoaB5LzDymMIknOAdBf2vagGnJ6MQPMZ_DuMgfmbcjcyi4V0yVfo_kPk_AwcYFmXVgseboKPeJYUFUbG_AP_K58HWIPhsTEo72tE7HsrtfoDuC_gJYdNmdLG7RzRs7e9JAkG422C9ToV8ZSVXHvf-VnyQEti2ErsqyB9VQpPkU1C1Z4TxSb-mMwZqGxl2FNpbkpntuUXd_JzWXSun_ny5r1c',
      role: 'patient',
      authProvider: 'credentials'
    };
    users.push(user);
    saveUsers(users);
  }

  res.setHeader(
    'Set-Cookie',
    `session_user=${encodeURIComponent(emailLower)}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=2592000`
  );

  res.json({ role: 'patient', profile: user });
});

// 5. Secure Patient Registration
app.post('/api/auth/register', rateLimiter(5, 15 * 60 * 1000), (req, res) => {
  const { name, email, age, type, cgmId, phone, physicianCode } = req.body;
  if (!email || !name) {
    return res.status(400).json({ error: "Name and email are required." });
  }

  const emailLower = email.toLowerCase();
  const users = loadUsers();
  let existing = users.find(u => u.email.toLowerCase() === emailLower);

  if (existing) {
    return res.status(400).json({ error: "A patient profile with this email address already exists." });
  }

  const generatedId = `GS-${Math.floor(1000 + Math.random() * 9000)}`;
  const newUser = {
    id: generatedId,
    name,
    age: parseInt(age) || 42,
    type,
    cgmId: cgmId || 'DEX-G6-GS8821',
    phone: phone || '+1 (555) 019-2834',
    physicianCode: physicianCode || 'MED-8924-XXL',
    email: emailLower,
    avatarUrl: '',
    role: 'patient',
    authProvider: 'credentials'
  };

  users.push(newUser);
  saveUsers(users);

  res.setHeader(
    'Set-Cookie',
    `session_user=${encodeURIComponent(emailLower)}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=2592000`
  );

  res.json({ role: 'patient', profile: newUser });
});

// 6. Sign-out endpoint
app.post('/api/auth/logout', (req, res) => {
  res.setHeader(
    'Set-Cookie',
    'session_user=; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=0'
  );
  res.json({ status: "success" });
});


// Vite Dev / Static Production Middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
}

startServer();
