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
