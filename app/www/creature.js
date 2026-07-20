// Kumo, stages 1-2. Parts carry ids so fx.js can transform them; nothing here animates itself.
// Stage 3+ (branching evolution, VALIDATION_REPORT §6) is Gate 2 — it swaps parts on this same rig.

const CRACKS = [
  'M92 62 l7 9 -9 7 8 10',
  'M112 92 l-8 7 9 8 -7 9',
  'M78 104 l9 6 -6 9 10 7',
];

function egg(cracks) {
  const shown = CRACKS.slice(0, cracks)
    .map((d) => `<path d="${d}" stroke="#3b2f6b" stroke-width="3" fill="none" stroke-linecap="round"/>`)
    .join('');
  return `
    <g id="body-group">
      <ellipse id="body" cx="100" cy="96" rx="46" ry="56" fill="#b9a7ff"/>
      <ellipse cx="86" cy="74" rx="16" ry="20" fill="#d6cbff" opacity="0.75"/>
      <path d="M60 110 q40 22 80 0" stroke="#9d7bff" stroke-width="6" fill="none" stroke-linecap="round"/>
      ${shown}
    </g>`;
}

function hatchling() {
  return `
    <g id="body-group">
      <ellipse id="body" cx="100" cy="104" rx="52" ry="44" fill="#c3b4ff"/>
      <ellipse cx="82" cy="88" rx="18" ry="14" fill="#e2daff" opacity="0.7"/>
      <g id="eyes">
        <ellipse id="eye-l" cx="86" cy="102" rx="7" ry="9" fill="#241c46"/>
        <ellipse id="eye-r" cx="114" cy="102" rx="7" ry="9" fill="#241c46"/>
        <circle cx="88" cy="98" r="2.4" fill="#ffffff"/>
        <circle cx="116" cy="98" r="2.4" fill="#ffffff"/>
      </g>
      <path d="M94 118 q6 6 12 0" stroke="#241c46" stroke-width="3" fill="none" stroke-linecap="round"/>
      <ellipse cx="70" cy="112" rx="7" ry="5" fill="#ff8fb1" opacity="0.55"/>
      <ellipse cx="130" cy="112" rx="7" ry="5" fill="#ff8fb1" opacity="0.55"/>
      <path d="M100 60 q10 -14 22 -8 q-6 12 -22 14z" fill="#9d7bff"/>
    </g>`;
}

/** @param stage 1 = egg, 2 = hatchling. @param cracks 0-3 egg cracks earned from completions. */
export function creatureSvg(stage, cracks = 0) {
  const body = stage >= 2 ? hatchling() : egg(cracks);
  return `
    <svg viewBox="0 0 200 200" role="img" aria-label="Your creature, Kumo">
      <ellipse id="shadow" cx="100" cy="164" rx="44" ry="10" fill="#050718" opacity="0.55"/>
      ${body}
    </svg>`;
}
