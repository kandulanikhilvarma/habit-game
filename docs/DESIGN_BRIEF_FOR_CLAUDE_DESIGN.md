# KUMO — DESIGN BRIEF (paste into Claude Design)
*How to use: open claude.ai/design → New project → paste PART 1 as your first message (it sets the world). Then generate one screen at a time with the PART 2 prompts. Iterate with inline comments on the canvas; export HTML when a screen looks right.*

---

## PART 1 — PROJECT BRIEF (paste this first, once)

I'm designing **Kumo**, a habit-building game for Android (390px phone frames for all screens). The core idea: a creature companion that grows, evolves, and glows based on your real daily habits — auto-tracked where possible, 1-tap otherwise. Emotional register: cozy, calm, alive — Tamagotchi warmth meets Duolingo streaks, NEVER casino energy.

**Visual system (strict — use exactly these):**
- Background: deep night navy #0d1022, radial glow to #1c2150 at top. Cards #1a1f3d with 1px #2b3163 borders, 16-18px radius.
- Accent: mint #5ef0c0 → violet #9d7bff gradient — ONLY on progress and rewards. Streak flame gold #ffd166. Blush pink #ff8fb1 for affection.
- Text: #eef0ff primary, #a7adcf muted. Font: Nunito (rounded, friendly). Body ≥16px.
- Icons: clean line SVG style (Lucide-like), never emoji.
- The creature: round 2-tone blob with big eyes, tiny highlight, soft shadow — Neko Atsume / Duo-level charm from simple shapes. It stands in a small night glade (silhouette layers, fireflies, soft ground glow) — Alto's Odyssey mood.
- Overall: dark cozy premium, generous spacing, one glowing focal point per screen.

**The 3 starter creatures:** Kumo (pale violet cloud-spirit blob, sleepy-gentle), Embr (coral flame-fox, playful spark tail), Moss (green leaf-turtle sprout, calm). Same body language family, distinct silhouettes.

**Evolution stages (creature grows across screens where relevant):** Egg → Hatchling → Sprite (leaf sprout) → Guardian (small crown + wing-wisps) → Radiant (aura).

---

## PART 2 — SCREEN PROMPTS (one message each, in this order)

**1. Home (the game — most important screen):**
"Design the Home screen: top bar with level badge (star, 'Lv 8') and a lit streak flame chip ('12 day streak'); slim XP progress bar; large centered scene — the Sprite-stage creature in its night glade with 2 fireflies and soft mint aura; creature name 'Kumo' + stage tag; a 'Today 2/3' energy row; then 3 habit quest cards ('Read 20 minutes 🔥12 days', 'Morning workout', 'No phone after 11pm') each with a 46px circular check button — first one checked with gradient fill; bottom tab bar Home/Journey/You with line icons. One screen, no scroll."

**2. Journey (analytics as care, not spreadsheet):**
"Design the Journey screen: GitHub-style year heatmap in mint shades on navy; a 'Best hour' insight card ('You win mornings — 82% before 9am' with a small time-of-day curve); 3 per-habit cards with success % and trend arrows; a 'weekly letter' teaser card written by the creature in warm first person. Data must be instantly readable — no decoration over the charts."

**3. Onboarding — starter choice (first-time magic):**
"Design the starter-choice screen: headline 'Who will grow with you?', the 3 starters (Kumo, Embr, Moss) as large cards with name + one-line personality, Embr selected with a glow ring and its egg cracking below; single CTA 'Begin our journey'. First-run delight allowed: this screen can be more generous and playful."

**4. Evolution ceremony (the screenshot moment):**
"Design the evolution reveal: darkened glade, creature mid-transformation in a white-gold glow burst, 'EVOLVED → GUARDIAN' title, small 'thanks to your 21-day consistency' line, confetti restrained and elegant, single 'Continue' button."

**5. Habit DNA share card (social/marketing asset, 9:16):**
"Design a shareable card: creature portrait + world silhouette, username, 'Day 42 flame', mini heatmap ring, lineage tag 'Moth-sage line', app name + subtle wordmark at bottom. Must look screenshot-worthy on Instagram stories."

**6. Add-habit sheet:**
"Design a bottom sheet over the dimmed Home screen: drag handle, 'New habit quest' title, name input, icon picker grid, verification choice (1-tap / auto via steps / auto via screen time) as 3 friendly option cards, 'Add quest' gradient CTA."

---

## PART 3 — ITERATION RULES (how to get the best out of the canvas)

- One screen per message. Never "design the whole app."
- Fix specifics with **inline comments on the element** ("creature 20% bigger", "this card's border too bright"); use **chat** only for structure ("swap stats above week strip"); use **direct edit** for spacing nudges.
- Ask for **variants** when unsure: "give me 3 variations of the creature's face — rounder / sleepier / bolder" — picking beats describing.
- When a screen is right: **Export → HTML/ZIP**, save into the repo as `design/reference/<screen>/`. It is a visual reference ONLY — the real app is built vanilla-JS per CLAUDE.md; exported code never gets pasted into the codebase.
- What Claude Design is NOT for: motion and gesture feel (that's DESIGN_MOTION_SPEC + the playable prototype), analytics chart correctness, or final creature animation rigs. It's for look, layout, art direction, and the share-worthy moments.
