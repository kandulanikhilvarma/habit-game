// The glade (MASTER_PLAN §3.3): the creature's world reflects lifetime progress. Each habit kept
// ≥7 days plants one permanent thing; the light shifts with local time; neglect (no live global
// streak) dims the light and pauses growth but never ruins the scene — a paused world reads
// "waiting for you," a ruined one reads "delete the app." MVP: 1 biome, ≤10 elements.
//
// Colours come from CSS variables, not hex: this SVG is injected inline, so `var()` resolves
// against the page and the whole scene re-tints on the light/dark toggle with no JS involved.

const PLANT_AT = 7;       // a habit maintained ≥7 days plants something permanent
const MAX_ELEMENTS = 10;  // MVP cap on placeable elements
const VW = 400;
const VH = 120;

// A soft island, not a full-width band — the creature stands on a place, not on a slab.
const ISLAND = { cx: 200, cy: 62, rx: 178, ry: 34 };

/** y of the island's top arc at a given x, so plantings sit ON the ground instead of floating. */
function groundY(x) {
  const t = (x - ISLAND.cx) / ISLAND.rx;
  return ISLAND.cy - ISLAND.ry * Math.sqrt(Math.max(0, 1 - t * t));
}

// Time of day tints the light only. Kept low-opacity so it reads on both themes.
function daylight(hour) {
  if (hour < 6) return { key: 'night', glow: '#8ea2ff', strength: 0.24, lantern: true };
  if (hour < 8) return { key: 'dawn', glow: '#ffb37a', strength: 0.3, lantern: false };
  if (hour < 17) return { key: 'day', glow: '#ffe9a8', strength: 0.16, lantern: false };
  if (hour < 19) return { key: 'dusk', glow: '#ff9e6b', strength: 0.3, lantern: true };
  return { key: 'night', glow: '#8ea2ff', strength: 0.24, lantern: true };
}

// A soft contact shadow is what actually sells "standing on ground" when the ground itself has no
// hard edge — cheaper and better-looking than drawing a rim the eye reads as a plate.
function footing(x, y, rx) {
  return `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${rx * 0.28}" fill="var(--world-shade)" opacity="0.35"/>`;
}

// mind → grove tree, body → forge lantern, order → crystal spring (the region names used in You).
function plant(category, x, y, lit) {
  if (category === 'body') {
    return `<g class="plant plant--lantern">
      ${footing(x, y, 7)}
      <rect x="${x - 1.6}" y="${y - 23}" width="3.2" height="23" rx="1.6" fill="var(--world-post)"/>
      ${lit ? `<circle class="lantern-glow" cx="${x}" cy="${y - 27}" r="11" fill="var(--flame)" opacity="0.22"/>` : ''}
      <circle cx="${x}" cy="${y - 27}" r="5" fill="var(--flame)" opacity="${lit ? 0.95 : 0.4}"/>
    </g>`;
  }
  if (category === 'order') {
    return `<g class="plant plant--spring">
      <ellipse cx="${x}" cy="${y}" rx="14" ry="4.2" fill="var(--world-rim)" opacity="0.55"/>
      <ellipse cx="${x}" cy="${y - 1}" rx="8" ry="2.4" fill="var(--mint)" opacity="0.5"/>
      <path d="M${x - 3.4} ${y - 3} l3.4 -14 l3.4 14" fill="none" stroke="var(--violet)"
            stroke-width="2.4" stroke-linejoin="round"/>
    </g>`;
  }
  return `<g class="plant plant--tree">
    ${footing(x, y, 9)}
    <rect x="${x - 1.8}" y="${y - 17}" width="3.6" height="17" rx="1.8" fill="var(--world-post)"/>
    <circle cx="${x}" cy="${y - 22}" r="11" fill="var(--world-leaf)"/>
    <circle cx="${x - 6}" cy="${y - 17}" r="7" fill="var(--world-leaf-dark)"/>
    <circle cx="${x + 6}" cy="${y - 17}" r="7" fill="var(--world-leaf-light)"/>
  </g>`;
}

export function worldSvg(state, { now = Date.now() } = {}) {
  const light = daylight(new Date(now).getHours());
  const dim = (state.gStreak ?? 0) === 0;           // neglect: pause growth, dim the light
  const lit = light.lantern && !dim;
  const done = state.day?.doneIds?.length ?? 0;
  const perfectDay = state.habits.length > 0 && done === state.habits.length;

  const planted = state.habits.filter((h) => (h.total || 0) >= PLANT_AT).slice(0, MAX_ELEMENTS);

  // Alternate sides outward from the creature, which stands in the middle of its own glade.
  const plants = planted.map((h, i) => {
    const side = i % 2 === 0 ? -1 : 1;
    const rank = Math.floor(i / 2);
    const spread = 0.42 + (rank / Math.max(1, Math.ceil(planted.length / 2))) * 0.44;
    const x = ISLAND.cx + side * spread * ISLAND.rx;
    return plant(h.category || 'mind', x, groundY(x) + 10, lit);
  }).join('');

  const fireflies = (perfectDay && !dim)
    ? Array.from({ length: 6 }, (_, i) => {
        const x = 90 + i * 44;
        return `<circle class="firefly" cx="${x}" cy="${groundY(x) - 26 - (i % 3) * 9}" r="1.6"
                 fill="var(--flame)" style="--fd:${i * 0.4}s"/>`;
      }).join('')
    : '';

  return `<svg class="world${dim ? ' world--dim' : ''}" viewBox="0 0 ${VW} ${VH}"
       preserveAspectRatio="xMidYMid meet" width="100%" height="100%">
    <defs>
      <radialGradient id="w-sky" cx="50%" cy="72%" r="62%">
        <stop offset="0%" stop-color="${light.glow}" stop-opacity="${light.strength}"/>
        <stop offset="100%" stop-color="${light.glow}" stop-opacity="0"/>
      </radialGradient>
      <!-- Radial, not linear: the ground has to fade on every side. A hard perimeter reads as a
           plate the creature stands in front of, not as ground it stands on. -->
      <radialGradient id="w-ground" cx="50%" cy="46%" r="52%">
        <stop offset="0%" stop-color="var(--world-ground)" stop-opacity="0.8"/>
        <stop offset="58%" stop-color="var(--world-ground)" stop-opacity="0.4"/>
        <stop offset="100%" stop-color="var(--world-ground)" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <ellipse cx="${ISLAND.cx}" cy="${ISLAND.cy - 6}" rx="${ISLAND.rx}" ry="${ISLAND.ry + 18}" fill="url(#w-sky)"/>
    <ellipse cx="${ISLAND.cx}" cy="${ISLAND.cy}" rx="${ISLAND.rx}" ry="${ISLAND.ry}" fill="url(#w-ground)"/>
    ${plants}
    ${fireflies}
  </svg>`;
}
