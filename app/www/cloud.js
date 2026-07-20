// Firestore transport. The game never waits on it: local state renders first, the cloud catches up.
// Offline is the SDK's job — persistentLocalCache queues writes and replays them on reconnect.

import {
  initializeApp, getAuth, signInAnonymously, onAuthStateChanged, connectAuthEmulator,
  initializeFirestore, persistentLocalCache, connectFirestoreEmulator,
  doc, getDoc, getDocs, collection, writeBatch,
} from './vendor/firebase.js';
import { userPath, habitPath, habitsPath, dayPath, completionPath } from './paths.js';

/** Returns a context, or null when no Firebase config is present (the app then runs local-only). */
export async function initCloud() {
  let config;
  try {
    ({ firebaseConfig: config } = await import('./firebase-config.js'));
  } catch {
    return null;
  }
  if (!config?.projectId) return null;

  const app = initializeApp(config);
  const db = initializeFirestore(app, { localCache: persistentLocalCache() });
  const auth = getAuth(app);

  if (config.useEmulator) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
  }

  await signInAnonymously(auth);
  const uid = await new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => user && resolve(user.uid));
  });
  return { db, uid };
}

/** Whole-state pull, used once at boot. Returns null for a brand-new account. */
export async function pullState({ db, uid }, today) {
  const userSnap = await getDoc(doc(db, userPath(uid)));
  if (!userSnap.exists()) return null;

  const habitsSnap = await getDocs(collection(db, habitsPath(uid)));
  const daySnap = await getDoc(doc(db, dayPath(uid, today)));
  const dayData = daySnap.exists() ? daySnap.data() : {};

  return {
    ...userSnap.data(),
    habits: habitsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
    day: { date: today, doneIds: dayData.doneIds ?? [], xpEarned: dayData.xpEarned ?? 0 },
  };
}

/**
 * One batch per completion: the user doc, the habit, today's rollup, and the completion row that
 * every §4.4 insight is later computed from. Instrumented from day one — this cannot be backfilled.
 */
export async function pushCompletion({ db, uid }, state, { hid, xp, source = 'manual' }) {
  const date = state.day.date;
  const habit = state.habits.find((h) => h.id === hid);
  const batch = writeBatch(db);

  const { habits, day, ...user } = state;
  batch.set(doc(db, userPath(uid)), { ...user, updatedAt: Date.now() }, { merge: true });
  batch.set(doc(db, habitPath(uid, hid)), habit, { merge: true });
  batch.set(doc(db, dayPath(uid, date)), {
    done: day.doneIds.length,
    total: habits.length,
    perfect: day.doneIds.length === habits.length,
    xpEarned: day.xpEarned,
    doneIds: day.doneIds,
  });
  batch.set(doc(db, completionPath(uid, date, hid)), { hid, date, ts: Date.now(), source, xp });

  // Not awaited on the UI path: with persistentLocalCache this resolves after the network settles,
  // which may be tomorrow. The local write already happened.
  return batch.commit();
}

/** First-run seed so a new account has its habits in the cloud before any completion. */
export async function pushWholeState({ db, uid }, state) {
  const { habits, day, ...user } = state;
  const batch = writeBatch(db);
  batch.set(doc(db, userPath(uid)), { ...user, updatedAt: Date.now() }, { merge: true });
  habits.forEach((h) => batch.set(doc(db, habitPath(uid, h.id)), h, { merge: true }));
  return batch.commit();
}
