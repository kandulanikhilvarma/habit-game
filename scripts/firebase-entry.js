// esbuild bundles exactly these symbols into app/www/vendor/firebase.js.
// The frontend stays bundler-free: it imports one plain ESM file, nothing else changes.
// Keep this list minimal — every export added here lands in the APK payload.
export { initializeApp } from 'firebase/app';
export {
  getAuth, signInAnonymously, onAuthStateChanged, connectAuthEmulator,
} from 'firebase/auth';
export {
  initializeFirestore, persistentLocalCache, connectFirestoreEmulator,
  doc, getDoc, setDoc, collection, getDocs, writeBatch, serverTimestamp,
} from 'firebase/firestore';
