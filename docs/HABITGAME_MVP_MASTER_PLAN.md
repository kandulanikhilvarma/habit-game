# HABIT GAME — MVP MASTER PLAN
### Working title: **Kumo** (rename freely — shortlist in §3.6)
*Android app + website, built on your existing stack (Flask + Firebase + Vercel + vanilla JS).*
*This document is written to be fed directly to Claude Code / AI coding tools as project context, alongside your `Stack_Architecture_Plan.md`.*

---

## 0. THE ONE-PARAGRAPH VISION

A game you don't play — your life plays it. Every real habit you complete feeds a creature that grows, evolves, and builds a world. No manual tracking where automation can do it; one tap where it can't; zero taps wasted anywhere. The user opens the app not to log data but to *see what their discipline built* — and the analytics quietly show them exactly when, where, and why they succeed or slip. Retention comes from care (the creature), loss-aversion (streaks), and identity ("I'm the kind of person whose Guardian is level 40").

**North-star metric: D30 retention.** Every design decision below is judged against one question: *does this make someone still here on day 30?*

---

## 1. PROBLEM, INSIGHT, POSITIONING

**Problem.** Everyone wants habit systems; almost nobody sustains tracking. The tracking itself is friction, and the reward for tracking is a checkbox — emotionally zero.

**Insight.** The winners in this space each solved one piece:
- **Duolingo** → streaks + loss aversion + a character with feelings about your behavior.
- **Finch** → a pet you *care for*, so skipping feels like neglecting someone, not failing a task. Bootstrapped to ~$30M ARR on this mechanic, and their home-screen **widgets** (pet visible on the phone home screen) are a core retention driver.
- **Forest** → a single visual metaphor (tree grows/dies) that makes abstract effort concrete.
- **Habitica** → RPG stats, but suffers from friction (heavy manual entry) — proof that game-depth without frictionlessness churns.

**Your wedge — nobody combines all three:**
1. **Auto-verified habits** (Health Connect + screen-time APIs) — the game moves without the user logging.
2. **A creature + world that IS your habit state** — care-based, not task-based.
3. **Honest personal analytics** — the app tells you the truth about your patterns (best hour, failure triggers, trend lines), like a coach hiding inside a game.

**Positioning line:** *"Your habits are the controller."*

---

## 2. PRODUCT SHAPE — WHAT EXISTS AT MVP

Two surfaces, one codebase philosophy:

| Surface | What it is | Stack |
|---|---|---|
| **Android app** (primary) | The game. Creature, check-ins, auto-tracking, widget, notifications, analytics. | Same vanilla HTML/CSS/JS you write for web, wrapped in **Capacitor** (see §6.1 — this is the one approved deviation, and your frontend code stays 100% vanilla) |
| **Website** (secondary) | Landing page (convert visitors → installs), account page, and a read-only "world viewer" so users can share a public link to their creature/world. Later: full web companion. | Flask + Jinja + vanilla JS on Vercel, exactly your standard architecture |

Backend: **Flask API on Vercel + Firebase** (Auth, Firestore, FCM push). One backend serves both surfaces.

---

## 3. GAME DESIGN — CHARACTERS, WORLD, MECHANICS

### 3.1 Design philosophy (the rules that keep it fun for months, not days)

1. **Care, not chores.** The creature never says "you failed." It gets sleepy, dim, worried — states that pull compassion, not guilt. Punishment mechanics (Habitica's HP loss) drive short-term compliance and long-term churn. Loss aversion should live in *streaks*, not in the creature's suffering.
2. **The game rewards showing up, celebrates consistency, and never blocks progress behind luck.** Variable rewards (eggs, chests) are garnish, never the meal.
3. **Progress must be visible at a glance in <1 second.** Mood + world state = today. Evolution stage + world size = lifetime.
4. **Every reward maps to a real behavior.** No daily-login bonuses, no watch-an-ad energy. If the game moves, it's because life moved. This is the soul of the product — protect it.
5. **Respect the lapse.** Missing days is normal human behavior, not an edge case. Streak freezes, comeback arcs, and "welcome back" warmth are retention features, not weaknesses.

### 3.2 The creature system

**Starter choice (onboarding moment #1):** the user picks 1 of 3 starter creatures — the "Pokémon starter" effect creates instant ownership and identity. Each has a distinct personality expressed through animation and copy tone:

| Starter | Form | Personality | Habit-affinity flavor |
|---|---|---|---|
| **Kumo** | Cloud-spirit blob | Gentle, sleepy, soft-spoken | Mind habits (reading, meditation, journaling) |
| **Embr** | Small flame-fox | Energetic, playful, hypes you up | Body habits (workout, steps, sport) |
| **Moss** | Leaf-turtle sprout | Steady, calm, wise | Order habits (sleep, screen-time, cleaning) |

Affinity is *flavor only* (bonus XP when the matching habit category completes) — never a restriction. Users can rename their creature (name = attachment).

**Evolution: 5 stages, ~3 months of runway for an engaged user:**

| Stage | Name | Reached at | What visibly changes |
|---|---|---|---|
| 1 | Egg | day 0 | Cracks appear with first completions (instant feedback on day one) |
| 2 | Hatchling | ~day 3–5 | Eyes, movement, first sounds |
| 3 | Sprite | ~week 3 | Accessory slot unlocks, world plot #2 unlocks |
| 4 | Guardian | ~week 7–8 | Wings/crown, idle animations get grand, world weather |
| 5 | Radiant | ~month 3 | Aura, unique per-starter final form — the "prestige" screenshot people share |

Evolution timing is tuned so each stage lands *just before* the typical churn cliffs (day 3, week 3, week 8).

**Moods (computed from today's completion %):** Sleeping → Waking → Content → Happy → Radiant. Mood drives: creature animation set, ambient world lighting, widget image, and copy. The creature also has **micro-reactions**: it watches your finger, blinks, gets excited when you open the app after completing something (the app *knew* — because auto-tracking synced).

**The letter (weekly retention hook):** every Sunday evening the creature "writes" a short letter: warmest possible framing of the week's data ("You showed up 5 of 7 days. Tuesdays are hard for us — want to make Tuesday's habit smaller?"). This is analytics delivered as care. Finch-style, and it doubles as your weekly-recap push notification.

### 3.3 The world (kept minimal at MVP, expanded in v2)

The creature stands in a small **island/glade scene** that reflects lifetime progress: each habit maintained ≥7 days plants something permanent (tree, lantern, spring). Perfect days add fireflies for 24h. The world never decays permanently — neglect dims the lighting and pauses growth (a *paused* world reads as "waiting for you," a *ruined* world reads as "delete the app").

MVP scope: 1 biome, ~10 placeable elements, day/night cycle matching real local time. That's enough for the screenshot-share moment. Biomes 2–3, seasons, and visitors are v2.

### 3.4 Core mechanics (numbers to start with — tune with real data)

- **XP per completion:** `10 + min(streak, 15)` (streak makes consistency literally worth more), auto-verified habits get **1.5×** (rewards setting up integrations — your differentiator).
- **Perfect day:** +30 XP, confetti ceremony, firefly night in the world.
- **Levels:** cumulative curve `need(n) = 50 + 35(n−1)`; evolution at levels 3 / 7 / 12 / 20.
- **Per-habit streak** + **global streak** (any-habit day). Global streak is the flame in the header.
- **Streak freeze:** earned (not bought) — every 7-day run banks 1 freeze, max 2 held. Auto-applies on a missed day. This is Duolingo's single most effective churn-reducer, adapted to be earn-only so it stays honest.
- **Comeback arc:** after 3+ missed days, the creature is asleep under a blanket; first completion back triggers a genuinely warm wake-up ceremony + a "rekindled" badge. Never a guilt screen.
- **Eggs (variable reward, garnish):** perfect days occasionally (p≈0.25) drop a cosmetic egg → hatches into world decor or creature accessory. Cosmetic only, forever.

### 3.5 Habit model (what a "habit" is in this game)

Each habit = `{ name, icon, category(mind/body/order/custom), schedule(daily or specific weekdays), verification(manual | auto-source), target(optional: minutes/steps/count), reminder time(optional) }`.

Three verification tiers, all first-class:
1. **Manual** — one tap. Always available, never second-class.
2. **Manual + proof** — optional photo/note attached; builds a private journal ("memories") the creature references in letters.
3. **Auto** — bound to an integration signal (§5). Completes itself; the app celebrates *for* you via notification: "Embr felt those 8,000 steps 🔥".

**Anti-overwhelm rule enforced by UX:** onboarding allows max 3 habits (research and every competitor post-mortem agree: new users who add 8 habits churn). Cap total at 7 with a gentle "master these first" message.

### 3.6 Name shortlist (check trademark + domain before committing)

**Kumo** (cloud, JP) · **Habitat** (habit + habitat — strong but crowded) · **Emberling** · **Groa** (Norse growth goddess) · **Sprig** · **Lifeling**. Criteria: 2 syllables, works as creature species name, .app domain free, no Play Store collision.

---

## 4. ZERO-FRICTION UX + DESIGN SYSTEM

### 4.1 Friction budget (hard rules)

| Action | Max cost |
|---|---|
| Complete a habit (manual) | 1 tap from home screen **widget**, or 1 tap in-app |
| Complete via notification | 1 tap on notification action button (no app open) |
| Auto-verified habit | **0 taps** |
| Onboarding → first completed habit | < 60 seconds, ≤ 6 taps, account optional (anonymous Firebase auth; email linking later) |
| See today's status | 0 taps (widget) |
| Add a habit | ≤ 3 taps via templates ("Read · Workout · Sleep by 11 · Less Instagram…"), custom entry available |

**The widget is not optional — it's the #1 retention surface.** A 2×2 Android home-screen widget showing the creature's current mood + today's ring + tap-to-complete for the next habit. Finch's data shows widgets are their retention engine; users see their pet 50× a day without opening anything.

### 4.2 App structure: 3 screens, no hamburger menus

1. **Home (the game):** creature + world, today's quest list, streak flame, XP bar. 90% of sessions never leave this screen.
2. **Journey (analytics):** §4.4.
3. **You:** habit management, integrations, creature customization, settings, feedback button.

### 4.3 Motion & sound design principles

**Motion (the "juice" spec):**
- Every state change animates; nothing pops. Durations 150–300ms; spring/overshoot easing (`cubic-bezier(.22,1.4,.36,1)`) for rewards, ease-out for navigation.
- **Squash & stretch** on the creature for all reactions (the Disney principle that makes 2D shapes feel alive).
- Reward sequence on completion (total ~1.2s, skippable by scrolling): check fills → XP number floats from tap point → creature hops → streak flame ticks. Perfect day adds confetti + world fireflies.
- Idle life: creature bobs, blinks every 3–6s, occasionally glances around. An alive idle screen is what makes people open the app "just to look."
- Respect `prefers-reduced-motion`; all animations CSS/transform-based (GPU, 60fps on cheap Android).

**Sound (soft, layered, never annoying):**
- Palette: soft marimba/kalimba chimes, nature ambience. **No casino sounds.**
- Completion chime rises in pitch with each habit done that day (C→E→G→C) — musical progress you can *hear*.
- Distinct signature sounds: level-up (3-note), evolution (6-note), perfect day (chord).
- Creature makes tiny species-specific sounds when petted.
- Sound off by default in-app until first completion moment (ask "Kumo wants to make sounds — okay?" — opt-in framing), always respect system silent mode. Haptics: light tick on tap, success pattern on completion (Capacitor Haptics plugin).

**Visual system:**
- Dark, cozy, night-sky base (`#0d1022` family) with mint→violet accent gradient; the world scene provides the color. Light mode later (dark first = OLED battery + cozy feel).
- Typography: one variable font (e.g., Nunito — rounded = friendly), 3 sizes only.
- Creature art: SVG vector (crisp at every size, tiny payload, animatable parts). Style: round, big-eyed, 2-tone + highlight — consistent and cheap to produce variants. If/when budget allows, commission a sprite/rive artist for v2 polish; SVG art from AI + hand-tuning is fully adequate for MVP.

### 4.4 Analytics FOR the user (the "Journey" screen)

This is your second differentiator — most habit games hide the data; you're a coach inside a game:

1. **Year heatmap** (GitHub-style) per habit and overall — the "don't break the chain" visual.
2. **Time-of-day success curve** — "You complete workouts 82% of the time before 9am, 31% after 6pm." Computed from completion timestamps; this insight alone changes behavior.
3. **Per-habit success rate** (7/30/90-day) with trend arrow, honest reds included.
4. **Best-conditions insights** (rule-based at MVP, no ML needed): weekday vs weekend split, habit-pairing ("on days you meditate, workout completion is +40%"), current vs best streak.
5. **Weekly letter** (§3.2) delivering the top insight in creature-voice.
6. **Goal linkage:** every habit optionally attaches to a written goal ("Why: pass GATE 2027"); the goal shows progress = days invested. Answers "is this getting me anywhere?"

---

## 5. INTEGRATIONS — AUTOMATIC HABIT VERIFICATION (Android-first)

Priority order (build top-down; each is a Capacitor plugin boundary in `services/`):

| # | Source | What it auto-verifies | How | Effort |
|---|---|---|---|---|
| 1 | **Health Connect** | Steps, sleep duration/time, exercise sessions, mindfulness minutes, water (if user's other apps log it) | `capacitor-health` plugin (mley) or `Cap-go/capacitor-health`; on-device permission UI; **Google Fit APIs shut down Dec 31 2026 — do not touch them, Health Connect only** | Medium — do first, it covers fitness+sleep in one API |
| 2 | **UsageStatsManager** (screen time) | "≤30 min Instagram", "no phone after 11pm", "≤2h total screen time" — *negative habits, the hardest to track manually and your most unique feature* | `Cap-go/capacitor-android-usagestatsmanager`; needs special `PACKAGE_USAGE_STATS` permission (user grants in Settings; Play requires a sensitive-permission declaration — approved use cases include digital-wellbeing apps, which you are) | Medium |
| 3 | **Notification-time check-ins** | Anything: reminder notification carries ✓ action button → completes without opening app | Capacitor Local Notifications | Small — ship in Phase 1 |
| 4 | **Google Calendar** (read) | "Attended gym class" (event kept, not deleted), study blocks | Google Calendar API via existing Firebase auth OAuth | Small-medium, Phase 2/3 |
| 5 | **Webhook/API in** | Power users: anything can complete a habit via `POST /api/v1/complete` with token (IFTTT/Tasker/Zapier-friendly) | Plain Flask route | Tiny — cheap superpower, great for the dev/productivity community |

**Rules for all integrations:** verification runs on **app-open + widget-refresh + a periodic WorkManager sync (15-min minimum)** — near-real-time is fine, real-time is unnecessary. When an auto-habit completes, notify with delight, not silence. If a source disconnects, the habit falls back to manual gracefully — never a dead habit. Screen-time habits evaluate at day-end (23:59) with a "on track / at risk" live indicator during the day.

**Privacy stance (put this in onboarding + website):** health/usage data is read on-device to check *your own* habit rules; only the resulting completion events + aggregates sync to the cloud. Raw health data never leaves the device. This is both ethical and your Play-review armor.

*(iOS later: HealthKit is fine; Screen Time API is heavily restricted — plan iOS as manual+HealthKit only, don't promise screen-time parity.)*

---

## 6. TECHNICAL ARCHITECTURE (your stack, extended minimally)

### 6.1 The one deviation, argued honestly

Your frontend policy is vanilla HTML/CSS/JS, no frameworks — kept. But a Play-Store app with Health Connect, UsageStats, widgets, and notifications **cannot be a website**; it needs a native container. **Capacitor** is that container, not a framework: your UI remains the same vanilla JS you'd write anyway; Capacitor packages it in an Android WebView and exposes native APIs as `import`-able plugins. The alternatives are worse for you: Kotlin-native = new language + two codebases; React Native/Flutter = framework lock-in violating your policy; PWA = no Health Connect, no UsageStats, no widget → no product. The only Kotlin you'll ever touch is the home-screen widget (~200 lines, Glance API, AI-writable) and possibly small plugin glue.

### 6.2 System diagram

```
┌─ Android app (Capacitor shell) ─────────────┐      ┌─ Website (Vercel) ──────────┐
│ www/ = vanilla HTML/CSS/JS (shared bundle)  │      │ Flask + Jinja + vanilla JS  │
│ game.js  habits.js  sync.js  fx.js          │      │ landing / share / account   │
│ plugins: health, usagestats, notifications, │      └──────────────┬──────────────┘
│          haptics, widget-bridge (Kotlin)    │                     │
│ local store: IndexedDB (offline-first)      │                     │
└──────────────┬──────────────────────────────┘                     │
               │ Firebase JS SDK (Auth + Firestore w/ offline)      │
               ▼                                                    ▼
┌─ Firebase ────────────────────────────┐   ┌─ Flask API on Vercel (/api) ─────────────┐
│ Auth (anonymous → email/Google link)  │   │ routes/: habits, sync, insights, webhook │
│ Firestore (source of truth)           │◄──┤ services/: firebase_client, fcm_client   │
│ FCM (push: letters, streak-at-risk)   │   │ insights.py: rule-based analytics        │
└───────────────────────────────────────┘   │ cron (daily, Hobby tier): weekly letter, │
                                            │  aggregates; cron-job.org for hourly     │
                                            └──────────────────────────────────────────┘
```

**Key decisions:** offline-first (game must work in airplane mode — Firestore SDK's offline persistence gives this nearly free; all game math runs client-side, server recomputes aggregates for trust). Flask stays thin per your rules: it exists for FCM sends, webhook ingest, letter generation, and server-side aggregation — not for gameplay.

### 6.3 Firestore data model (v1)

```
users/{uid}: { name, creature:{species,name,stage,xp}, gStreak, gBest,
               freezes, settings, tz, createdAt }
users/{uid}/habits/{hid}: { name, icon, category, schedule[], verification,
               autoSource?, target?, reminder?, streak, best, total, createdAt }
users/{uid}/completions/{yyyy-mm-dd_hid}: { hid, date, ts, source(manual|auto|notif|webhook),
               xp, proof? }        ← one doc per completion = analytics raw table
users/{uid}/days/{yyyy-mm-dd}: { done, total, perfect, xpEarned }   ← daily rollup
users/{uid}/world/{itemId}: { type, earnedBy, placedAt }
feedback/{id}: { uid?, text, screen, version, ts }
```

Completion timestamps power every §4.4 insight with plain queries — no ML infra.

### 6.4 Repo layout (mirrors your standard)

```
habit-game/
├── api/                    # Flask on Vercel — your exact standard layout
│   ├── index.py  routes/  services/  models/schemas.py  logger.py
├── app/                    # Capacitor project
│   ├── www/                # vanilla JS game UI (the real product)
│   ├── android/            # generated; + widget/ Kotlin (only native code)
│   └── capacitor.config.ts
├── web/templates/ static/  # marketing site + share pages (Flask-served)
├── shared/                 # game-math.js used by app and web viewer
└── vercel.json  requirements.txt
```

Costs at MVP scale (≤5k users): Firebase Spark/low Blaze + Vercel Hobby + Play one-time $25 ≈ **near-zero monthly**.

---

## 7. ROADMAP — CONTINUOUS BUILD WITH GATES

You chose continuous iteration — right call. Structure it as **capability gates** (ship when exit criteria pass, not when the calendar says), reviewed weekly:

**Gate 0 — Foundation (≈2 wks):** repo, Firebase, Capacitor hello-world on your phone, design tokens, creature SVG set for stages 1–2, Firestore rules. *Exit: you complete a manual habit on your own phone and XP persists offline→sync.*

**Gate 1 — The Loop (≈3 wks):** 3 screens, starter choice, manual habits + templates, streaks/freezes, reward juice + sound, notifications with ✓ action, day rollover + comeback state. **Start Play closed testing immediately** — the 12-testers/14-days clock (Play's requirement for new personal accounts before production access) runs *while you keep building*. Recruit ~20 friends (buffer above 12). *Exit: 14 testing days elapsed, D7 ≥ 40% among friends, zero data-loss bugs.*

**Gate 2 — The Magic (≈3 wks):** Health Connect (steps/sleep/exercise) + UsageStats (screen-time habits) + home widget + Journey screen v1 (heatmap, success rates, time-of-day). This is when the product becomes *yours* and not a Finch clone. *Exit: an auto-habit completes with zero taps on 3 testers' phones; widget survives Android battery optimization.*

**Gate 3 — The World & Public (≈3–4 wks):** world scene + plantings, evolution stages 3–5, weekly letter + FCM, share page on website (`kumo.app/u/rudra` → world snapshot), feedback widget in-app, landing page + Play production listing. *Exit: public on Play Store; community posts live (r/getdisciplined, r/androidapps, X build-in-public thread).*

**Continuous after Gate 3 — the version-advancement engine:**
- **Weekly:** triage in-app feedback + reviews; ship one retention experiment (change one number/one animation/one message), watch D1/D7/D30 cohort curves in Firebase Analytics.
- **Monthly:** one content drop (new world items/accessories/creature) — content cadence is what keeps month-3 users.
- **Instrument from day one:** events `habit_completed{source}`, `widget_tap`, `streak_broken`, `freeze_used`, `integration_connected`, `letter_opened`, `app_open{trigger}`. Retention analysis needs history you can't backfill.
- **v2 candidates (only after D30 data, pick by evidence):** friends' worlds visiting each other, duo streaks, iOS, streak-repair quests, premium cosmetics + advanced insights (₹/month, cosmetic-and-insight only — never pay-to-progress), Tasker/IFTTT gallery.

**Feedback machinery (friends + communities):** a private Discord/WhatsApp for the first cohort (bug reports + screenshots of their creatures = free art direction feedback); in-app 2-tap feedback button (`feedback/` collection); a pinned "what should Kumo learn next?" vote. Ask testers weekly, one question only: *"What almost made you stop opening it?"* — churn-cause beats feature-wishlist every time.

---

## 8. RISKS & HONEST WARNINGS

| Risk | Reality | Mitigation |
|---|---|---|
| **Scope spiral** | A game invites infinite art/feature ideas | Gates + the friction budget are law; anything not on a gate's exit list goes to the v2 list |
| Play sensitive-permission review (usage stats) | Real but passable for wellbeing apps | Honest declaration + privacy page + on-device processing story (§5); ship Health Connect first if delayed |
| WebView performance on cheap Androids | The #1 Capacitor failure mode | Transform/opacity-only animations, SVG not canvas, test on a ₹8k phone from Gate 0 |
| Cheating (fake taps) | Certain, and mostly fine | Ignore at MVP (single-player); matters only when social lands — then trust auto-verified habits more |
| Creature art quality | Attachment dies if it looks cheap | Nail ONE creature's full animation set before making three; cut starters to 1 if needed — depth beats breadth |
| Vercel 10s function timeout | Letter/aggregate jobs could exceed it | Aggregate per-user in chunked cron calls; heavy math belongs client-side anyway |
| You, solo, burning out | The real killer of solo products | The gates are small on purpose; ship Gate 1 to friends fast — external energy funds internal energy |

---

## 9. WHAT TO DO MONDAY MORNING (first 5 concrete tasks)

1. Pick the name (§3.6) → grab .app domain + create Play developer account ($25, verification takes days — start now).
2. `npm init @capacitor/app` + add the Android platform → run the empty WebView shell on your own phone (de-risks the whole architecture in 2 hours).
3. Create the Firebase project (Auth anonymous + Firestore + rules from §6.3).
4. Port the existing HTML prototype's game loop into `app/www/` as the Gate-1 skeleton — the fun-loop math (XP, streaks, moods, evolution) is already written and tested; it becomes `shared/game-math.js`.
5. Message 20 friends: "I'm building a game your habits control — want in on the beta?" Their yes/no is your first datapoint.

*Prototype note: the Kumo HTML file from our earlier session is the playable spec for §3's feel — reward timing, mood states, streak math are all live in it. Reuse the code directly.*
