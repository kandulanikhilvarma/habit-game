# DESIGN & MOTION SPEC — the "feel" chapter of the MVP
### Applied skills: apple-design · emil-design-eng · find-animation-opportunities · ui-ux-pro-max · karpathy-guidelines · ponytail
*Stack unchanged: vanilla HTML/CSS/JS in a Capacitor WebView. Every motion below is CSS transitions or the Web Animations API (WAAPI) — both GPU-friendly, interruptible, zero dependencies. No Framer Motion, no GSAP, no new framework.*

This document completes the master plan. Build order: MASTER_PLAN → VALIDATION_REPORT (3 conditions) → this spec.

---

## 0. THE FEEL, IN ONE LINE

**Calm by default, alive on contact, generous only at rare moments.** A cozy creature at night — not a casino. Every value below serves one of Apple's four needs (predictability, understanding, achievement, joy), and the delight budget is spent only where frequency is low.

---

## 1. MOTION FOUNDATION (design tokens — put these in `tokens.css` on day one)

```css
:root {
  /* Easing — custom curves; built-ins are too weak (emil) */
  --ease-out:    cubic-bezier(0.23, 1, 0.32, 1);     /* enter, response — default */
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);    /* on-screen movement/morph */
  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);     /* sheets (iOS drawer curve) */
  --spring-pop:  cubic-bezier(0.22, 1.4, 0.36, 1);   /* overshoot — rewards ONLY */

  /* Durations — UI stays under 300ms; ceremonies are the exception */
  --t-press: 120ms;   /* press feedback */
  --t-fast:  180ms;   /* toggles, small popovers */
  --t-ui:    240ms;   /* list items, cards, mood shifts */
  --t-sheet: 320ms;   /* sheets/modals */
  --t-beat:  600ms;   /* one reward beat (XP float, flame tick) */

  /* Z-index scale (ui-ux-pro-max) */
  --z-widget-fx: 10; --z-sheet: 20; --z-banner: 30; --z-toast: 40;
}
```

**Hard rules (all skills agree):**
1. Animate `transform` and `opacity` only. Never width/height/top/left/padding. (`clip-path` allowed for reveal effects — GPU-friendly.)
2. `transition: all` is banned — name the property every time.
3. `ease-in` is banned on UI. Enter/respond = `--ease-out`; move/morph = `--ease-in-out`; constant motion (progress) = `linear`.
4. Never `scale(0)` entries — nothing real appears from nothing. Enter from `scale(0.95) + opacity 0`.
5. Overshoot (`--spring-pop`) only when the moment carries momentum: reward beats, flick releases. Never on menus/sheets/navigation.
6. CSS **transitions** (not `@keyframes`) for anything rapidly re-triggerable — transitions retarget mid-flight, keyframes restart from zero (Apple's interruptibility principle, Emil's Sonner rule). Keyframes only for fire-and-forget decorations (confetti, floating XP).
7. Exit faster than enter. Asymmetric timing: deliberate in, snappy out.
8. Respond on `pointerdown`, never on `click` alone — feedback on the press.
9. Kill every artificial delay. Audit for stray `setTimeout` on the input path.
10. `@media (prefers-reduced-motion: reduce)` on every moving thing: cross-fade instead of slide/spring, no parallax, no overshoot — gentler, not zero.

**Ponytail note on tooling:** no spring library. The three custom cubic-béziers + WAAPI cover 95% of this game. The single place true spring physics earns itself is the sheet drag release (§4) — that's ~40 lines of vanilla rAF spring, written once in `fx.js`, reused everywhere. If it ever exceeds that, Motion One via CDN is the approved narrow-purpose fallback (your stack policy allows single-feature CDN libs) — but start without it.

---

## 2. VISUAL SYSTEM (ui-ux-pro-max checklist applied)

| Token | Value | Rule it satisfies |
|---|---|---|
| Background | `#0d1022` radial to `#131735` | Dark-first, OLED-friendly; world scene supplies color |
| Surface / raised | `#1a1f3d` / `#222850`, 1px border `#2b3163` | Borders must be *visible* on dark (no `white/10`) |
| Text primary | `#eef0ff` on `#0d1022` ≈ 15:1 | ≥4.5:1 contrast — passes with margin |
| Text muted | `#a7adcf` (NOT `#8b91b8` from the prototype — that's ~4.2:1, too low for small text) | ui-ux contrast rule, fixed |
| Accent | mint `#5ef0c0` → violet `#9d7bff` gradient | Reserved for progress + rewards only — accent scarcity keeps it meaningful |
| Warm signals | flame `#ffd166`, blush `#ff8fb1` | Streaks/affection only |
| Body text | 16px minimum, line-height 1.5, `rem`-based spacing | Mobile readability + Dynamic-Type-style scaling |
| Type | One rounded variable font (Nunito), 3 sizes; headings `letter-spacing:-0.02em`, body `0` | Apple typography: tracking is size-specific |
| Icons | **Inline SVG set (Lucide), one 24×24 viewBox — NOT emojis.** Emojis stay only as user-chosen habit glyphs (user content, not UI chrome) | ui-ux "no emoji icons" — the HTML prototype violates this (⚙, ✓, ✕, 🔥); fix at port time |
| Touch targets | ≥44×44px everything; the habit check circle 46px + 10px hit padding | Touch-target rule + Apple hysteresis |
| Focus | visible `outline: 2px solid #5ef0c0aa` on focusable elements | Keyboard/switch access |
| Materials | Sheets: `rgba(19,23,53,.72)` + `backdrop-filter: blur(20px) saturate(160%)`, bright 1px top edge; scrim `#05071adb`. One translucent layer max — never stack glass on glass | Apple materials; `prefers-reduced-transparency` → solid `#131735` |
| Wayfinding | 3 tabs labeled by content: **Home / Journey / You** — no "Menu", no hamburger | Specific labels beat generic |

---

## 3. ANIMATION OPPORTUNITY MAP (find-animation-opportunities — gated, with rejections)

Frequency map first: check-ins ~3–7×/day per user; app opens ~2–5×/day; sheets ~1×/day; ceremonies ~1×/day to 1×/month. The delight budget belongs to ceremonies; daily surfaces get near-imperceptible motion only.

### Part 1 — Opportunities (survived all four gate questions)

| # | Moment | Today (planned/prototype) | Purpose | Frequency | Motion recipe (exact) |
|---|---|---|---|---|---|
| 1 | **Habit check-in reward** | Prototype has it; formalize | Feedback + achievement | 3–7×/day | Sequence ≤1.2s, interruptible by scroll: ① check fills `--t-press` `--ease-out` ② XP number floats from **tap point** (respect grab offset) 600ms keyframe ③ creature hop 500ms `--spring-pop` ④ flame ticks scale `1→1.15→1` 240ms. Sound+haptic on frame 1 (§6) |
| 2 | **Creature idle life** | Static between events | Preventing dead screen; the "alive" illusion | Constant on Home | CSS loops: bob 3.2s `ease-in-out` infinite; blink every 3–6s (randomized via JS setting `animation-delay`); pupil follows last tap point via `transform` with 120ms `--ease-out` retarget. All transform-only; paused when tab hidden (`document.hidden`) to save battery |
| 3 | **Mood transitions** | Instant swap in prototype | State indication | 2–5×/day | Cross-fade + morph: old mood `opacity→0` 180ms, new `scale(.97)→1, opacity→1` 240ms `--ease-out`, with `filter: blur(2px)` during the swap to mask the crossfade seam (Emil's blur trick, <20px, cheap) |
| 4 | **Add-habit sheet** | `@keyframes slideUp` — not interruptible, no gesture | Spatial consistency | ~1×/day | Full gesture sheet (§4): enters `translateY(100%)→0` 320ms `--ease-drawer`, drag-to-dismiss 1:1, velocity release, exits same edge. Scrim fades 240ms. `transform-origin` irrelevant (edge sheet); modals stay centered |
| 5 | **Evolution ceremony** | Banner only | Achievement + delight (the memory) | ~1×/3wks | The one long animation: dim world 400ms → creature silhouette `scale 1→1.06`, white-out glow 600ms → new form reveals `scale(.9)→1` 500ms `--spring-pop` → confetti keyframes (fire-and-forget) → name card fades in. Total ~2.8s, **tap-to-skip always**. Never lock input |
| 6 | **Perfect-day world beat** | Confetti only | Achievement, ties habits→world | ≤1×/day | Fireflies: 12 tiny radial-gradient dots, opacity/transform keyframe loops 4–6s, staggered 60ms; world lighting warms via `filter: saturate(1.15)` 800ms `--ease-in-out`. Decorative, non-blocking |
| 7 | **Habit list add/remove** | Instant reflow | Preventing jarring change | ~1×/wk | Enter: `@starting-style { opacity:0; transform: translateY(8px) }` → settled, 240ms `--ease-out`. Remove: item `opacity→0, scale(.97)` 180ms, siblings re-position via FLIP `transform` 240ms `--ease-in-out` (no `height` animation) |
| 8 | **Comeback wake-up** | Planned, unspecified | Delight (rare, high-emotion — the churn-saver moment) | Rare | Blanket slides off `translateY` 400ms `--ease-out` → creature stretches (scaleY `1→1.06→1`) 600ms → eyes open 180ms → single warm chime. ~1.4s total, plays once |
| 9 | **Onboarding starter pick** | Unspecified | Explanation + first-time delight | Once ever | The 3 starters breathe in staggered (80ms apart, `@starting-style` fade+rise); picked one hops `--spring-pop` 500ms, other two fade to 0.3 in 240ms. First-time tier = allowed generosity |
| 10 | **Streak flame at risk** (evening, habits pending) | Nothing | State indication — the loss-aversion signal | ≤1×/day | Flame flickers: opacity 1→.75→1, 2s `ease-in-out`, ×3 cycles max then stops (never infinite anxiety); paired copy "2 quests keep the flame tonight" |

### Part 2 — Rejected candidates (the restraint list — as important as Part 1)

- **Tab switching (Home↔Journey↔You).** Rejected: tens of times/day, navigation must feel instant. Content swaps with at most a 120ms opacity cross-fade; no slides.
- **App launch splash animation.** Rejected: every single open — animation here is a tax on the most frequent action. Cold start shows the creature immediately (WebView renders last-known state from IndexedDB before network).
- **Journey heatmap / success-curve draw-in.** Rejected: functional data the user is *reading*; decoration hinders (find-animation-opportunities gate 4). Charts render complete, instantly.
- **XP bar fill on every app open.** Rejected: re-animating old progress on each open fakes activity and delays reading. It animates only at the moment XP is earned (600ms, `linear` fill), otherwise renders at rest.
- **Per-letter/word text animations in creature dialogue.** Rejected: reading speed beats theatre; users check this multiple times daily.
- **Widget animation.** Rejected: Android widgets are static RemoteViews anyway; and home-screen motion would be uninvited. The widget's "motion" is its mood *changing between glances* — state, not animation.
- **Parallax on the world scene during scroll.** Conditionally rejected for MVP: only ship if it holds 60fps on a ₹8k test phone with `transform`-only layers; it's garnish, first thing to cut.

### Part 3 — Verdict

This interface needs **less motion than the average game and more than the average tracker** — a small set of high-conviction moments, each tied to feedback, state, or a rare ceremony. Highest-leverage single item: **#1, the check-in reward** — it runs on every core action and *is* the product's feel. Build it first, tune it on-device, then let every other value inherit its personality.

---

## 4. THE SHEET — reference gesture implementation (Apple mechanics, vanilla JS)

The add-habit/settings sheet is the one true gesture surface at MVP; write it once as `sheet.js`, reuse forever.

- **1:1 tracking:** Pointer Events + `setPointerCapture`; respect grab offset; keep last 5 `pointermove` samples `{y, t}` for velocity.
- **Interruptible:** the sheet is positioned only ever via `transform: translateY`. On `pointerdown` mid-animation, cancel the WAAPI animation with `commitStyles()` and continue from the live value — never from the target.
- **Rubber-band above rest:** `offset = overshoot * 0.55 * H / (H + 0.55 * |overshoot|)`.
- **Release decision by velocity, not position:** flick down > ~0.11 px/ms → dismiss regardless of distance; else project momentum `(v/1000)*0.998/(1-0.998)` and snap to the nearer of open/closed.
- **Velocity handoff:** feed release velocity into the vanilla spring (critically damped, response ≈ 0.3 → stiffness ≈ 440, damping ≈ 42, mass 1) so the seam between finger and animation is invisible.
- **Multi-touch guard:** ignore new pointers while dragging.
- **Reduced motion:** sheet becomes a 200ms opacity fade, drag still works (gesture ≠ animation).

Everything else in the app (buttons, list items, mood swaps) is plain CSS transitions — no gesture machinery. (karpathy: minimum code; the complexity lives in exactly one file.)

---

## 5. EMIL REVIEW OF THE EXISTING PROTOTYPE (port-time fixes)

The HTML prototype is the playable spec, but port it through this table — each row is a real issue found in its code:

| Before (prototype) | After (build) | Why |
| --- | --- | --- |
| `.check { transition: all .25s var(--spring-pop) }` | `transition: transform 180ms var(--ease-out), background 180ms ease; --spring-pop only on the .on state change` | `all` is banned; overshoot curve was applied to *every* property including border-color |
| `.sheet { animation: slideUp .3s }` (keyframes) | WAAPI/transition `translateY(100%)→0`, gesture-driven (§4) | Keyframes can't be grabbed or reversed — sheet must be interruptible |
| Emoji as UI icons (`⚙`, `✓`, `✕`, `🔥` in chrome) | Lucide inline SVG, 24×24; emojis remain only as user-chosen habit glyphs | ui-ux-pro-max: emojis as icons read unprofessional and render inconsistently across Android OEMs |
| Muted text `#8b91b8` on `#0d1022` | `#a7adcf` | ~4.2:1 → ≥4.5:1 contrast |
| `.emoji-grid button` has no `:active` state | `:active { transform: scale(0.95) }`, `transition: transform 120ms var(--ease-out)` | Every pressable element must feel pressed |
| Banner `transition: all .45s` + fixed 2.3s timeout | `transform, opacity` only; dismiss on tap as well as timeout | Named properties; never trap the user in a timed state |
| Creature bob + shadow bob as two separate infinite keyframes | One parent transform loop; shadow scales via same animation | Two clocks drift; one source of truth |
| `confirm`-style double-tap delete (`✓?` mutation) | Hold-to-delete: overlay `clip-path: inset(0 100% 0 0)` → `inset(0)` over 1.2s `linear` on press, snap-back 200ms `--ease-out` on release | Emil's asymmetric pattern: deliberate where destructive, snappy on cancel — and no accidental deletes |
| `setInterval(..., 30000)` day-rollover check always running | Check on `visibilitychange` + `resume` (Capacitor) events; keep one slow fallback timer | Battery; event-driven beats polling (ponytail) |

---

## 6. SOUND + HAPTICS SYNC (Apple multimodal rules)

- **Causality:** feedback fires on the causal frame — check-fill start, not sequence end. One `celebrate(intensity)` entry point in `fx.js` triggers visual + audio + haptic together (**harmony: same frame**; don't let a transition lag the haptic).
- **Utility budget:** haptics/sound only on: completion (light tick + rising chime), perfect day (success pattern + chord), level/evolution (signature motifs), streak-freeze consumed (soft warning). Nothing else — over-feedback trains users to ignore all of it. Navigation is silent.
- Completion chimes rise C→E→G→C across the day's habits (progress you can hear). WebAudio oscillators at MVP (zero assets, ~30 lines, already proven in the prototype); recorded kalimba samples are a v2 polish swap.
- Haptics via Capacitor Haptics: `impactLight` on press, `notificationSuccess` on perfect day. Respect system silent mode; sound opt-in framed by the creature ("Kumo wants to make sounds — okay?").

---

## 7. PROCESS GUARDRAILS (karpathy + ponytail + caveman, standing orders for the build)

1. **Think before coding; surface assumptions; if two interpretations exist, present both** — never pick silently (karpathy §1).
2. **Minimum code that solves the problem.** No speculative abstractions, no config nobody asked for. The ladder: does it need to exist → stdlib → platform native (CSS over JS, DB constraint over app code) → existing dep → one line → only then write code (ponytail).
3. **Surgical diffs.** Touch only what the task names; match existing style; every changed line traces to the request (karpathy §3 — also encoded in your github-hygiene skill).
4. **Goal-driven:** every gate exit criterion is a verifiable test, not a vibe. "Sheet feels right" → "sheet holds 60fps in Chrome DevTools perf trace on the test phone; velocity flick dismisses in <1 frame of release."
5. **Terse output during builds** (caveman): progress reports in short factual lines, full technical accuracy, no ceremony.
6. **Review with fresh eyes:** replay every new animation next day at 0.25× speed (DevTools → Animations panel) before calling it done; test gestures on the real ₹8k phone, not the desktop emulator (Emil + Apple process rules).

---

## 8. DEFINITION OF "FEELS DONE" (per-screen checklist)

Home passes when: creature reacts within 1 frame of pointer-down · check-in sequence plays at 60fps and is scroll-interruptible · nothing animates on plain app-open except idle life · reduced-motion mode swaps every move for a fade · muted text passes 4.5:1 · all taps ≥44px · zero emoji in chrome · sheet dragged mid-animation follows the finger with no jump.

Ship nothing that fails the checklist; everything else in the plan stands.
