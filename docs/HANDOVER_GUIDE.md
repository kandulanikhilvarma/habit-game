# HANDOVER GUIDE — start building in the cloud today
*How to hand this project to Claude Code, run it entirely in the cloud (laptop closed), and get consistently good output.*

---

## 1. WHAT YOU HAND OVER (the package)

Claude Code's context = the repo. So the handover is a GitHub repo with this shape:

```
habit-game/
├── CLAUDE.md                  ← the rules file (provided) — Claude Code auto-reads it every session
├── docs/
│   ├── Stack_Architecture_Plan.md      (your existing file)
│   ├── HABITGAME_MVP_MASTER_PLAN.md
│   ├── VALIDATION_REPORT.md
│   ├── DESIGN_MOTION_SPEC.md
│   ├── HANDOVER_GUIDE.md               (this file)
│   └── PROGRESS.md                     ← living log; every session ends by updating it
├── prototype/index.html                 (the tested fun-loop prototype)
├── .claude/skills/                      ← COPY YOUR SKILLS HERE (build-kickoff, karpathy-guidelines,
│                                          ponytail, apple-design, emil-design-eng, github-hygiene, caveman)
└── .gitignore                           (node_modules, .env*, *.json service accounts, android/keystore)
```

**Why `.claude/skills/` goes IN the repo:** cloud sessions don't see your laptop's `~/.claude` folder. Anthropic's docs say it directly: to make your configuration available in cloud sessions, commit it to the repo. Committed skills + CLAUDE.md = every cloud session automatically has your full rulebook, even with your PC off.

One-time setup (10 min, on your PC or even from this Cowork session):
```
cd Desktop/Habit-game
git init && gh repo create habit-game --private --source=. --push
# copy docs in, copy skills from C:\Users\nikhi\.claude\skills\ into .claude\skills\
```

---

## 2. FULLY-CLOUD BUILDING — system closed, work continues

Three cloud layers, each independent of your PC:

### Layer 1 — Claude Code on the web (the builder)
Go to **claude.ai/code** (research preview on Pro/Max/Team). Connect GitHub → pick the `habit-game` repo → type a task → it runs in Anthropic's cloud sandbox. **Sessions keep running after you close the browser/laptop**, and you can watch or steer them from the Claude mobile app. Each session clones the repo, works on a branch, and opens a PR.

Configure once (web UI → environment settings):
- **Network access:** default allowlist is fine (npm, pip, GitHub reachable).
- **Setup script** (runs before every session): `apt update && apt install -y gh` plus `npm ci` if needed — output is cached across sessions.
- **Environment variables:** `.env` format. ⚠️ There is **no dedicated secrets store** — anyone who can edit the environment can see values. So: put only low-risk dev values here. Real secrets live in Vercel env vars (backend) and GitHub Actions secrets (builds); cloud coding sessions use the **Firebase emulator** (`firebase emulators:start`) for tests and never need production keys.
- Handy: `claude --teleport` pulls a cloud session down to your terminal later; `claude --cloud` pushes one up. Commits from web sessions carry a session-link trailer by default — your github-hygiene skill wants attribution off, so set `attribution.sessionUrl=false` in settings.

### Layer 2 — GitHub Actions (the factory)
Your PC never builds anything:
- **Android APK:** a workflow on every push to `main` runs Gradle in the cloud and uploads a debug APK as an artifact → you download it **on your phone** from the Actions page and install. (Later: fastlane → Play internal testing track, still all cloud.)
- **CI checks:** pytest for Flask, `node --check` + game-math tests, Firestore rules emulator test. PRs from Claude Code sessions can **auto-fix CI failures** — turn that on.
- **Web deploy:** connect the repo to Vercel once; every merge to `main` auto-deploys the Flask API + website. Zero manual deploys, ever.

### Layer 3 — Cowork cloud sessions (this — the strategist)
Keep using sessions like this one for research, validation, docs, and design reviews; they also run in the cloud and keep working when your laptop is closed. Division of labor: **Cowork = plan/validate/review artifacts · Claude Code web = write code in the repo · Actions = build/test/deploy.**

The only things that ever need your physical presence: installing the APK on your phone, judging gesture *feel* on-device, and Play Console button-clicks.

---

## 3. HOW TO RUN SESSIONS (the discipline that gets the best output)

**The golden loop — one session, one gate task:**
1. **Scope small.** "Gate 0: Capacitor shell + Firebase init + tokens.css" — not "build the app."
2. **Start every session with the same opening line:**
   > Read CLAUDE.md and docs/PROGRESS.md. Task: <one gate task>. Plan first — show me the plan and your assumptions before writing any code.
3. **Approve the plan, then let it run.** Close the laptop if you want — check the mobile app later.
4. **Demand evidence.** The session ends with: tests passing (shown), screenshots at 375px, PROGRESS.md updated. CLAUDE.md already requires this; hold the line if it drifts.
5. **Review the PR yourself on the phone/web.** Read the diff. Merge only green. Small PRs = reviewable PRs.
6. **Next session picks up from PROGRESS.md.** Never rely on chat memory between sessions — the repo is the memory.

**Prompting rules for better output (the ones that actually matter):**
- One task per message. Vague scope in = mush out.
- Say the constraint, not just the wish: "vanilla JS, no libraries, transform/opacity only, must match DESIGN_MOTION_SPEC §1 tokens."
- Ask for assumptions up front ("list your assumptions before coding") — kills 80% of wrong-direction work.
- Paste errors verbatim, whole. Never paraphrase an error message.
- When output is wrong, correct the *rule*, not just the instance ("never animate height — fix this and check the rest of the file for the same mistake").
- If a session gets confused/long, don't wrestle it — merge what's good, update PROGRESS.md, start fresh. Fresh context beats scrolled context.
- Parallelize independent tasks as separate cloud sessions (e.g., one on the Flask webhook route, one on tokens.css) — they run simultaneously; never let two sessions touch the same files.

**First session prompt (Gate 0 kickoff) — paste as-is:**
> Read CLAUDE.md and all files in docs/. Task: Gate 0 scaffold. 1) Create the repo layout from MASTER_PLAN §6.4 (api/ Flask per stack file, app/www/ with tokens.css from DESIGN_MOTION_SPEC §1, shared/game-math.js ported from prototype/index.html's tested XP/streak/level/mood functions with unit tests, web/ landing stub). 2) vercel.json for Flask. 3) GitHub Action: run pytest + game-math tests on every PR. 4) .gitignore for secrets/keystores. Do NOT add Capacitor yet. Plan + assumptions first; evidence of passing tests at the end; finish by creating docs/PROGRESS.md.

Then Gate 0b: "Add Capacitor shell wrapping app/www, plus an Action that builds a debug APK artifact." Download the APK on your phone → you're testing a real app by week 1, PC closed.

---

## 4. WEEKLY RHYTHM (continuous iteration, all cloud)

- **Daily (10–30 min, often from phone):** review/merge PRs, fire the next session prompt, test latest APK.
- **Weekly:** one retention experiment max; triage tester feedback (Discord + in-app) into 3 session tasks; update the gate line in CLAUDE.md.
- **Per gate close:** re-run the DESIGN_MOTION_SPEC §8 checklist; tag a release so the Action builds a shareable APK for your 20 testers (Play closed testing takes over at Gate 1).
- **Monthly:** re-run the VALIDATION_REPORT §1 market scan; one content drop.

That's the whole machine: repo = memory, CLAUDE.md = law, gates = scope, PRs = quality valve, Actions = factory, phone = review desk. Your laptop is optional from here on.
