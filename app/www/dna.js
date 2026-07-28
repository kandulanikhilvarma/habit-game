// The Habit DNA card (VALIDATION_REPORT §6, DESIGN_BRIEF #5): one shareable 9:16 image — the
// creature, its lineage, the streak flame, and a heatmap ring. "What did YOUR creature become?" is
// the referral loop (Wordle proved a daily shareable state beats any invite button).

import { creatureSvg, SPECIES, LINEAGE_STYLE } from './creature.js';
import { levelFromTotalXp, stageForLevel, attunementFrom, lineageFor } from './game-math.js';
import { heatmap } from './analytics.js';

const W = 1080;
const H = 1920;

/** Pull the creature's inner SVG out of its <svg> wrapper so it can be placed inside the card. */
function creatureInner(species, stage, lineage) {
  const svg = creatureSvg(species, stage, { cracks: 3, lineage });
  return svg.replace(/^\s*<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
}

/** A ring of the last 84 days, coloured by whether a habit was completed — the "chain" made round. */
function heatRing(log) {
  const cells = heatmap(log, { days: 84 });
  const cx = W / 2;
  const cy = 760;
  const r = 300;
  return cells.map((c, i) => {
    const a = (i / cells.length) * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    const on = c.count > 0;
    const dot = on ? Math.min(4, c.count) : 0;
    const fill = ['#1f2547', '#21506b', '#2f8a86', '#46c69f', '#5ef0c0'][dot];
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${on ? 7 : 4}" fill="${fill}"/>`;
  }).join('');
}

export function dnaCardSvg(state) {
  const { level } = levelFromTotalXp(state.creature.xp);
  const stage = stageForLevel(level);
  const lineage = lineageFor(attunementFrom(state.habits));
  const style = LINEAGE_STYLE[lineage] ?? LINEAGE_STYLE.prismatic;
  const species = SPECIES[state.creature.species] ?? SPECIES.kumo;
  const stageName = ['Egg', 'Hatchling', 'Sprite', 'Guardian', 'Radiant'][stage - 1];
  const lineageName = stage >= 3 ? `${style.name} line` : `${species.affinity} affinity`;
  const totalDone = state.habits.reduce((s, h) => s + (h.total || 0), 0);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs>
      <radialGradient id="bg" cx="50%" cy="30%" r="80%">
        <stop offset="0%" stop-color="#1c2150"/>
        <stop offset="60%" stop-color="#0d1022"/>
        <stop offset="100%" stop-color="#05060f"/>
      </radialGradient>
      <linearGradient id="accent" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#5ef0c0"/>
        <stop offset="100%" stop-color="#9d7bff"/>
      </linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#bg)"/>

    <text x="${W / 2}" y="150" text-anchor="middle" fill="#a7adcf" font-family="Nunito, sans-serif"
          font-size="44" letter-spacing="6">KUMO</text>

    ${heatRing(state.log ?? [])}

    <g transform="translate(${W / 2 - 260}, 560) scale(2.6)">
      ${creatureInner(state.creature.species, stage, lineage)}
    </g>

    <text x="${W / 2}" y="1180" text-anchor="middle" fill="#eef0ff" font-family="Nunito, sans-serif"
          font-size="96" font-weight="800">${escapeText(state.creature.name || 'Kumo')}</text>
    <text x="${W / 2}" y="1256" text-anchor="middle" fill="${style.accent}" font-family="Nunito, sans-serif"
          font-size="52" font-weight="700">${stageName} · ${lineageName}</text>

    <g font-family="Nunito, sans-serif" text-anchor="middle">
      ${statBlock(W / 2 - 300, `${state.gStreak}`, 'day flame')}
      ${statBlock(W / 2, `Lv ${level}`, 'level')}
      ${statBlock(W / 2 + 300, `${totalDone}`, 'quests done')}
    </g>

    <text x="${W / 2}" y="1820" text-anchor="middle" fill="#5b6288" font-family="Nunito, sans-serif"
          font-size="40">your habits are the controller</text>
  </svg>`;
}

function statBlock(x, value, label) {
  return `
    <text x="${x}" y="1480" fill="#eef0ff" font-size="84" font-weight="800">${value}</text>
    <text x="${x}" y="1540" fill="#a7adcf" font-size="40">${label}</text>`;
}

function escapeText(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Rasterise the card to a PNG blob — Instagram etc. want a bitmap, and the SVG is self-contained. */
async function toPng(svg) {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.width = W; img.height = H;
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    canvas.getContext('2d').drawImage(img, 0, 0, W, H);
    return await new Promise((res) => canvas.toBlob(res, 'image/png'));
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Share the card via the OS share sheet, or fall back to a download. */
export async function shareCard(state) {
  const png = await toPng(dnaCardSvg(state));
  const file = new File([png], 'kumo-dna.png', { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({ files: [file], title: 'My Kumo', text: 'What did your habits become?' });
    return 'shared';
  }
  const url = URL.createObjectURL(png);
  const a = document.createElement('a');
  a.href = url; a.download = 'kumo-dna.png';
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'downloaded';
}
