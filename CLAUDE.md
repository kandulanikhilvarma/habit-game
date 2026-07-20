# CLAUDE.md — Habit Game project rules
*Claude Code reads this file automatically every session. These rules are LAW for this repo. Project docs override generic best practices; this file overrides habit.*

## Read order (once per session, before any code)
1. `docs/Stack_Architecture_Plan.md` — my stack, approved swaps, Vercel constraints. NEVER deviate without asking.
2. `docs/HABITGAME_MVP_MASTER_PLAN.md` — what we're building, data model, gates.
3. `docs/VALIDATION_REPORT.md` — the 3 GO-conditions (branching evolution, screen-time hero positioning, compliance items).
4. `docs/DESIGN_MOTION_SPEC.md` — tokens, motion values, checklists. All UI work must match it exactly.
5. `docs/HANDOVER_GUIDE.md` — session workflow and current gate.

## Current state
- Active gate: **Gate 1** (update this line as gates close). Gate 0's build is done and merged, but its exit criterion is still open: nobody has run the APK on a phone. Nothing animated or audible has been verified since the Gate 0 scaffold — the browser pane used for verification has a frozen frame clock.
- Game math lives in `shared/game-math.js`, tested by `shared/game-math.test.js` (`npm test`). It is the single source of truth for XP, levels, stages, moods and streaks — change the numbers there and nowhere else. `app/www/game-math.js` is a generated copy (`npm run sync:shared`), never edit it.
- There is no `prototype/index.html`; the math was written from MASTER_PLAN §3.4 directly.

## Stack (hard constraints — repeat of the stack file's core)
- Frontend: vanilla HTML/CSS/JS only. No React/Vue/Tailwind/jQuery. Narrow-purpose CDN lib allowed only for one specific feature, loaded on the one page that needs it — ask first.
- App shell: Capacitor (Android). The ONLY native code allowed is the home-screen widget (Kotlin/Glance) and plugin glue.
- Backend: Flask on Vercel (`api/` layout: thin routes/, services/ for every external integration, Pydantic schemas for anything AI- or user-supplied). Firebase = Auth + Firestore + FCM.
- Vercel Hobby limits: 10s function timeout, no background workers, no file logging (stdout only), cron daily max.
- Health data: Health Connect ONLY (Google Fit APIs die Dec 2026). Raw health/usage data never leaves the device — only derived completion events sync.

## Engineering rules (karpathy + ponytail, inlined so they apply even without skills installed)
1. Think before coding. State assumptions; if two interpretations exist, present both — never pick silently. If something is unclear, stop and ask.
2. Minimum code that solves the problem. No speculative abstractions, no unused flexibility, no error handling for impossible cases. The ladder: does it need to exist → stdlib → platform-native (CSS over JS, Firestore rule over app code) → existing dependency → one line → only then write code.
3. Surgical diffs. Touch only what the task names. Don't refactor working code, don't "improve" adjacent lines. Every changed line must trace to the request.
4. Goal-driven: before building, state the verifiable success criterion; after building, PROVE it (run the test, show the output, screenshot the UI). Never claim done without evidence.
5. One file = one responsibility. Never `eval`/`exec` on model output. Secrets only in env vars.

## Design rules (the short version — full spec in DESIGN_MOTION_SPEC.md)
- Animate `transform`/`opacity` only. `transition: all` banned. `ease-in` banned. No `scale(0)` entries. UI motion <300ms; overshoot curve only on reward beats.
- CSS transitions (interruptible) over keyframes for anything re-triggerable.
- No emojis as UI chrome icons — inline SVG (Lucide). Emojis only as user-chosen habit glyphs.
- Touch targets ≥44px. Muted text ≥4.5:1 contrast. `prefers-reduced-motion` handled on every animation.
- Every pressable element gets `:active { transform: scale(0.95–0.98) }` feedback.

## Git & sessions
- Branch per task: `gate0/setup-firebase`, `gate1/sheet-gesture`. Small commits, imperative messages, NO AI co-author trailers or attribution in commits or PRs.
- Never commit: `.env*`, service-account JSON, keystores. (`.gitignore` enforces; don't fight it.)
- End every session by updating `docs/PROGRESS.md`: what shipped, what's verified, what's next, any open question. Next session starts by reading it.
- Don't merge to `main` with failing checks. `main` must always deploy clean on Vercel.

## Verification before "done" (each task)
- Logic: run it (pytest for Flask, node for game-math, Playwright for UI where feasible in-session).
- UI: screenshot at 375px width; check the DESIGN_MOTION_SPEC §8 checklist.
- Data: Firestore rules changes require an emulator test proving another uid is denied.
- If it can't be verified in the cloud session (on-device gesture feel, widget, Health Connect), say so explicitly and add it to `docs/PROGRESS.md` under "needs on-device test" — never mark it verified.
