// The glade (MASTER_PLAN §3.3): the creature's world reflects lifetime progress. Each habit kept
// ≥7 days plants one permanent thing; the sky tints to local time; neglect (no live global streak)
// dims the light and pauses growth but never ruins the scene — a paused world reads "waiting for
// you," a ruined one reads "delete the app." MVP: 1 biome, ≤10 elements, real-time day/night.

const PLANT_AT = 7;       // a habit maintained ≥7 days plants something permanent
const MAX_ELEMENTS = 10;  // MVP cap on placeable elements
const VW = 400;
const GROUND = 128;       // horizon y within the 0 0 400 160 viewBox

// Time-of-day palettes. Only lighting changes with neglect (dim), never the plantings themselves.
function palette(hour) {
  if (hour < 6) return { key: 'night', hill: '#161a33', hillTop: '#20264a', orb: '#cdd6ff', orbY: 40, glow: 1 };
  if (hour < 8) return { key: 'dawn', hill: '#2a2340', hillTop: '#3d3357', orb: '#ffd39b', orbY: 54, glow: 0.5 };
  if (hour < 17) return { key: 'day', hill: '#1f294a', hillTop: '#2c3a63', orb: '#ffe9a8', orbY: 32, glow: 0 };
  if (hour < 19) return { key: 'dusk', hill: '#2b2545', hillTop: '#402f4e', orb: '#ff9e6b', orbY: 52, glow: 0.5 };
  return { key: 'night', hill: '#161a33', hillTop: '#20264a', orb: '#cdd6ff', orbY: 40, glow: 1 };
}

// mind → grove tree, body → forge lantern, order → crystal spring (matches the region names in You).
function element(category, x, lit) {
  const g = GROUND;
  if (category === 'body') {
    const on = lit ? 0.9 : 0.25;
    return `<g>
      <rect x="${x - 1.5}" y="${g - 22}" width="3" height="22" rx="1.5" fill="#3a3f63"/>
      <circle cx="${x}" cy="${g - 26}" r="5" fill="#ffd166" opacity="${on}"/>
      ${lit ? `<circle cx="${x}" cy="${g - 26}" r="10" fill="#ffd166" opacity="0.18"/>` : ''}
    </g>`;
  }
  if (category === 'order') {
    return `<g>
      <ellipse cx="${x}" cy="${g - 1}" rx="14" ry="4" fill="#2f8a86" opacity="0.6"/>
      <ellipse cx="${x}" cy="${g - 2}" rx="8" ry="2.4" fill="#5ef0c0" opacity="0.7"/>
      <path d="M${x - 3} ${g - 2} l3 -12 l3 12" fill="none" stroke="#9d7bff" stroke-width="2" stroke-linejoin="round"/>
    </g>`;
  }
  // mind (and any custom) → a tree
  return `<g>
    <rect x="${x - 1.5}" y="${g - 16}" width="3" height="16" rx="1.5" fill="#4a3b2f"/>
    <circle cx="${x}" cy="${g - 20}" r="11" fill="#3f7d5a"/>
    <circle cx="${x - 6}" cy="${g - 16}" r="7" fill="#356b4d"/>
    <circle cx="${x + 6}" cy="${g - 16}" r="7" fill="#4a8f66"/>
  </g>`;
}

export function worldSvg(state, { now = Date.now() } = {}) {
  const hour = new Date(now).getHours();
  const pal = palette(hour);
  const dim = (state.gStreak ?? 0) === 0;           // neglect: pause growth, dim the light
  const lit = pal.glow > 0 && !dim;                 // lanterns glow at night unless neglected
  const done = state.day?.doneIds?.length ?? 0;
  const perfectDay = state.habits.length > 0 && done === state.habits.length;

  const planted = state.habits
    .filter((h) => (h.total || 0) >= PLANT_AT)
    .slice(0, MAX_ELEMENTS);

  // Spread plantings evenly across the width, seeded off the habit id so each keeps its spot.
  const els = planted.map((h, i) => {
    const x = 40 + ((i + 0.5) / planted.length) * (VW - 80);
    return element(h.category || 'mind', x, lit);
  }).join('');

  // Fireflies on a perfect day (§3.3). Motion is CSS (.firefly), reduced-motion drops it.
  const fireflies = (perfectDay && !dim)
    ? Array.from({ length: 6 }, (_, i) => {
        const x = 60 + i * 48; const y = GROUND - 40 - (i % 3) * 14;
        return `<circle class="firefly" cx="${x}" cy="${y}" r="1.8" fill="#ffe9a8" style="--fd:${i * 0.4}s"/>`;
      }).join('')
    : '';

  return `<svg viewBox="0 0 ${VW} 160" preserveAspectRatio="xMidYEnd meet" width="100%" height="100%"
       style="opacity:${dim ? 0.55 : 1};transition:opacity var(--t-ui,240ms) var(--ease-out,ease)">
    <circle cx="${VW - 70}" cy="${pal.orbY}" r="12" fill="${pal.orb}" opacity="${pal.glow ? 0.9 : 0.75}"/>
    <path d="M0 ${GROUND} Q ${VW * 0.28} ${GROUND - 22} ${VW * 0.5} ${GROUND - 8}
             T ${VW} ${GROUND - 14} V160 H0 Z" fill="${pal.hillTop}"/>
    <path d="M0 ${GROUND + 6} Q ${VW * 0.35} ${GROUND - 4} ${VW * 0.62} ${GROUND + 4}
             T ${VW} ${GROUND} V160 H0 Z" fill="${pal.hill}"/>
    ${els}
    ${fireflies}
  </svg>`;
}
