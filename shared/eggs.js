// Eggs (MASTER_PLAN §3.4): a perfect day sometimes drops a cosmetic that settles into the glade.
// Cosmetic only, forever — the moment it buys progress it becomes a reason to distrust the game.
//
// The point is that it is *sometimes*. A reward that always arrives stops being noticed; an
// occasional one keeps a perfect day worth chasing after the novelty of the streak wears off.

export const EGG_CHANCE = 0.25;

// Each is drawn procedurally in world.js, so a new one costs a shape, not an asset.
export const DECOR = ['mushrooms', 'crystal', 'flowers', 'firepit', 'archway', 'pond'];

/**
 * What today's perfect day drops, if anything.
 * @param unlocked already-owned decor keys — nothing is ever awarded twice
 * @param rng injectable so the roll can be tested instead of hoped about
 * @returns a decor key, or null for no drop / nothing left to find
 */
export function rollEgg({ perfect, unlocked = [], rng = Math.random } = {}) {
  if (!perfect) return null;
  const left = DECOR.filter((d) => !unlocked.includes(d));
  if (left.length === 0) return null;
  if (rng() >= EGG_CHANCE) return null;
  return left[Math.min(left.length - 1, Math.floor(rng() * left.length))];
}

export function decorLabel(key) {
  return {
    mushrooms: 'a ring of mushrooms',
    crystal: 'a humming crystal',
    flowers: 'a patch of wildflowers',
    firepit: 'a small firepit',
    archway: 'a mossy archway',
    pond: 'a still pond',
  }[key] ?? 'something new';
}
