// The weekly letter (MASTER_PLAN §3.2): the creature turns the week's data into care, never a
// scorecard. Pure and rule-based — no ML — so it is testable and honest. Framing is always "we"
// and never shames a miss (VALIDATION_REPORT §4 notification ethics).

const DAY_MS = 86400000;
const WEEKDAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function dayKey(ms) {
  const d = new Date(ms - new Date(ms).getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 10);
}

/**
 * @param log  completion log: { date:'YYYY-MM-DD', hid, ts, category }
 * @param creatureName the creature's name, for the voice
 * @returns { title, lines: string[] } — a short letter, or null when there is nothing to say yet
 */
export function weeklyLetter(log = [], creatureName = 'Your creature', now = Date.now(), notes = []) {
  // Distinct days shown up in the last 7.
  const windowDays = [];
  for (let i = 6; i >= 0; i -= 1) windowDays.push(dayKey(now - i * DAY_MS));
  const windowSet = new Set(windowDays);
  const daysShownUp = new Set(log.filter((e) => windowSet.has(e.date)).map((e) => e.date)).size;

  if (log.length === 0) {
    return {
      title: `A note from ${creatureName}`,
      lines: ['We are just getting started. Complete one quest and I will start to grow.'],
    };
  }

  const lines = [];
  // 1. Show-up count, warmly framed.
  if (daysShownUp >= 6) lines.push(`You showed up ${daysShownUp} of 7 days this week. I feel it — thank you.`);
  else if (daysShownUp >= 3) lines.push(`You showed up ${daysShownUp} of 7 days this week. Steady is how we grow.`);
  else if (daysShownUp >= 1) lines.push(`You came back ${daysShownUp} day${daysShownUp === 1 ? '' : 's'} this week. Every return counts, and I noticed.`);
  else lines.push('A quiet week. I have been waiting, not worried — come back when you can.');

  // 2. The hardest weekday, from all history (needs more than one week to mean anything).
  const perWeekday = new Array(7).fill(0);
  const weeksSeen = new Set();
  for (const e of log) {
    const t = e.ts ?? Date.parse(e.date);
    perWeekday[new Date(t).getDay()] += 1;
    weeksSeen.add(dayKey(t).slice(0, 7) + '-' + Math.floor(new Date(t).getDate() / 7));
  }
  const total = perWeekday.reduce((a, b) => a + b, 0);
  if (total >= 10) {
    let worst = 0;
    for (let d = 1; d < 7; d += 1) if (perWeekday[d] < perWeekday[worst]) worst = d;
    if (perWeekday[worst] * 7 < total) {   // clearly below an even split
      lines.push(`${WEEKDAY[worst]}s are hard for us. Want to make ${WEEKDAY[worst]}'s quest a little smaller?`);
    }
  }

  // 3. A memory from the week, in the creature's voice. The point of writing something down is
  // that it comes back to you later — a journal nobody reads back is just typing.
  const recent = notes
    .filter((n) => windowSet.has(n.date) && n.text?.trim())
    .sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  if (recent) lines.push(`You wrote: “${recent.text.trim()}” I kept it.`);

  return { title: `A note from ${creatureName}`, lines };
}
