// export.mjs — rend chaque image dans Chrome (sans interface) et l'envoie à ffmpeg.
// Usage : npm run export            (les deux films)
//         npm run export -- film2   (un seul film)
// Sortie : out/<film>.mp4 — 1920×1080, 30 i/s, H.264 + AAC 192 kb/s
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { openRenderer } from './browser.mjs';
import { ROOT } from './server.mjs';

const FPS = 30;
const films = process.argv.slice(2).length ? process.argv.slice(2) : ['film1', 'film2'];
try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }); } catch { console.error('ffmpeg introuvable (brew install ffmpeg)'); process.exit(1); }
fs.mkdirSync(path.join(ROOT, 'out'), { recursive: true });

for (const film of films) {
  const audio = path.join(ROOT, 'audio', film + '.wav');
  if (!fs.existsSync(audio)) { console.error(`Bande-son absente pour ${film} : lancez d'abord npm run audio`); process.exit(1); }
  const out = path.join(ROOT, 'out', film + '.mp4');
  const { page, duration, close } = await openRenderer(film);
  const frames = Math.ceil(duration * FPS);
  const ff = spawn('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-i', audio,
    '-map', '0:v', '-map', '1:a',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(FPS),
    '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart',
    '-metadata', `title=${film}`, out,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg code ' + c)))));
  const t0 = Date.now();
  for (let i = 0; i < frames; i++) {
    const url = await page.evaluate((t) => window.renderFrame(t, 0.93), i / FPS);
    const ok = ff.stdin.write(Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'));
    if (!ok) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % 150 === 0 || i === frames - 1) process.stdout.write(`\r${film} : image ${i + 1}/${frames}  (${((Date.now() - t0) / 1000).toFixed(0)} s)   `);
  }
  ff.stdin.end();
  await done;
  await close();
  console.log(`\n→ ${path.relative(ROOT, out)}  (${duration.toFixed(2)} s, ${frames} images)`);
}
