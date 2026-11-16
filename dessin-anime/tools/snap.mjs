// Captures de contrôle : npm run snap -- film1 3.5 10 22   (ou « all » pour une planche contact)
import fs from 'node:fs';
import path from 'node:path';
import { openRenderer } from './browser.mjs';
import { ROOT } from './server.mjs';

const [film = 'film1', ...times] = process.argv.slice(2);
const { page, duration, close } = await openRenderer(film);
const dir = path.join(ROOT, 'out', 'snaps');
fs.mkdirSync(dir, { recursive: true });
let ts = times.map(Number);
if (times[0] === 'all' || !ts.length) { const n = +(times[1] || 24); ts = Array.from({ length: n }, (_, i) => ((i + 0.5) * duration) / n); }
for (const t of ts) {
  const url = await page.evaluate((t) => window.renderFrame(t, 0.85), t);
  const f = path.join(dir, `${film}_${t.toFixed(2).padStart(6, '0')}.jpg`);
  fs.writeFileSync(f, Buffer.from(url.split(',')[1], 'base64'));
  console.log(f);
}
console.log('durée', duration.toFixed(2), 's');
await close();
