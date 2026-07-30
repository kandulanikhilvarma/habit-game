# Design

<!-- impeccable:design-schema 1 -->

## The world

The category standard, executed properly. The user was offered four derived worlds and took the standing exit deliberately; convention is the commitment here, so it is built at full fidelity with no irony and no smuggled quirk.

The craft bar is **Duolingo** (one confident brand colour, characters carry the identity), **Apple Fitness** (saturated colour reserved for data, restrained everywhere else), and **Linear** (immaculate neutrals, spacing and type). Where those three disagree, the Operate surface follows Apple and Linear; the reward moments follow Duolingo.

## Colour strategy

**Restrained**: neutrals plus one accent. The visitor came to operate, and eleven creature images already span orange, violet, cyan, green and iridescent. Anything more than one accent puts the interface in competition with the only thing people open the app to see.

### Why the old palette failed

Mint-to-violet on navy is the default palette of the wellness and AI app category, so it read as a template rather than an identity. It was also used as a **fill on everything selected** — six check discs and seven day chips at once — which spent the accent until it meant nothing. And the navy ground tinted every creature, so art that should have looked lit looked filtered.

### Ground

Warm neutral, near-black in dark and near-white in light. Chosen from the use scene, not the category: one person, on a phone, last thing at night or first thing in the morning. Dark leads; light is fully supported.

| role | dark | light |
|---|---|---|
| bg | `#141519` | `#faf9f8` |
| surface | `#1c1d23` | `#ffffff` |
| raised | `#26272f` | `#f2f1f0` |
| border | `#34353f` | `#e2e0de` |
| text | `#f3f2f4` | `#1a1a20` |
| muted | `#a5a3ad` (6.76:1) | `#5e5c66` (6.57:1) |

### Brand

One colour, solid, never a gradient. Deep indigo `#4c5bd4` — the one hue the creature cast does not occupy, and deep enough to separate from all of them by value as well as hue.

- Fill (buttons, XP bar): `--brand` `#4c5bd4`, white text at 5.59:1.
- As text: `--brand-ink`, `#a5aeff` on dark (8.08:1), `#4450bf` on light (6.68:1). The dark ink is 1.9:1 on white, so light mode must darken it; this is why the token is themed.
- Selected states that repeat use `--brand-soft` / `--brand-line`, never the fill. An accent that lands on every repeated element stops meaning "this one".

### Data colours

The only other saturated colours, and they always carry meaning: `--violet` mind, `--flame` streak and body, `--mint` order and anything meaning "kept", `--blush`. Retuned for a warm neutral ground and darkened in light mode to hold contrast.

## Buttons

One family, four jobs, on `--radius-sm` like the rest of the controls. The app previously ran three
button systems at once: 999px pills (`.cta`, `.ask__btn`, `.chip-btn`), 12px controls and 18px cards,
all visible together.

| variant | use | treatment |
|---|---|---|
| `btn--primary` | the one action of a group | brand fill, white |
| `btn--secondary` | available, not the main thing | raised surface, border, **full** text colour |
| `btn--quiet` | low stakes, dismissals | text only |
| `btn--danger` | irreversible | text only in the danger colour; fills **only** once armed |

Rules that hold the uniformity:
- `.btn-row > .btn { flex: 1 1 0 }` — siblings in a row share the width. One button shrink-wrapping
  its label beside a full-width neighbour is what made the account card look unfinished.
- `btn--block` is explicit, never an accident of context.
- **At most one filled button per card.** Two primaries side by side is no primary.
- Secondary never uses `--text-muted`. That is the colour disabled controls use, and a live action
  wearing it reads as switched off.
- Destructive is the quietest control on the screen, never a full-width outlined peer of the
  primary. The one irreversible action should not compete for the tap.

## Type

Nunito, self-hosted, three sizes (`--size-title` 1.5rem, `--size-body` 1rem floor, `--size-small` 0.875rem). Weight carries emphasis. Gradient text is not used anywhere.

## Motion

Transform and opacity only. UI under 300ms; the overshoot curve is reserved for reward beats. `prefers-reduced-motion` handled on every animation.

## Standing bans in this project

- No gradient as a fill on repeated controls, and no gradient text.
- No kicker or eyebrow above a heading. (Back-links are `.backlink`, which is navigation.)
- No emoji as an icon; habit glyphs are drawn line icons in one stroke weight.
- No red, no loss framing, no streak shaming. A missed day dims the world, never ruins it.
- Colour is never the only carrier of state.

## Surfaces

- **App (`/play`)** — Operate. Scanability and familiar affordances outrank expression. The creature is the only thing allowed to be loud.
- **Marketing (`/about`)** — Persuade, same system. Leads with what genuinely ships; the Android auto-verification is named as what comes next, never as a current capability.
- **Compliance pages** — Read. Same tokens, nothing decorative.
