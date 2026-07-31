# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

One person, on their own phone, checking in on habits they chose for themselves. They are not managing a team or reporting to anyone. The daily visit is short — open, tap what they did, see the creature react, close. Most sessions never leave the home screen. They arrive already carrying guilt about habits they have dropped before; every competing app they have tried has punished them for missing a day, and they quit it.

The secondary audience is whoever they show the creature to. Sharing is the growth mechanism, so the creature has to be worth showing to someone who does not use the app.

## Product Purpose

Bud turns the habits a person actually keeps into a creature that grows with them. Completing a habit feeds it; consistency evolves it. Success is a person returning tomorrow without being nagged into it, and still being there in month three.

The creature is the point, not a mascot on top of a checklist. Which habits you keep decides what it becomes, so the finished creature is a readable record of a real life rather than a score.

## Positioning

Branching evolution driven by lived behavior: a person's blend of mind, body and order habits selects one of four lineages, and from stage 3 the creature visibly becomes that branch. Two people with identical streak counts end up with different creatures. A neighboring habit tracker cannot copy this without also modelling what kind of consistency you have, not just how much.

The planned differentiator, not yet built, is auto-verification on Android: screen time and Health Connect completing habits without a tap, so the game moves because the person's life moved. Until that ships it must not be described as a current capability.

## Operating Context

- Phone, one-handed, often in the first or last few minutes of a day.
- Offline is normal, not an edge case. The app works with no network and no account; sign-in only links progress across devices.
- Home is the 90% surface. Journey (analytics, the weekly letter, the memories journal) and You (habits, account, sharing) are visited occasionally.
- The share card is a 9:16 image that leaves the app entirely and is judged next to whatever else is in a camera roll.
- A marketing page at `/about` and the compliance pages carry the same identity and are read on the same phone.

## Capabilities and Constraints

- Vanilla HTML/CSS/JS. No framework, no CSS library, no animation library. Capacitor is the Android shell.
- Flask on Vercel, Firebase for auth and Firestore. Vercel Hobby limits apply.
- Light and dark themes both ship and both must hold WCAG AA (4.5:1 for text).
- Motion is transform and opacity only; `prefers-reduced-motion` is handled everywhere. UI motion under 300ms.
- Touch targets 44px minimum.
- Raw health and usage data never leaves the device; only derived completion events sync.
- Game math lives in `shared/game-math.js` and is the single source of truth for XP, levels, stages, moods and streaks.

## Brand Commitments

- The name is **Bud**, renamed from Kumo before any Play release, while the `appId` was still free
  to change. Chosen for being sayable on first hearing, and for meaning both a sprout and a
  companion, which are both literally true of the creature. The cloud starter species keeps the
  name Kumo: that is a creature in the game, not the product.
- **The eleven creature images are fixed and may not be regenerated.** Six starters (kumo violet-cloud, embr coral, moss green, aqua cyan, sol gold, nyx indigo), four lineage Guardians (ember orange, moth violet, sentinel cyan, prismatic iridescent) and a shared Radiant form (green). Any palette must sit under art that already spans orange, violet, cyan, green and iridescent without clashing.
- Voice is warm and plain, never a coach and never a scold. The creature sleeps when neglected and wakes when you return; there is no guilt copy, no shame streak, no red.
- The logo mark is currently the moth-sage Guardian. Not locked; delegated to design judgment.
- **Standing visual preference: the category standard.** Offered four derived visual worlds and the
  conventional path, the user chose convention deliberately. Bud should sit alongside Duolingo,
  Apple Fitness and Linear, and their craft level is the bar. Future visual work executes the
  familiar form at full fidelity rather than reopening the direction.

## Evidence on Hand

- Working product, deployed: `https://habit-game-67x5.vercel.app` (app at `/play`, marketing at `/about`).
- Creature art at `app/www/assets/creatures/` (11 PNGs, transparent, 512px).
- 114 passing tests; CI green on every PR.
- **No real users, no usage data, no testimonials, no press, no revenue.** Nothing may claim otherwise. The Android auto-verification does not exist yet and must not be shown as working.

## Product Principles

1. **Never punish.** A missed day pauses the world; it never ruins it. No red, no streak-shaming, no loss framing.
2. **The creature carries the product.** Identity, reward and shareability all live in it. Interface recedes; the creature does not.
3. **Consistency beats volume.** Habits kept over time outrank habits added. The cap is 7 and the onboarding cap is 3.
4. **Honest by construction.** An insight appears only when the data supports it. The product does not flatter.
5. **Works alone and offline.** No account, no network, no social graph required to get the whole loop.

## Accessibility & Inclusion

WCAG AA contrast in both themes. `prefers-reduced-motion` respected on every animation. Colour is never the only carrier of state. Icon-only controls carry labels.
