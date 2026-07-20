// shared/ is the single source of truth, but a Capacitor webroot cannot import from outside
// itself. Copy the shared modules in before serving or syncing; the copies are gitignored.
import { copyFileSync } from 'node:fs';

for (const file of ['game-math.js', 'paths.js']) {
  copyFileSync(`shared/${file}`, `app/www/${file}`);
  console.log(`copied shared/${file} -> app/www/${file}`);
}
