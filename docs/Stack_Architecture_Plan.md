# Stack & Architecture Reference — for AI-assisted project planning

Use this file as context when starting a new project with Claude Code. It states what I already know, what's approved to swap, and how I want new codebases structured. Keep every file doing exactly one job — no unnecessary abstraction, no framework unless a real requirement forces it.

---

## 1. My Baseline Stack (what I already understand deeply)
- Python
- Flask
- Firebase (Firestore, Storage, Auth) — via `firebase-admin` SDK
- python-dotenv (local) → Vercel environment variables (deployed)
- Vanilla HTML/CSS/JS — no SPA framework, no CSS framework, no jQuery

## 2. Frontend Policy
Default to plain HTML/CSS/JS: `document.querySelector`, `addEventListener`, `fetch()` for API calls. No React/Vue/Angular/Bootstrap/Tailwind/jQuery unless the project genuinely needs client-side state management that vanilla JS can't reasonably handle.

Exception allowed: narrow-purpose CDN libraries for a specific feature only (e.g. Chart.js for a chart, SheetJS for spreadsheet export) — loaded on the one page that needs them, not globally.

## 3. Approved Swaps (use these by default in new projects)
| Old habit | Use instead | Reason |
|---|---|---|
| PayPal SDK | Stripe Checkout | Simpler integration, better docs, standard webhook pattern |
| Gmail SMTP / Flask-Mail | Resend | Built for serverless, simple REST call, no SMTP config |
| Raw `requests` to AI provider | Official OpenAI or Anthropic SDK | Retries/streaming/error-typing included |
| Google Cloud Vision | Keep as-is if moderation is needed | Already isolated, no reason to change |

## 4. Deployment Target: Vercel (free/Hobby tier) — hard constraints
- Functions are stateless and ephemeral — nothing persists between invocations.
- No background workers, no persistent processes.
- Free tier execution timeout: 10 seconds per function (60s on Pro).
- Filesystem writes do NOT persist — never log to a local file.
- Built-in Cron on Hobby only fires once per day; anything more frequent needs an external trigger (e.g. cron-job.org or a scheduled GitHub Action) calling an API route.
- Flask is officially supported on Vercel via the Python runtime (WSGI) — no need to switch languages to deploy.

## 5. Target Codebase Architecture

```
project-root/
├── api/
│   ├── index.py              # Flask app entrypoint (Vercel entrypoint)
│   ├── routes/                # one file per feature area, thin — just request/response
│   │   ├── auth.py
│   │   ├── payments.py
│   │   ├── ai_chat.py
│   │   └── alerts.py
│   ├── services/               # one file per external integration — THE swap layer
│   │   ├── firebase_client.py
│   │   ├── stripe_client.py
│   │   ├── resend_client.py
│   │   └── ai_client.py
│   ├── models/
│   │   └── schemas.py         # Pydantic models — validate AI output before using it
│   └── logger.py               # stdout logging only, no file writes
├── templates/                   # Flask Jinja templates, one file per page
├── static/
│   ├── css/                     # one file per page
│   └── js/                      # one file per page, vanilla, fetch() to /api
├── vercel.json                   # routes + cron config (remember: daily-only on free tier)
├── requirements.txt
└── .env.local                    # local dev only; real secrets live in Vercel dashboard
```

## 6. Ground Rules for AI (Claude Code) when building in this stack
1. One file = one responsibility. Routes stay thin; logic that talks to an external service lives in `services/`, nowhere else.
2. Never write logs to disk — use stdout only (Vercel captures it automatically).
3. Never use `exec()`/`eval()` on AI model output. Validate with Pydantic schemas instead.
4. Don't add a JS/CSS framework by default — ask before introducing one.
5. Don't schedule recurring tasks with in-process schedulers (APScheduler etc.) — they die on serverless. Use Vercel Cron (daily max on free tier) or an external HTTP trigger for anything more frequent.
6. Prefer official SDKs over raw HTTP calls for any third-party API.
7. Keep secrets out of code — always environment variables, never hardcoded.
