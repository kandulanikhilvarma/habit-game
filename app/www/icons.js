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
