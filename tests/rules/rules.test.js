// Runs against the Firestore emulator: `npm run test:rules`.
// CLAUDE.md requires proof that another uid is denied before any rules change ships.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { userPath, habitPath, dayPath, completionPath } from '../../shared/paths.js';

let env;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'habit-game-rules-test',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});

after(async () => { await env?.cleanup(); });

test('owner can write their own habit', async () => {
  const db = env.authenticatedContext('uid_a').firestore();
  await assertSucceeds(setDoc(doc(db, 'users/uid_a/habits/read'), { name: 'Read 20 minutes' }));
});

test('another uid cannot write into that tree', async () => {
  const db = env.authenticatedContext('uid_b').firestore();
  await assertFails(setDoc(doc(db, 'users/uid_a/habits/read'), { name: 'stolen' }));
});

test('another uid cannot read that tree', async () => {
  const db = env.authenticatedContext('uid_b').firestore();
  await assertFails(getDoc(doc(db, 'users/uid_a/habits/read')));
});

test('signed-out access is denied', async () => {
  const db = env.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(db, 'users/uid_a/habits/read')));
});

test('feedback is create-only, never readable by a client', async () => {
  const db = env.authenticatedContext('uid_a').firestore();
  await assertSucceeds(setDoc(doc(db, 'feedback/f1'), { text: 'nice', screen: 'home' }));
  await assertFails(getDoc(doc(db, 'feedback/f1')));
});

test('collections outside the model are denied by default', async () => {
  const db = env.authenticatedContext('uid_a').firestore();
  await assertFails(setDoc(doc(db, 'secrets/x'), { a: 1 }));
});

// The paths below come from shared/paths.js — the same module the app writes through, so a rule
// can never silently stop matching the documents the game actually produces.
test('every document the app writes is allowed for its owner', async () => {
  const db = env.authenticatedContext('uid_a').firestore();
  const date = '2026-07-20';

  await assertSucceeds(setDoc(doc(db, userPath('uid_a')), {
    creature: { species: 'kumo', name: 'Kumo', xp: 60 },
    gStreak: 1, gBest: 1, freezes: 0, tz: 'Asia/Kolkata', updatedAt: Date.now(),
  }));
  await assertSucceeds(setDoc(doc(db, habitPath('uid_a', 'read')), {
    name: 'Read 20 minutes', category: 'mind', streak: 1, best: 1, total: 1,
  }));
  await assertSucceeds(setDoc(doc(db, dayPath('uid_a', date)), {
    done: 3, total: 3, perfect: true, xpEarned: 60, doneIds: ['read', 'workout', 'phone'],
  }));
  await assertSucceeds(setDoc(doc(db, completionPath('uid_a', date, 'read')), {
    hid: 'read', date, ts: Date.now(), source: 'manual', xp: 10,
  }));
});

test('those same documents are denied to another uid', async () => {
  const db = env.authenticatedContext('uid_b').firestore();
  const date = '2026-07-20';
  await assertFails(getDoc(doc(db, userPath('uid_a'))));
  await assertFails(getDoc(doc(db, dayPath('uid_a', date))));
  await assertFails(setDoc(doc(db, completionPath('uid_a', date, 'read')), { hid: 'read', xp: 999 }));
});
