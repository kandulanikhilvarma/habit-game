// Firestore document paths from MASTER_PLAN §6.3. The app writes them and the rules test asserts
// against them, so a path can never drift away from the rule that protects it.

export const userPath = (uid) => `users/${uid}`;
export const habitPath = (uid, hid) => `users/${uid}/habits/${hid}`;
export const habitsPath = (uid) => `users/${uid}/habits`;
export const dayPath = (uid, date) => `users/${uid}/days/${date}`;
export const completionPath = (uid, date, hid) => `users/${uid}/completions/${date}_${hid}`;
