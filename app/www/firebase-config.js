// Firebase web config for the habit-game-111c8 project. These values are NOT secret — the apiKey is
// a public project identifier, and access is enforced by Firestore security rules + Auth, not by
// hiding this file. The admin service-account key is the real secret and lives only in Vercel env.
// No `useEmulator` here, so the app talks to the live project.
export const firebaseConfig = {
  apiKey: 'AIzaSyAGhUyqetkk3DWxRhmioInVHVtxH-XzuHI',
  authDomain: 'habit-game-111c8.firebaseapp.com',
  projectId: 'habit-game-111c8',
  storageBucket: 'habit-game-111c8.firebasestorage.app',
  messagingSenderId: '396281875789',
  appId: '1:396281875789:web:b1e87260b26fd0fffa7b04',
};
