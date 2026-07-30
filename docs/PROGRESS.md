# PROGRESS

Living log. Every session ends by updating this file; every session starts by reading it.

---

## 2026-07-30 — PROJECT PARKED: web product complete, Android differentiator not started

Owner is moving to other projects. This entry is the handoff. Read it first.

### What is done and live
The whole product that can exist without an Android device is shipped, tested and deployed on Vercel:

- **Loop:** onboarding (max 3 habits), habit sheet with templates, tap-to-complete, edit and hold-to-delete, XP/levels/stages, per-habit and global streaks, earned streak freezes, comeback arc with a warm wake-up.
- **Creature:** six starters with real art, branching evolution across five tiers with a distinct picture at every tier (starter, lineage, Guardian, Radiant), attunement bars, rename, change species.
- **Journey:** heatmap, success rate, trend, best-hour insight, weekday/weekend split, rule-based weekly letter.
- **World:** the glade grows a permanent planting per habit kept 7+ days, day/night light, perfect-day fireflies, dims (never ruins) on neglect.
- **Growth:** the Habit DNA share card — a 9:16 PNG through the OS share sheet.
- **Account:** anonymous by default, Google sign-in that links progress, offline-first with cloud reconcile, export, delete.
- **Backend:** Flask on Vercel, `/api/health`, the completion webhook, Pydantic validation, pytest.
- **Compliance:** privacy policy and account-deletion pages with a real contact address.
- **Quality:** `npm test` 75/75, pytest green, Firestore rules emulator test proving another uid is denied, CI on every PR, no AI attribution in history.

### Parked: what Android needs (do not start this in a cloud session)
This is the actual differentiator and none of it exists. It needs a physical Android device, Android Studio, and a Play Console account (one-off $25). Rough order:

1. **Health Connect** — add the plugin, request the read permissions, map steps/sleep to habit completions. Health Connect only; the Google Fit APIs die Dec 2026.
2. **UsageStats** — screen-time reading is a special permission (`PACKAGE_USAGE_STATS`) with its own consent screen and a Play policy declaration. This is the "using Instagram less makes something grow" mechanic, and it is the single highest-value item left.
3. **The 2x2 widget** — Kotlin/Glance. MASTER_PLAN calls it the #1 retention surface, not optional.
4. **FCM** — reminders that survive the app being closed.
5. **Play listing** — signing key, store assets, data-safety form (the privacy policy and deletion URL already exist and are live).

Constraint that still holds: raw health and usage data never leaves the device. Only derived completion events sync.

### Known issues left open (deliberately)
- At 375x667 the Home screen is ~50px taller than the viewport, so it scrolls and the sticky tab bar overlaps the quest list mid-scroll. Cosmetic; fixing it properly needs visual verification on a device.
- Motion has never been verified anywhere. The check-in beat, fireflies, aura and wake-up ceremony are code-reviewed against DESIGN_MOTION_SPEC but nothing has watched them run.
- Nothing has been run on a phone at all. The Gate 0 exit criterion (install the APK, complete a habit, prove offline to sync) is still open.
- Deliberate simplifications are marked `ponytail:` in the source: no undo on a completed habit, unbounded local log, lineage art as overlay rather than per-species redraws.

### Device knowledge worth keeping (salvaged from an abandoned log branch)
Hard-won on a real phone; none of it is obvious from the code:
- **`touch-action: none` on the sheet blocked native scroll**, so on any viewport where the sheet overflowed, the submit button sat below the screen with no way to reach it. Fix was `touch-action: pan-y` with the drag moved to the handle only. Synthetic tests missed this because they clicked the button directly.
- **iOS gates WebAudio on the hardware mute switch** — the ringer must be physically on or there is no sound, no matter what the app does. The audio context also has to be primed from a real user tap.
- **Haptics are a no-op in iOS Safari.** They only work in the native shell, so anything relying on them needs a visual fallback on web.

### If picking this up again
Start by reading this entry, then `docs/HABITGAME_MVP_MASTER_PLAN.md` section 5 for the integration design. The web app is not a prototype to throw away — it is the shipping frontend; the Android work adds native verification underneath it.

---

## 2026-07-30 (later still) — Guardian tier, new logo, and a glade anchor fix

### Glade anchor (PR #43)
Chasing a phone report about the grass and the creature's base. Nothing clipped at 375x667 or 390x844 and `aspect-ratio` turned out to be irrelevant (the SVG's viewBox ratio already sizes it), but there was a real fragility: the glade used `top: 73%` against `.creature-plot`, **a nested grid sized by its content**. A percentage `top` resolves against the parent's height, so on any engine resolving that as zero — the WebKit behaviour that blanked Home in Gate 0 — `73%` becomes `0` and the ground jumps up behind the creature.

Fixed by removing every dependency on a parent resolving a height: `.creature-plot` carries an explicit `clamp()` size, the glade offsets by a share of **its own** height via `transform`, and `.glade svg { height: auto }` takes the height from the viewBox. Measured after: island arc 17-20px above the creature's base at both phone sizes, 3 plants, no overflow. **Not proven on iOS Safari** — this removes the known fragility, it does not confirm the device symptom is gone.

### Guardian tier (PR #44)
Stage 4 reused the stage-3 picture — the same "label changes, image doesn't" defect fixed one tier down earlier the same day. Each lineage now has a Guardian form, so the ladder is four distinct pictures: starter (2) -> lineage (3) -> Guardian (4) -> shared Radiant (5). The stage-4 aura stand-in shipped in #43 is removed.

### Logo -> moth-sage Guardian
Was the ember-beast; the user preferred the moth Guardian and asked me to decide. It holds up on both counts that matter: its violet **is** `--violet #9d7bff` (the ember's orange never was), and the symmetrical wing silhouette survives 32px. The rune halo does not — it collapses to a grey blob — so the favicon crops the halo and keeps the wings, while the in-app art keeps it. Candidates were rendered at 32px and 48px and compared before choosing.

### Asset processing lesson
This batch arrived on a **darker** checkerboard (greys 79/120) with wide glows, and the previous key left grey patches inside every glow. Two failures worth remembering:
1. A "smart" un-composite (solving alpha from the checker's periodic contrast) **destroyed the art** — internal detail at the sample distance reads as checker contrast, so creature interiors went transparent. Reverted.
2. What worked was measuring the two pixel populations instead of guessing: halo/checker at saturation <=85 and brightness <=155, creature core at 158/237. Keyed on that band, border-connected. Clean alpha, glows intact.

### Verified in this session
- Full ladder in the browser: xp 60->`sol`, 400->`sol`, 1600->`moth`, 3000->`moth-guardian`, 8000->`radiant`; four distinct keys, all 200.
- Favicon 200, linked relatively so it also resolves in the Capacitor WebView.
- Contact sheets of the Guardians on the app background — no residue.
- `npm test` 75/75, including a new guard walking every species x stage x lineage and asserting the art key has a file on disk (a mistyped key is a broken image no mapping test would catch).

### Still open
- At 375x667 Home is ~50px taller than the viewport, so it scrolls and the sticky tab bar overlays the quest list. Untouched.
- On-device pass on all of the above.

---

## 2026-07-30 (later) — Glade fixed, evolution made visible, brand mark chosen

### The glade bug (PR #41)
Reported from a phone screenshot: a hard navy block behind the creature, on every creature. Two separate causes, both mine:
- `world.js` hardcoded dark hex, so in **light theme** the ground was a slab. Colours now come from themed CSS variables (`--world-ground`, `--world-rim`, `--world-leaf*`, `--world-shade`). The SVG is injected inline, so `var()` resolves against the page and the scene re-tints on the theme toggle with **no JS**.
- `.glade` was anchored to the bottom of the **scene**, so it sat behind the *name text* instead of under the creature's feet. New `.creature-plot` wrapper anchors it to the creature's own box.

Also: the full-width hill band became a soft island with a **radial fade on every side**, and the stray pale dot (a day/night orb) became a low horizon glow. Plantings are larger with contact shadows.

**Lesson worth keeping:** my first fix replaced the slab with a solid ellipse and it read as a *plate* the creature stood in front of. Fading only downward isn't enough — ground needs to fade on every side. I only caught it by rendering and looking, which is the whole argument for the render-and-decode loop below.

### Evolved forms (PR #42)
Stage 3+ was still showing the stage-2 picture, so evolving changed the label and nothing else — and branching evolution is a GO-condition. Now, via one `artKeyFor(species, stage, lineage)`:
- stage 1 → procedural egg SVG (unchanged; `fx.js` animates the cracks)
- stage 2 → the starter you picked
- stage 3–4 → the lineage the habits chose (ember-beast · moth-sage · sentinel · prismatic)
- stage 5 → a shared **Radiant guardian** every branch grows into

Home, the starter picker and the share card all read that one function so they can't disagree. The user supplied 5 images for 4 branches; the extra (a mossy grove guardian) became the universal Radiant form — **their call, chosen over adding a 5th branch, specifically to avoid changing the tested game math**.

### Brand mark
The **ember-beast** is the logo (user's pick over prismatic). Favicon on the app shell and all four marketing pages — there was **no favicon at all** before — plus the welcome-screen mark and a hero mark on `/about`. Single `LOGO_CREATURE` constant in `creature.js`, so swapping it is one line.

### Verified in this session (rendered and looked at)
- Light and dark glade: soft ground, no slab, name and stage tag legible. New user (no plantings, no streak): clean dimmed ground, reads as "waiting", not broken.
- Stage-3 Home with an order-dominant habit set: the crystal sentinel in the glade, labelled "Sentinel Sprite" — starter was **Sol**, so the branch genuinely overrode the species.
- Share card for the same state: sentinel inside the heat ring, cyan "Sprite · Sentinel line".
- XP→art progression: 60/300/700→`sol`, 1600/3000→`sentinel`; every referenced file 200.
- No horizontal overflow at 375px, no console errors. `npm test` 73/73. CI green on both PRs.

### How to see anything in this environment (the workaround that made the above possible)
`computer screenshot` fails — the Browser pane doesn't composite frames. The way around it: build the thing on a canvas in the page (rasterise the inline SVG with `var()` substituted from `getComputedStyle`, `drawImage` the creature PNG at its measured `getBoundingClientRect()`, draw the text with its computed font), `toDataURL`, then let the oversized tool result spill to a file and decode that file to a PNG with Python and Read it. Keep the canvas under ~400×700 or the base64 is too big even for the file path. This is the only visual feedback loop that works here — use it instead of claiming motion/looks are verified.

### Next
- On-device pass: Home with the evolved forms, the glade, the share sheet, motion feel.
- Optional art: stage 4 (Guardian) reuses the stage-3 lineage picture — 4 more images would make stage 4 distinct.
- Everything else remaining is Android-native / next-phase: Health Connect + UsageStats auto-verification (the actual differentiator), the widget, FCM, Play listing.

---

## 2026-07-30 — The creatures got real art

### Shipped (PR #40)
- Hand-made character art for all six starters (kumo, embr, moss, aqua, sol, nyx), replacing the placeholder procedural blobs. This was the weakest thing in the demo.
- `creatureArt(species)` in `app/www/creature.js` returns an `<img>`; the **awake, hatched** creature (stage 2+) uses it on Home, in the starter picker, the welcome mark, and the share card.
- The **egg** (stage 1) and the **asleep/wake ceremony** deliberately stay procedural SVG — `fx.js` animates their inner parts (egg cracks, blanket slide-off), which an image can't do.
- Idle **bob** and the check-in **hop** retarget to `.creature-art` (fx.js falls back from `#body-group`); `prefers-reduced-motion` stills it.
- Share card inlines the art as a **base64 data URL** — an external `href` in an SVG `<image>` taints the canvas and kills the PNG export.

### Art pipeline (repeatable — worth remembering)
The user generated art from two tools with two different problems. Both were fixed with a throwaway PIL script (in the session scratchpad, not committed):
- 4 ChatGPT images sat on a smooth dark radial gradient → **region-growing flood** from the border. It follows the gradient (and the stage glow, which is just more gradient) and stops at the creature's hard outline. embr initially got eaten because the flood walked along its dark outline into its dark-but-coloured belly; fixed with a **saturation guard** (`sat <= 45`) so coloured pixels can't join the background.
- 2 Gemini images had a **fake, opaque checkerboard** background (not real alpha). A gradient flood can't bridge the two checker greys, so alternating squares survived. Fixed with a **neutral-membership key**, border-connected: a pixel is background if it is light and unsaturated. Border-connected matters — it keeps the creature's own eye-white highlights, which are islands.
- Then trimmed to content, padded to a centered square with 7% headroom, resized to 512px. All six: ~1.1 MB total (down from 2.4 MB at 768px).

### Verified in this session (these I could actually see)
- Rendered the finished share card with embr's art embedded and looked at it: creature sits inside the heat ring, "Sprite · Ember-beast line" in ember-orange, stats right. Rasterises to a valid ~2 MB PNG, **no canvas taint**.
- Contact sheet of all six composited on the app background (`#0d1022`): clean keys, no halos, no leftover boxes, reads as one family. Caught and fixed the embr and aqua/nyx failures this way — the dark composite is what exposed them.
- Starter picker: 6/6 art images load with the right `src`.
- `npm test` 64/64. CI green on #40 (js · python · rules), squash-merged.

### Not verified — motion and device
- The bob/hop on the image, and how the art sits at real phone sizes. The pane doesn't composite frames, so structure and load are proven; motion is not.
- Still open from before: on-device pass on the glade, and the card's "world silhouette" (DESIGN_BRIEF #5) left off deliberately rather than positioned blind.

### Next
- On-device visual pass: Home with art + glade, the share card in the OS share sheet, motion feel.
- Everything else remaining is Android-native / next-phase: Health Connect + UsageStats auto-verification (the actual differentiator), the widget, FCM, Play listing.
- Art gap: only stage 2+ has art. Stages 3–5 (Sprite/Guardian/Radiant) still reuse the stage-2 image, so evolution changes the *label* but not the picture. Branching evolution is a GO-condition — per-stage art is the next art ask.

---

## 2026-07-29 — Habit DNA share card + world scene (the last two web features)

### Shipped
- **Habit DNA share card** (PR #38, VALIDATION_REPORT §6 upgrade 3 / DESIGN_BRIEF #5). `app/www/dna.js`: `dnaCardSvg(state)` builds a self-contained 9:16 SVG — creature portrait, lineage/stage tag, day-N streak flame, level, quests done, and a heat ring of the last 84 days. `shareCard(state)` rasterises it to a PNG and offers the OS share sheet with a download fallback. "Share your creature" button on the You screen. This is the referral loop.
- **World scene in the glade** (PR #39, MASTER_PLAN §3.3). `app/www/world.js`: `worldSvg(state, {now})` grows the creature's world from lifetime progress — each habit kept ≥7 days plants a permanent tree (mind) / lantern (body) / spring (order), cap 10; sky and hills tint to the local clock; lanterns glow at night; a perfect day adds fireflies; neglect (no live global streak) dims the light and pauses growth without ruining the scene. Rendered into `#glade` each frame.
- Both are covered by node tests (`dna.test.js`, `world.test.js`); a `pretest` sync now runs before `npm test` so the generated `app/www/*.js` copies exist when the new tests import them in CI.

### Verified in this session
- `npm test` → 64/64 pass (was 55; +4 card, +5 world).
- DNA card renders the real data live: name, `Lv 7`, `42` streak, `135` quests, `Sprite · Moth-sage line`, `viewBox 0 0 1080 1920`. Heat ring reflects the log (57 lit + 27 dim of 84 with a dense log; 0 with an empty log). SVG→canvas→PNG produces a valid 1.78 MB `image/png` blob — no canvas taint, so `navigator.share({files})` will have a real file on iOS/Android.
- World logic live: 4 habits ≥7 days → 4 plantings, a 3-day habit plants nothing, capped at 10; lantern lit at 23:00 and dark at noon; perfect day → 6 fireflies vs 0 ordinary; neglected → scene at 0.55 opacity, plantings intact, no fireflies.
- CI green on both PRs (js · python · rules), squash-merged to main.

### Not verified — visual, not logic (the standing rule)
- How either actually *looks*, and the firefly drift motion: the Browser pane isn't compositing frames this session, so I confirmed SVG structure + data + day/night/planting logic, not the render. Both need an eyeball on a phone.
- DESIGN_BRIEF #5 lists a "world silhouette" as a card element. Left off the card deliberately — placing the world band under the creature well needs eyes I don't have here; do it in the on-device visual pass rather than tune it blind.
- Creature art is still the Gate 0 placeholder SVG (owner: user, via claude.ai/design). The card and world are only as strong as the creature in them.

### Next
- On-device visual pass on the card and glade (positioning, the silhouette-on-card, firefly feel).
- Everything else remaining is Android-native / next-phase: Health Connect + UsageStats auto-verification (the actual differentiator), the home-screen widget, FCM, Play listing.

---

## 2026-07-24 — Web/backend feature build-out (everything buildable without art or Android)

With the account layer done, built out the rest of the verifiable backlog (PRs #31–#35, all merged):

- **Weekly letter** (§3.2): `shared/letter.js`, rule-based and warm — days shown up + a genuinely
  hard weekday (only with enough history), we-framing, never a scorecard. Top of Journey.
- **Edit habits + rename creature**: the sheet doubles as add/edit (tap a habit to edit, hold to
  delete); inline creature rename (name is the attachment, §3.2).
- **Data export + weekday insight**: "Download my data" JSON from You; a weekday-vs-weekend read on
  Journey using per-day averages.
- **Goal linkage** (§4.4 item 6): an optional "why" per habit, shown with days invested.
- **Webhook** (§5 #5): `POST /api/v1/complete` — Pydantic-validated Flask route mapping a per-account
  token to the user (pytest 6/6); You generates + shows the token and a ready-to-paste snippet.

Test totals now: 55 JS unit + 6 pytest + 8 Firestore-rules.

### What is deliberately NOT built (and why)
- **Motion polish** (freeze-at-risk flame, perfect-day fireflies, §3.6/§3.10): skipped, not deferred
  by oversight — this environment cannot composite frames, so animation quality can't be judged. Not
  worth shipping blind. Do it once a real device or a working preview is in the loop.
- **Creature art**: needs claude.ai/design (the brief) — the one thing that can't be judged here.
- **Android-native** (Health Connect, UsageStats, widget, FCM push, Play listing): needs a real
  Android device. The user is on iPhone; the web build is the testbed.
- **"Continue to Kumo"** on the Google sign-in page: Google Cloud OAuth consent app name — user setting.

The web + backend app is now feature-complete for everything a browser and a mocked/real Firebase can
prove. The frontier is hardware (Android) and art, both owned by the user, both explicitly next-phase.

---

## 2026-07-24 — Account layer complete and confirmed on-device

The web app's account system is done end to end, and the user confirmed **Google sign-in works on
their iPhone**. Shipped across PRs #23–#29 (all merged and deployed):

- **Google sign-in via popup**, not redirect. Redirect silently failed on iOS Safari (tracking
  prevention wipes the hand-back state, `getRedirectResult` returns empty, user stays a guest even
  with the domain authorized). `signInWithPopup`/`linkWithPopup` keeps auth in-page and fixed it. The
  sign-in fn is cached and called with no `await` before it so the popup opens inside the tap gesture.
- **Live auth** via `onAuthStateChanged`: UI flips guest → signed-in when auth lands; email +
  displayName written to the user doc.
- **Login-first web entry**: `/` → `/play`; a welcome screen (Sign in / guest) precedes the starter
  pick; marketing moved to `/about`.
- **In-app account deletion** (Play requirement): two-tap Delete wipes habits, completions, days, the
  user doc, then the auth account. Verified against live Firebase.
- **Duplicate habits fixed at the root**: deleting a habit deletes its Firestore subdoc (an orphan
  used to resurrect on the next pull); old dupes cleaned on load and in the cloud.
- Six starters, dark/light theme, change-creature-anytime, richer sounds + livelier idle, visible
  auth errors.

### Still open (owner: user, not code)
- **Creature art quality** — can't be judged blind here. Path: claude.ai/design from
  `docs/DESIGN_BRIEF_FOR_CLAUDE_DESIGN.md` → export SVGs → wire into `creature.js`.
- **"Continue to Kumo"** on the Google page — Google Cloud → OAuth consent screen → App name.
- **Android-native** (Health Connect, UsageStats, widget, Play) — needs a real Android device; the
  user is on iPhone and the web build is the current testbed.

---

## 2026-07-23 — Live setup + the first real-device bug

### Firebase, Vercel, and the playable web build — all done and proven
- Firebase project `habit-game-111c8` wired (`app/www/firebase-config.js`, committed on purpose — the
  web config is a public identifier, not a secret). Anonymous auth, Firestore database, and the repo
  rules are deployed. Verified live from a browser against the real project: sign in → write whole
  state → write a completion → read it back (`xp=10`), own tree allowed, **another uid denied**.
- Vercel live at `https://habit-game-67x5.vercel.app`: `/api/health` returns the Flask JSON,
  `/privacy.html` and `/delete-account.html` serve, landing page serves. Merges to `main` auto-deploy.
- The game is deployed at **`/play`** (`scripts/build-site.mjs` assembles `public/` = marketing at
  `/`, game at `/play`). This exists because the user is on **iPhone** and cannot install the Android
  APK — mobile Safari runs the same bundle the Capacitor shell wraps.

### The bug worth remembering
On the user's iPhone (iOS 17.2) the home screen rendered **empty** — only the add-quest button and
the day-dots. It failed in Safari *and* iOS Chrome (all iOS browsers are forced onto WebKit), but
never in this environment's browser pane (Blink), which is why every "verified" check up to now had
missed it.

- **Wrong first guess:** `height:100dvh` with no fallback. iOS 17.2 supports `dvh`, so that wasn't it
  (the fallback shipped anyway as correct hardening — PR #15).
- **Actual cause:** the app shell was a fixed-height grid with a **nested `minmax(0, 1fr)` track**.
  WebKit resolves that indefinite→definite height chain differently than Blink and collapses the
  inner track to zero; `overflow:hidden` then clipped everything to nothing.
- **Fix (PR #16):** shell rebuilt as a **flex column** (`min-height`, `min-height:0` on the growable
  middle) — the cross-engine-safe pattern — and made scroll-tolerant (`overflow-x:hidden` only) so a
  future height miscompute degrades to scrolling, never a blank screen. Added a `/play/?diag` overlay
  that dumps real layout numbers on-device for reading engine bugs off a screenshot.

### The standing lesson
**Every check in this project until now ran on Blink only** — the build environment has no WebKit
engine. The app had never touched Safari/WebKit until it hit a real iPhone, and the first contact
found a total-failure layout bug. Cross-engine correctness cannot be assumed from the in-session
browser; it needs a real WebKit device (and, for the Android-only features, a real Android device).
Same conclusion from both platforms, same reason.

---

## 2026-07-22 — Gate 2 compliance drafts: privacy policy + deletion page

### Shipped (drafts, not final)
- `web/privacy.html` and `web/delete-account.html`, styled with the existing site tokens, linked from
  the landing footer (restored — they were pulled when the pages did not exist).
- The policy describes only what the app actually does today: anonymous auth, and game data
  (creature, habits, completion events, daily rollups) in Firestore. It names the real sub-processors
  (Firebase, Vercel), says plainly that we do not sell data or run ad trackers, and links deletion.
- The health/usage section is written but tagged "applies when you enable these features — not in the
  current build", so it is honest for a listing made before Health Connect ships.

### Needs a human before it can be published
- Placeholders, all greppable as `[...]`: `[PUBLISHER NAME]`, `[CONTACT EMAIL]`, `[EFFECTIVE DATE]`,
  `[DATE]`, the deletion window `[30]`, and the note that the in-app delete control is not built yet.
- **This is a draft, not legal advice.** VALIDATION_REPORT §5 makes a matching privacy policy a Gate 2
  exit criterion and the Health-data declaration form a separate Play requirement — both still need a
  real review and the actual declaration filled in the Play Console. The in-app "Delete my account"
  control (You tab) is still to build; the deletion page currently points at an email request path.

### Verified in this session
- Both pages serve 200, the landing footer links resolve to them, and every unfilled value is a
  bracketed placeholder so nothing can ship blank by accident.

---

## 2026-07-22 — Gate 2 slice 2: Journey analytics v1

### The gap this had to close first
The app wrote completion rows to Firestore but kept **no local history** — the store only held today.
An offline-first analytics screen had nothing to read. So this slice adds a local completion log
(`state.log`, one `{date, hid, ts, category}` per completion) as the source the Journey screen reads
with no network and no Firebase project.

### Shipped
- `shared/analytics.js` — pure functions over the log: `heatmap`, `successRate` (due-days capped at
  habit age so a new habit is not punished), `trend`, `hourHistogram`, `bestHourInsight`,
  `weekdayWeekendSplit`. No ML; every insight is a plain query over timestamps (MASTER_PLAN §4.4).
- Journey screen rebuilt: 150-day GitHub-style heatmap, a Best-hour insight card ("You win mornings —
  70% before 9am"), and per-habit 30-day success rate with an up/down/flat trend arrow. Charts render
  complete and never animate in — this is data the user reads (DESIGN_MOTION_SPEC §3 rejection list).
- Below the evidence floor (<5 completions) the best-hour card shows a "come back with more data"
  note instead of inventing a finding.

### Two real bugs found while testing
- `successRate` had **no upper date bound**, so `trend` (which queries a past window) counted later
  completions and every trend arrow would have been wrong. Fixed with a `toDate` clamp.
- `due` days were a rounded millisecond delta, sensitive to the time of day a habit was created.
  Switched to whole-calendar-day counting, consistent with how `done` is computed.

### Verified in this session
- `npm test` — 50/50 (8 new analytics cases incl. the trend upper-bound and the new-habit due cap).
- Browser on 40 days of seeded history: heatmap lit 35 distinct days (matches the seeded density),
  best-hour resolved to 7am / 70%-before-9am from the timestamps, workout 80% and read 33% over 30
  days. A live completion appended to the log (46 → 47) with the right shape.

### Still Gate-2, still device-only
Health Connect, UsageStats screen-time habits, and the widget — plus the health-data declaration and
privacy policy that gate them. Unchanged from the previous entry: staged behind an on-device pass.

---

## 2026-07-20 — Gate 2 slice 1: branching evolution

### Why this slice first
Gate 2 splits cleanly into verifiable-now logic and device-only Kotlin (Health Connect, UsageStats,
widget). Branching evolution is VALIDATION_REPORT §7 condition 1 — the mechanic that makes this not a
Finch clone — and it is pure game math, so it is both the highest-value and the most verifiable piece.

### Shipped
- `attunementFrom(habits)` and `lineageFor(attunement)` in `shared/game-math.js`. Each category's
  lifetime completions feed a hidden meter; the dominant blend at stage 3+ picks a lineage:
  body → Ember-beast, mind → Moth-sage, order → Sentinel, no clear leader → Prismatic. A leader needs
  >45% of completions; a co-leader tie resolves to Prismatic, never an arbitrary winner.
- `creatureSvg` takes stage 3+ and re-tints the shared rig with the lineage accent plus one
  distinguishing mark (ember flame, moth wings, sentinel crystal, prismatic aura).
- Stage tag and the You screen now name the branch ("Ember-beast Sprite") and show an attunement
  blend (Mind/Body/Order bars) with copy that explains the branch is still forming before stage 3.

### ponytail note on the art
The lineage forms are a palette-and-mark overlay on the existing hatchling rig, **not** four bespoke
per-stage redraws. VALIDATION_REPORT §6 explicitly budgets branches that way ("different palettes,
markings, 2-3 swapped parts, not full redraws"). Full stage-3/4/5 silhouettes are a deferred art pass;
what ships here is the *mechanic* — the data choosing the branch — which is the validated-novel part.

### Verified in this session
- `npm test` — 42/42 (5 new: attunement sums by category, clear leader pulls its branch, spread-out
  life is prismatic, co-leader tie is prismatic, empty data is prismatic not a crash).
- In the browser on seeded state: a body-heavy level-7 creature renders "Ember-beast Sprite" with the
  ember accent and flame mark in the SVG; swapping to order-heavy habits re-renders "Sentinel Sprite"
  with the crystal palette and the ember palette gone. The branch tracks the habits, live.

### Not verified — art, not logic
Whether the lineage marks read well or look cheap. They have never been seen rendered (frozen pane),
and they are deliberately minimal pending a real art pass.

### The rest of Gate 2 is device-only
Health Connect, UsageStats screen-time habits, and the home-screen widget are all native Android with
no browser fallback, and they carry the two compliance gates (Health data declaration + privacy
policy) that VALIDATION_REPORT §7 condition 3 makes Gate 2 exit criteria. None of it can be verified
in this environment, and it should not be written blind on top of a core loop nobody has felt on a
phone yet. Those slices are staged behind an on-device pass of what already exists.

---

## 2026-07-20 — Gate 1 slice 4: reminders with a ✓ action

### Scope decision (asked, not assumed)
MASTER_PLAN §4.1 budgets "complete via notification" at 1 tap with **no app open**. Capacitor's Local
Notifications cannot deliver that: the action is handed to JS, so the app has to wake to apply it.
True app-less completion needs a Kotlin BroadcastReceiver. Agreed to ship the Capacitor version now
and defer the receiver to Gate 2, where the widget's native work happens anyway. **The friction
budget line is therefore not yet met as written** — one tap, but the app flashes open.

### Shipped
- `shared/reminder-math.js` — `parseTime`, `nextTriggerAt`, `notificationId`. Pure, so the midnight
  and month-boundary edges are testable without a device.
- `app/www/reminders.js` — action type registration, permission, cancel-then-schedule sync, and the
  `localNotificationActionPerformed` listener that completes the habit.
- Optional reminder time per habit via a native `<input type="time">` (platform-native beats a
  custom picker). Permission is requested at the moment a reminder is set, never as a cold prompt.
- Reminder times shown on the You screen; deleting a habit cancels its pending notification.
- Notification copy is in the creature's voice — "Embr is ready when you are" — never "We miss you!"
  (VALIDATION_REPORT §4 notification ethics).

### Verified in this session
- `npm test` — 37/37 (9 new reminder cases: current minute counts as passed so saving never fires
  instantly, 23:59 → 00:05 rolls the day, 31 Jul → 1 Aug rolls the month, invalid times schedule
  nothing rather than throwing, ids stable and distinct).
- Browser with no plugin present: adding a habit with a reminder stores `reminder: "19:45"`, shows it
  on You, and throws nothing — the whole reminder layer no-ops cleanly off-device.
- Scheduling contract verified against a fake plugin: stale pending notifications cancelled first,
  one notification scheduled with a stable id, title `📖 Evening walk`, daily repeat, trigger at the
  next 19:45, `extra.habitId` round-tripping, and the ✓ action handler firing with `evening-walk`.

### Still device-only
Whether a notification actually appears, whether the ✓ button renders on the Android shade, whether
`allowWhileIdle` survives Doze, and how much the app-wake flash is felt.

---

## 2026-07-20 — Gate 1 slice 3: sound, haptics, comeback arc

### Shipped
- `app/www/audio.js` — WebAudio oscillators, no assets. Completion chimes climb C5-E5-G5-C6 across
  the day, perfect day is a triad, level-up a 3-note motif, comeback a warm low-to-high pair, freeze
  spent a single soft low note. Nothing else makes a sound; navigation is silent (§6 utility budget).
- Sound is opt-in, asked once after the *first* completion in the creature's voice ("Embr wants to
  make sounds — okay?"). `settings.sound === null` means "not asked yet" and the app stays silent
  until answered. The AudioContext is created on that user gesture, never at import.
- Haptics: `impactLight` on a completion, `notificationSuccess` on a perfect day, via
  `@capacitor/haptics` 8.0.2 with a `navigator.vibrate` fallback in the browser.
- Comeback arc: 3+ missed days puts the creature to sleep under a blanket with closed eyes and the
  tag "Asleep · waiting for you". The next completion plays the wake-up (blanket slides off, stretch,
  settle), clears the state, and earns the permanent "Rekindled" badge shown on You.

### A real bug this slice found
`state.settings.sound` threw for anyone whose saved state predates this build — which is every
existing install. `load()` now merges stored state over the seed defaults, so a missing top-level key
can never crash the app again, and new keys get a default for free. Verified by writing a genuine
old-format state (no `settings`, no `badges`, no `comeback`) and loading it.

### Verified in this session
- `npm test` — 28/28.
- Comeback end-to-end on migrated old-format state: 5-day gap → creature asleep with blanket →
  completion wakes it → `comeback` false, `badges: ["rekindled"]`, blanket gone, tag back to
  "Hatchling · radiant". XP 120 → 160 (10 base with the streak reset by the absence, +30 perfect day).
- Sound prompt appears after the first completion, names the creature, and the first completion is
  silent. Answering "Sure" persists `settings.sound: true`; a later completion runs the audio path
  with no errors thrown.

### Unverifiable here — still needs the device
Whether any of it is *audible*, whether the chimes are pleasant, haptic strength, and every animation
including the wake-up ceremony. The frozen-frame-clock problem from slice 2 is unchanged.

---

## 2026-07-20 — Gate 1 slice 2: habit sheet, templates, hold-to-delete

### Correction to the previous entry
The browser pane used for verification has a **frozen frame clock**: `requestAnimationFrame` never
fires, CSS transitions stay pinned at their start value, and screenshots time out. That invalidates
the diagnosis written in the slice-1 entry below — the starter-card entry animation may well have
been fine, and the `@starting-style` attempt probably never got a chance to run. What is still true:
a `forwards`-filled animation does outrank the dim-the-others rule, and the simplification stands on
its own merits. **No animation in this project has been visually verified since the Gate 0 scaffold.**

### Shipped
- `app/www/sheet.js` — the one gesture surface (DESIGN_MOTION_SPEC §4): pointer capture with grab
  offset, 5-sample velocity window, rubber-band above rest, velocity-over-position release, and an
  analytic critically-damped spring (stiffness 440, damping 42, mass 1 → ω = √440). Positioned only
  by `transform: translateY`, so a drag can interrupt an in-flight animation and continue from the
  live value.
- `shared/gesture-math.js` — the pure decisions (rubber band, momentum projection, release, velocity)
  pulled out of the DOM so they are testable in node. This is the only part of the gesture that could
  be verified in this environment.
- `app/www/habits.js` — 8 templates, 12 glyphs, 3 categories, unique slug generation, 7-habit cap.
- Add-quest button on Home, hidden once the cap is reached.
- Hold-to-delete on the You screen (§5): overlay fills over 1.2s linear, snaps back in 200ms on
  release. No confirm dialog — deliberate where destructive, snappy on cancel.

### Verified in this session
- `npm test` — 28/28 (18 game math + 10 gesture math).
- Sheet opens, template tap fills name + glyph + category together, submit creates the habit with a
  unique slug (`10-000-steps`), sheet hides, Home re-renders with the new quest.
- Hold-to-delete: releasing at 300ms cancels (habit count unchanged at 4); holding the full 1.2s
  removes it (back to 3).
- Cap: adding habits stops at 7 and the add button hides itself.

### A real bug the frozen pane exposed
`close()` completes inside the spring's rAF callback. On a tab where frames never run, the sheet
would never hide — it would sit open forever with no way out. `springTo` now carries a 700ms
deadline that settles to the target and fires `onDone` regardless. The same fix protects open,
close, and settle. Worth keeping on real devices too: backgrounded WebViews stop ticking.

### Cannot be verified here — needs the device or a working pane
Sheet drag feel, rubber-band resistance, flick-to-dismiss, spring settle, scrim fade, all screen
transitions, hold-to-delete fill animation. The arithmetic behind the gesture is unit-tested; how it
*feels* is untested.

---

## 2026-07-20 — Gate 1 slice 1: onboarding + tabs

### Shipped
- Three-starter pick as the first-run overlay: Kumo (mind), Embr (body), Moss (order). Renders per-species colours + one silhouette cue (wisp / spark tail / sprout) on the shared rig, so branching evolution in Gate 2 keeps the same skeleton.
- Onboarding gate on boot: no species stored → overlay blocks the app until a pick lands. Choice writes `creature.species` + `creature.name` and clears the overlay.
- Egg starts with 1 crack of 3 (endowed progress, VALIDATION_REPORT §4). Completions add cracks up to the hatchling threshold.
- Tab routing: Home / Journey / You swap with a 120ms opacity fade, never slide (§3 Part 2). `aria-selected` follows the active screen.
- Journey (v1): current + best streak, all-time completions, freezes banked, per-habit totals + best. Explicit note that heatmap / time-of-day / trends land at Gate 2 — they need history to say anything true.
- You (v1): creature summary (species, stage, level, XP into level, affinity), habit list, disclosure about on-device data.
- `xpForCompletion` now takes `affinity` — matching category adds a flat 5 XP before the auto multiplier. Number is a starting value, not a spec number; tune with real data.

### Verified in this session
- `npm test` — 18/18 pass (added the affinity case).
- Fresh browser: onboarding overlay renders 3 cards, picking Embr enables the CTA labelled "Begin with Embr", tapping it clears the overlay, Home shows the Embr-coloured egg with `creature-name` "Embr" and stage tag "Egg · sleeping".
- Tab switching from the DOM: `aria-selected` follows the click; each screen renders its own content (Journey stat "1" after a workout completion, You card "Embr · Egg").

### Screenshot tool broken this session
Browser pane's screenshot MCP has been timing out all session; verification is DOM/text-based instead. Behavior confirmed, visual polish (crack art, dim-others rule not firing under `:has(.picked)`) still needs a real screenshot to sign off.

### What went wrong along the way (root causes, not just fixes)
- First tried a `@keyframes starter-in ... forwards` entry: the filled animation outranks the "dim the non-picked" rule via CSS specificity, so picking a starter can't visibly dim the others.
- Replaced it with `.onboard.ready` toggled by `requestAnimationFrame`: rAF is throttled/paused in background tabs and never fires there, which would leave the first-run screen invisible forever.
- Tried `@starting-style` next: transition stayed stuck partway through — cause unclear, and hunting it for a screen the user sees once is not worth the token budget.
- Dropped the entry animation entirely (`ponytail:` comment marks it). Press feedback and picked-state border stay. Same class of failure — a transition that never fires — was also blocking the exit path via `transitionend`; that now has a 400ms `setTimeout` fallback so the user can never get stuck on a blank overlay.

### Still open (Gate 1 remainder)
Add-habit sheet with the gesture spec, templates, sound (opt-in via the creature), notification ✓ actions, comeback beat, streak-freeze animation. Each shipped as its own PR.

---

## 2026-07-20 — Firestore sync (Gate 0 exit criterion)

### Decision taken
The Firebase JS SDK reaches `app/www` through **esbuild**, not a CDN. `scripts/firebase-entry.js`
re-exports the handful of symbols the app uses; `npm run build:firebase` bundles them into
`app/www/vendor/firebase.js` (676 KB minified, gitignored, generated). A CDN import would have
cost a network fetch on first launch and weakened the offline-first promise for nothing.

### Shipped
- `app/www/cloud.js` — anonymous auth, Firestore with `persistentLocalCache`, whole-state pull at
  boot, and one batched write per completion covering the user doc, the habit, the day rollup and
  the completion row. Completion rows are written from day one because analytics cannot be backfilled.
- `shared/paths.js` — Firestore paths in one place, imported by both the app and the rules test, so
  a path cannot drift away from the rule that protects it.
- Boot order: local state renders first, the cloud catches up second. A cloud failure never costs a completion.
- No Firebase config present → the app runs local-only, no errors. That is what ships until the
  project exists.
- OpenJDK 21 installed on this machine (with your approval), so the emulator suite runs locally now.

### Verified in this session
- `npm run test:rules` locally: 8/8, including every document shape the app actually writes and the
  same documents denied to a second uid.
- Real app in a browser against the auth + Firestore emulators: anonymous sign-in, whole-state push,
  then a completion wrote `users/{uid}/completions/2026-07-20_workout` with `{hid, date, ts, source, xp}`
  and `users/{uid}/days/2026-07-20` with `{done:1, total:3, perfect:false, xpEarned:11, doneIds:[workout]}`.
- **Offline → sync**: killed the emulator, completed a habit (UI advanced to 2/3, XP 82 stored
  locally), restarted the emulator — the queued write landed 6 s later. The completion's `ts`
  (13:41:55, the moment of the tap) is earlier than Firestore's `createTime` (13:42:22), which is the
  proof it was queued rather than re-sent.
- Boot pull: cleared `localStorage`, reloaded, and the app restored XP 60 and the 1-day streak from Firestore.
- Local-only fallback with the config file removed: completions still work, perfect-day bonus applied
  (82 + 11 + 30 = 123).

### Still needs the phone
Same list as below, plus: airplane-mode round-trip on the device, and whether the 676 KB bundle hurts
cold start on a cheap Android.

---

## 2026-07-20 — Gate 0 scaffold

### Shipped
- Repo initialised, planning docs moved into `docs/`, `build-kickoff` skill moved to `.claude/skills/build-kickoff/SKILL.md`.
- `shared/game-math.js` — XP, level curve, evolution stages, moods, streaks, freezes, missed-day catch-up. Written from MASTER_PLAN §3.4 (there is no prototype file in this repo).
- `app/www/` Home screen: top bar, XP bar, creature scene (Kumo stages 1–2 as inline SVG), today row, 3 seeded quests, tab bar. Check-in beat per DESIGN_MOTION_SPEC §3 item 1.
- `app/www/store.js` — localStorage persistence + event-driven day rollover (no polling timer).
- `api/` Flask app with `/api/health`, `services/firebase_client.py` seam, stdout logger, Pydantic module.
- `web/` landing stub leading with the screen-time positioning (VALIDATION_REPORT §7 condition 2).
- `firestore.rules` + emulator test proving another uid is denied.
- Capacitor 8.4.2 Android project at `app/android` (appId `app.kumo.habitgame`).
- CI (`.github/workflows/ci.yml`): pytest · node game-math tests + syntax check + shared-copy drift check · Firestore rules emulator test.
- APK workflow (`.github/workflows/android.yml`): `assembleDebug` → downloadable artifact.

### Verified in this session
- `npm test` → 17/17 pass.
- `pytest -q` → 2 passed.
- Home screen at 375×812 in a real browser: completed 3 habits, XP 10 → 60, level 1 → 2, streak 0 → 1, mood `sleeping → content → radiant`, egg cracks 0 → 3, state survived a reload.
- Audited in-page: zero undersized tap targets, muted text 8.54:1, primary text 16.64:1, zero emoji in UI chrome.
- Grepped for banned motion: no `transition: all`, no `ease-in`, no `scale(0)` entry. The one layout-property transition found (`transition: width` on the XP bar) was replaced with `transform: scaleX`.

### Needs on-device test (never mark these verified from a cloud/desktop session)
- APK install and first launch on the phone.
- Check-in beat at 60fps on a cheap Android (the ₹8k floor device from MASTER_PLAN §8).
- `prefers-reduced-motion` behaviour with the OS setting actually on — the CSS block exists and was code-reviewed, but nothing rendered it.
- Haptics (`Capacitor Haptics` is referenced in `fx.js` but the plugin is not installed yet — the browser vibrate fallback is what ran).

### Verified in CI, not locally
- Firestore rules test: no JDK on this machine, so the emulator could not start here. The `rules` job in CI is the evidence — it passes, including "another uid cannot read or write that tree".
- Repo: https://github.com/kandulanikhilvarma/habit-game (public). PR #1 merged with all three CI jobs green.
- APK: run 29745232136 built `kumo-debug-apk`, 3,768,666 bytes, downloadable from the Actions page.

### Two bugs CI caught that local runs hid
- `pytest` collected nothing in CI: `python -m pytest` puts the repo root on `sys.path`, bare `pytest` does not. Fixed with `pythonpath = .` in `pytest.ini`.
- `./gradlew: Permission denied`: the wrapper was committed from Windows without the exec bit. Fixed with `git update-index --chmod=+x` (PR #2). Anything executable added from this machine needs the same treatment.

### Next
1. Download the APK on the phone and install it — first real launch.
2. Firebase project → Anonymous auth + Firestore → `app/www/firebase-config.js`, service account into Vercel env.
3. Connect the repo to Vercel (native Git integration; no token in a public repo).
4. Gate 0 exit: complete a habit on the phone and prove XP survives offline → sync.

### Open questions
- ~~How does the Firebase JS SDK get into `app/www` without a bundler?~~ Settled on esbuild — see the entry above.
- Multi-device conflict handling is newest-write-wins on whole state (`ponytail:` comment in `app/www/app.js`). Fine for one device; revisit when an account can be on two.
- Nunito is referenced in `tokens.css` but no woff2 is bundled, so the WebView currently falls back to Roboto. Self-host the variable font before Gate 1 (no Google Fonts CDN call from the app shell).
- Undo on a completed habit is deliberately absent this gate (see the `ponytail:` comment in `app/www/app.js`); decide the accounting rules with the edit/delete flows in Gate 1.
