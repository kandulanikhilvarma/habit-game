// Firestore transport. The game never waits on it: local state renders first, the cloud catches up.
// Offline is the SDK's job — persistentLocalCache queues writes and replays them on reconnect.

import {
  initializeApp, getAuth, signInAnonymously, onAuthStateChanged, connectAuthEmulator,
  GoogleAuthProvider, linkWithRedirect, signInWithRedirect, getRedirectResult,
  signInWithPopup, linkWithPopup, signInWithCredential, signOut,
  initializeFirestore, persistentLocalCache, connectFirestoreEmulator,
  doc, getDoc, getDocs, deleteDoc, collection, writeBatch,
} from './vendor/firebase.js';
import { userPath, habitPath, habitsPath, dayPath, completionPath } from './paths.js';

let authRef = null;   // kept so the You screen can start sign-in / sign-out without re-init

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
  authRef = auth;

  if (config.useEmulator) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
  }

  // Finish any Google redirect that navigated us back here before deciding whether to sign in.
  // A credential already tied to another account surfaces here; we fall back to signing into it.
  let authError = null;
  try {
    await getRedirectResult(auth);
  } catch (err) {
    if (err?.code === 'auth/credential-already-in-use') {
      const cred = GoogleAuthProvider.credentialFromError(err);
      if (cred) { const { signInWithCredential } = await import('./vendor/firebase.js'); await signInWithCredential(auth, cred); }
    } else {
      authError = err?.code || err?.message || 'sign-in failed';
      console.warn('redirect sign-in failed', err);
    }
  }

  // Only create an anonymous session if nobody is signed in — never clobber a real Google session.
  if (!auth.currentUser) await signInAnonymously(auth);
  const user = auth.currentUser ?? await new Promise((resolve) => {
    onAuthStateChanged(auth, (u) => u && resolve(u));
  });
  return { db, uid: user.uid, user, authError };
}

/** Who is signed in, for the You screen: anonymous vs a linked Google identity. */
export function currentIdentity() {
  const u = authRef?.currentUser;
  if (!u) return { anonymous: true, email: null, name: null, uid: null };
  return { anonymous: u.isAnonymous, email: u.email, name: u.displayName, uid: u.uid };
}

/**
 * Fire `cb(identity)` on every auth change — this is the fix for "signed in but still shows login":
 * a redirect that completes after boot (or a link that lands late) now updates the UI live instead
 * of being read once and forgotten.
 */
export function watchAuth(cb) {
  if (!authRef) return;
  onAuthStateChanged(authRef, () => cb(currentIdentity()));
}

/** Persist the signed-in profile (email, name) onto the user's Firestore doc, so the account is
 *  recoverable and visible in the console — anonymous users write null and stay unidentified. */
export async function saveProfile({ db, uid }) {
  const u = authRef?.currentUser;
  if (!u || u.isAnonymous) return;
  const { setDoc } = await import('./vendor/firebase.js');
  await setDoc(doc(db, userPath(uid)), {
    email: u.email ?? null,
    displayName: u.displayName ?? null,
    isAnonymous: false,
    updatedAt: Date.now(),
  }, { merge: true });
}

/**
 * Start Google sign-in. Popup FIRST: on iOS Safari the redirect flow loses its state to tracking
 * prevention and getRedirectResult returns empty, leaving the user a guest — a popup keeps auth in
 * the same page and avoids that. Falls back to redirect only if the popup is blocked.
 * Anonymous users are LINKED so their progress carries onto the Google account; if that Google
 * identity already owns an account, we sign into it instead.
 */
export async function startGoogleSignIn() {
  if (!authRef) return;
  const provider = new GoogleAuthProvider();
  const u = authRef.currentUser;
  try {
    if (u && u.isAnonymous) await linkWithPopup(u, provider);
    else await signInWithPopup(authRef, provider);
  } catch (err) {
    if (err?.code === 'auth/credential-already-in-use') {
      const cred = GoogleAuthProvider.credentialFromError(err);
      if (cred) await signInWithCredential(authRef, cred);
      return;
    }
    if (err?.code === 'auth/popup-blocked' || err?.code === 'auth/operation-not-supported-in-this-environment'
        || err?.code === 'auth/cancelled-popup-request') {
      if (u && u.isAnonymous) await linkWithRedirect(u, provider);
      else await signInWithRedirect(authRef, provider);
      return;
    }
    throw err;   // popup-closed-by-user and real errors bubble to the caller's toast
  }
}

export async function signOutUser() {
  if (authRef) await signOut(authRef);
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

/** Remove habit docs from Firestore. Without this a deleted habit's subdoc lingers and the next
 *  pull resurrects it — which is how duplicates came back after a delete. */
export async function deleteHabits({ db, uid }, ids = []) {
  await Promise.all(ids.map((id) => deleteDoc(doc(db, habitPath(uid, id)))));
}

/** First-run seed so a new account has its habits in the cloud before any completion. */
export async function pushWholeState({ db, uid }, state) {
  const { habits, day, ...user } = state;
  const batch = writeBatch(db);
  batch.set(doc(db, userPath(uid)), { ...user, updatedAt: Date.now() }, { merge: true });
  habits.forEach((h) => batch.set(doc(db, habitPath(uid, h.id)), h, { merge: true }));
  return batch.commit();
}
