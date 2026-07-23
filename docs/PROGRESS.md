# PROGRESS

Living log. Every session ends by updating this file; every session starts by reading it.

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
