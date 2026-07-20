// The three starters, stages 1-2. Parts carry ids so fx.js can transform them; nothing here
// animates itself. Stage 3+ (branching evolution, VALIDATION_REPORT §6) is Gate 2 — it swaps
// parts on this same rig, which is why every species shares one body/eyes/shadow structure.

export const SPECIES = {
  kumo: {
    name: 'Kumo',
    tagline: 'Gentle and sleepy. Reads the room before it speaks.',
    affinity: 'mind',
    shell: '#b9a7ff', shellLight: '#d6cbff', ink: '#241c46', trim: '#9d7bff',
  },
  embr: {
    name: 'Embr',
    tagline: 'All spark. Will hype you through a workout.',
    affinity: 'body',
    shell: '#ff9d7a', shellLight: '#ffc9b0', ink: '#3d1c14', trim: '#ff6b4a',
  },
  moss: {
    name: 'Moss',
    tagline: 'Steady and unbothered. Keeps time better than you do.',
    affinity: 'order',
    shell: '#8fd9a8', shellLight: '#c3f0d2', ink: '#16351f', trim: '#4bb37a',
  },
};

const CRACKS = [
  'M92 62 l7 9 -9 7 8 10',
  'M112 92 l-8 7 9 8 -7 9',
  'M78 104 l9 6 -6 9 10 7',
];

function egg(s, cracks) {
  const shown = CRACKS.slice(0, cracks)
    .map((d) => `<path d="${d}" stroke="${s.ink}" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.7"/>`)
    .join('');
  return `
    <g id="body-group">
      <ellipse id="body" cx="100" cy="96" rx="46" ry="56" fill="${s.shell}"/>
      <ellipse cx="86" cy="74" rx="16" ry="20" fill="${s.shellLight}" opacity="0.75"/>
      <path d="M60 110 q40 22 80 0" stroke="${s.trim}" stroke-width="6" fill="none" stroke-linecap="round"/>
      ${shown}
    </g>`;
}

// One silhouette cue per species so they read apart at thumbnail size: a wisp, a spark tail, a sprout.
function crest(species, s) {
  if (species === 'embr') return `<path d="M118 62 q16 -10 22 -24 q6 20 -6 32 q-8 6 -16 2z" fill="${s.trim}"/>`;
  if (species === 'moss') return `<path d="M100 62 q-4 -18 -20 -22 q4 18 14 24z" fill="${s.trim}"/><circle cx="100" cy="60" r="5" fill="${s.trim}"/>`;
  return `<path d="M100 60 q10 -14 22 -8 q-6 12 -22 14z" fill="${s.trim}"/>`;
}

function hatchling(species, s) {
  return `
    <g id="body-group">
      <ellipse id="body" cx="100" cy="104" rx="52" ry="44" fill="${s.shell}"/>
      <ellipse cx="82" cy="88" rx="18" ry="14" fill="${s.shellLight}" opacity="0.7"/>
      <g id="eyes">
        <ellipse id="eye-l" cx="86" cy="102" rx="7" ry="9" fill="${s.ink}"/>
        <ellipse id="eye-r" cx="114" cy="102" rx="7" ry="9" fill="${s.ink}"/>
        <circle cx="88" cy="98" r="2.4" fill="#ffffff"/>
        <circle cx="116" cy="98" r="2.4" fill="#ffffff"/>
      </g>
      <path d="M94 118 q6 6 12 0" stroke="${s.ink}" stroke-width="3" fill="none" stroke-linecap="round"/>
      <ellipse cx="70" cy="112" rx="7" ry="5" fill="#ff8fb1" opacity="0.55"/>
      <ellipse cx="130" cy="112" rx="7" ry="5" fill="#ff8fb1" opacity="0.55"/>
      ${crest(species, s)}
    </g>`;
}

/**
 * @param species key of SPECIES
 * @param stage 1 = egg, 2 = hatchling
 * @param cracks 0-3 egg cracks; onboarding hands out the first one free (endowed progress)
 */
export function creatureSvg(species, stage, cracks = 0) {
  const s = SPECIES[species] ?? SPECIES.kumo;
  const body = stage >= 2 ? hatchling(species, s) : egg(s, cracks);
  return `
    <svg viewBox="0 0 200 200" role="img" aria-label="Your creature">
      <ellipse id="shadow" cx="100" cy="164" rx="44" ry="10" fill="#050718" opacity="0.55"/>
      ${body}
    </svg>`;
}
