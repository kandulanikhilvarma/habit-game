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

// Lineage marks for stage 3+ (branching evolution). ponytail: this is a palette-and-mark overlay on
// the shared rig, NOT four bespoke redraws — VALIDATION_REPORT §6 explicitly costs branches as
// "different palettes, markings, 2-3 swapped parts, not full redraws". Full per-stage art is a
// deferred art pass; the mechanic — the data choosing the branch — is what ships here.
export const LINEAGE_STYLE = {
  ember:     { name: 'Ember-beast', accent: '#ff7a3c', glow: '#ffb066' },
  moth:      { name: 'Moth-sage',   accent: '#9d7bff', glow: '#c9b6ff' },
  sentinel:  { name: 'Sentinel',    accent: '#5ec7f0', glow: '#a6e6ff' },
  prismatic: { name: 'Prismatic',   accent: '#5ef0c0', glow: '#9d7bff' },
};

function lineageMark(lineage) {
  const l = LINEAGE_STYLE[lineage] ?? LINEAGE_STYLE.prismatic;
  if (lineage === 'ember') {
    return `<path d="M100 46 q10 16 4 30 q-4 -6 -10 -8 q2 12 -6 18 q-10 -14 0 -30 q6 -6 12 -10z" fill="${l.accent}"/>`;
  }
  if (lineage === 'moth') {
    return `<path d="M72 58 q-22 -6 -28 12 q18 8 28 -2z" fill="${l.accent}" opacity="0.85"/>
            <path d="M128 58 q22 -6 28 12 q-18 8 -28 -2z" fill="${l.accent}" opacity="0.85"/>`;
  }
  if (lineage === 'sentinel') {
    return `<path d="M100 44 l14 20 -14 10 -14 -10z" fill="${l.accent}"/>
            <path d="M100 44 l14 20 -14 10z" fill="${l.glow}" opacity="0.6"/>`;
  }
  // prismatic: a small aura ring
  return `<circle cx="100" cy="100" r="60" fill="none" stroke="${l.accent}" stroke-width="2" opacity="0.5"/>
          <circle cx="100" cy="100" r="66" fill="none" stroke="${l.glow}" stroke-width="1.5" opacity="0.3"/>`;
}

// Asleep after a long absence: a blanket and closed eyes, never a sad or dying creature. The
// blanket is a separate group so fx.js can slide it off in the wake-up ceremony.
function blanket(s) {
  return `
    <g id="blanket">
      <path d="M46 126 q54 -22 108 0 q6 26 -8 32 q-46 12 -92 0 q-14 -6 -8 -32z" fill="${s.trim}" opacity="0.85"/>
      <path d="M46 126 q54 -22 108 0" stroke="${s.shellLight}" stroke-width="4" fill="none" stroke-linecap="round"/>
      <text x="132" y="70" font-size="18" fill="${s.shellLight}" opacity="0.8">z</text>
      <text x="146" y="52" font-size="13" fill="${s.shellLight}" opacity="0.6">z</text>
    </g>`;
}

/**
 * @param species key of SPECIES
 * @param stage 1 = egg, 2 = hatchling, 3+ = branched (lineage-tinted)
 * @param opts.cracks 0-3 egg cracks; onboarding hands out the first one free (endowed progress)
 * @param opts.asleep true after 3+ missed days, until the next completion wakes it
 * @param opts.lineage 'ember'|'moth'|'sentinel'|'prismatic' — used from stage 3
 */
export function creatureSvg(species, stage, { cracks = 0, asleep = false, lineage = 'prismatic' } = {}) {
  const s = SPECIES[species] ?? SPECIES.kumo;
  const branched = stage >= 3;
  const style = LINEAGE_STYLE[lineage] ?? LINEAGE_STYLE.prismatic;
  // From stage 3 the shell takes on the lineage accent — the creature you built starts to show.
  const skin = branched ? { ...s, trim: style.accent } : s;

  let body = stage >= 2 ? hatchling(species, skin) : egg(skin, cracks);
  if (branched) {
    // Insert before the LAST </g> (body-group's close), not the first (which closes the eyes).
    const cut = body.lastIndexOf('</g>');
    body = `${body.slice(0, cut)}${lineageMark(lineage)}${body.slice(cut)}`;
  }
  if (asleep && stage >= 2) {
    // Closed eyes: swap the pupils for lids rather than drawing a second creature.
    body = body.replace(
      /<g id="eyes">[\s\S]*?<\/g>/,
      `<g id="eyes">
        <path d="M79 102 q7 6 14 0" stroke="${s.ink}" stroke-width="3" fill="none" stroke-linecap="round"/>
        <path d="M107 102 q7 6 14 0" stroke="${s.ink}" stroke-width="3" fill="none" stroke-linecap="round"/>
      </g>`,
    );
  }
  return `
    <svg viewBox="0 0 200 200" role="img" aria-label="${asleep ? 'Your creature, asleep' : 'Your creature'}">
      <ellipse id="shadow" cx="100" cy="164" rx="44" ry="10" fill="#050718" opacity="0.55"/>
      ${body}
      ${asleep ? blanket(s) : ''}
    </svg>`;
}
