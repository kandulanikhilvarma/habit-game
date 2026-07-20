// shared/game-math.js is the single source of truth, but a Capacitor webroot cannot import from
// outside itself. Copy it in before serving or syncing; the copy is gitignored.
import { copyFileSync } from 'node:fs';

copyFileSync('shared/game-math.js', 'app/www/game-math.js');
console.log('copied shared/game-math.js -> app/www/game-math.js');
