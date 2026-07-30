// Lucide-style line icons: one 24x24 viewBox, 2px stroke, round caps. No emoji in UI chrome.
const svg = (paths) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;

export const icons = {
  star: svg('<path d="M12 3l2.6 5.6 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.4l6-.8z"/>'),
  flame: svg(
    '<path d="M12 2.5c.4 3 2 4.2 3.4 5.8A7 7 0 0 1 17.5 13a5.5 5.5 0 0 1-11 0c0-2 .8-3.4 2-4.7.3 1 .9 1.7 1.7 2 0-2.6.6-5.4 1.8-7.8z"/>' +
    '<path d="M12 21a3 3 0 0 1-3-3c0-1.5 1.2-2.4 1.8-3.6.6 1 1.4 1.5 2.4 1.9.9.4 1.8 1 1.8 2.2A3 3 0 0 1 12 21z"/>'
  ),
  check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  home: svg('<path d="M4 10.5L12 4l8 6.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/>'),
  chart: svg('<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/>'),
  user: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6"/>'),
};

// Habit glyphs, same line language as the chrome above. Emoji read as scattered next to drawn UI:
// twelve fonts, twelve weights, twelve colours nobody chose.
export const habitIcons = {
  book:    svg('<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H19v3H6.5A2.5 2.5 0 0 1 4 20.5z"/>'),
  lotus:   svg('<path d="M12 4c1.8 2 2.6 4 2.6 6.2S13.6 14.4 12 16c-1.6-1.6-2.6-3.6-2.6-5.8S10.2 6 12 4z"/><path d="M12 16c-2-1.4-4.4-2-6.6-1.6.4 2.2 2 4 4.2 4.8"/><path d="M12 16c2-1.4 4.4-2 6.6-1.6-.4 2.2-2 4-4.2 4.8"/>'),
  pen:     svg('<path d="M15.5 4.5l4 4L8 20H4v-4z"/><path d="M13.5 6.5l4 4"/>'),
  run:     svg('<circle cx="15" cy="5" r="2"/><path d="M13 21l1.5-5-3-2.5 1-4.5 3.5 2 3 1"/><path d="M11.5 9L7 10l-1 3"/><path d="M11.5 13.5L8 21"/>'),
  walk:    svg('<circle cx="13" cy="4.5" r="2"/><path d="M11 21l1.5-6-2.5-2.5.5-4 3 1.5 2.5 2"/><path d="M9.5 13L8 21"/>'),
  water:   svg('<path d="M12 3.5c3.5 4 6 6.8 6 9.8a6 6 0 0 1-12 0c0-3 2.5-5.8 6-9.8z"/>'),
  moon:    svg('<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5z"/>'),
  phoneOff: svg('<path d="M8 3h8a1 1 0 0 1 1 1v5"/><path d="M17 15v5a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V7"/><path d="M3 3l18 18"/>'),
  music:   svg('<path d="M9 18V6l10-2v12"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="16" r="2"/>'),
  broom:   svg('<path d="M15 4l5 5"/><path d="M14 9l-8 8-3 4 4-3 8-8z"/><path d="M9 14l1 1"/>'),
  salad:   svg('<path d="M4 12h16a8 8 0 0 1-16 0z"/><path d="M8 12a4 4 0 0 1 8 0"/><path d="M12 8V5"/>'),
  sun:     svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
};

// Old saves stored an emoji. Map the ones the app itself handed out so existing habits get an icon
// instead of the picker's leftovers; anything the user typed themselves still renders as it was.
const EMOJI_TO_ICON = {
  '📖': 'book', '🧘': 'lotus', '✍️': 'pen', '🏃': 'run', '🚶': 'walk', '💧': 'water',
  '🌙': 'moon', '📵': 'phoneOff', '🎸': 'music', '🧹': 'broom', '🥗': 'salad', '☀️': 'sun',
};

/** An icon when we know the glyph, the original character when we do not. */
export function habitGlyph(glyph) {
  const key = habitIcons[glyph] ? glyph : EMOJI_TO_ICON[glyph];
  if (key && habitIcons[key]) return `<span class="glyph-icon">${habitIcons[key]}</span>`;
  return `<span class="glyph-emoji">${String(glyph ?? '').replace(/[<>&]/g, '')}</span>`;
}
