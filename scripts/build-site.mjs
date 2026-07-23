// Vercel build: assemble one static output at public/ — the marketing site at the root and the
// playable game under /play. The game runs the same bundle the Capacitor Android shell wraps, so
// mobile Safari is a real way to feel the loop (minus native haptics/notifications).
import { execSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync } from 'node:fs';

// Generate the shared copies + the Firebase bundle into app/www.
execSync('npm run build', { stdio: 'inherit' });

rmSync('public', { recursive: true, force: true });
mkdirSync('public', { recursive: true });
cpSync('web', 'public', { recursive: true });          // marketing + privacy pages at /
cpSync('app/www', 'public/play', { recursive: true }); // the game at /play

console.log('assembled public/  (site at /, game at /play)');
