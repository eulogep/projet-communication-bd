// build-audio.mjs — génère les voix (synthèse vocale macOS « say »), mesure leur durée
// et leur enveloppe (pour la synchronisation des lèvres), puis mixe voix + bruitages + musique.
// Sorties : audio/timing.js, audio/film1.wav, audio/film2.wav
//
// Intégrer de vraies voix : déposer audio/voices-custom/<id>.wav (48 kHz, mono ou stéréo,
// <id> = identifiant de la réplique, ex. k1) ; ce fichier remplace la voix de synthèse.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { ROOT } from './server.mjs';
import { SR, sfx, music, add } from './synth.mjs';

const AUD = path.join(ROOT, 'audio');
const VOX = path.join(AUD, 'voices');
const CUSTOM = path.join(AUD, 'voices-custom');
fs.mkdirSync(VOX, { recursive: true });
fs.mkdirSync(CUSTOM, { recursive: true });

// ── charge timeline + films (scripts navigateur) dans un bac à sable Node
const sandbox = { window: {}, console };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
for (const f of ['timeline.js', 'film1.js', 'film2.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, 'src', f), 'utf8'), sandbox, { filename: f });
const TL = sandbox.window.TL;
const FILMS = sandbox.window.FILMS;

// ── lecture d'un WAV PCM 16 bits → Float32 mono 48 kHz
function readWav(file) {
  const b = fs.readFileSync(file);
  let p = 12, fmt = null, data = null;
  while (p < b.length - 8) {
    const id = b.toString('ascii', p, p + 4), size = b.readUInt32LE(p + 4);
    if (id === 'fmt ') fmt = { ch: b.readUInt16LE(p + 10), rate: b.readUInt32LE(p + 12), bits: b.readUInt16LE(p + 22) };
    if (id === 'data') data = b.subarray(p + 8, p + 8 + size);
    p += 8 + size + (size % 2);
  }
  if (!fmt || !data || fmt.bits !== 16) throw new Error('WAV non supporté : ' + file);
  const n = Math.floor(data.length / 2 / fmt.ch);
  let x = new Float32Array(n);
  for (let i = 0; i < n; i++) { let s = 0; for (let c = 0; c < fmt.ch; c++) s += data.readInt16LE((i * fmt.ch + c) * 2); x[i] = s / fmt.ch / 32768; }
  if (fmt.rate !== SR) { // rééchantillonnage linéaire
    const m = Math.round((n * SR) / fmt.rate), y = new Float32Array(m);
    for (let i = 0; i < m; i++) { const u = (i * fmt.rate) / SR, k = Math.floor(u), f = u - k; y[i] = (x[k] || 0) * (1 - f) + (x[k + 1] || 0) * f; }
    x = y;
  }
  return x;
}
function writeWavStereo(file, L, R) {
  const n = L.length, b = Buffer.alloc(44 + n * 4);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 4, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20); b.writeUInt16LE(2, 22); b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 4, 28); b.writeUInt16LE(4, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i])) * 32767), 44 + i * 4);
    b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i])) * 32767), 46 + i * 4);
  }
  fs.writeFileSync(file, b);
}
function trim(x, th = 0.012) {
  let a = 0, z = x.length - 1;
  while (a < x.length && Math.abs(x[a]) < th) a++;
  while (z > a && Math.abs(x[z]) < th) z--;
  return x.subarray(Math.max(0, a - Math.round(0.03 * SR)), Math.min(x.length, z + Math.round(0.06 * SR)));
}
// enveloppe d'ouverture de bouche : RMS par image (30 i/s), normalisée, lissée
function envelope(x) {
  const step = SR / 30, n = Math.ceil(x.length / step), e = [];
  for (let k = 0; k < n; k++) { let s = 0, c = 0; for (let i = Math.floor(k * step); i < Math.min(x.length, (k + 1) * step); i++) { s += x[i] * x[i]; c++; } e.push(Math.sqrt(s / Math.max(1, c))); }
  const mx = Math.max(...e, 1e-6);
  let prev = 0;
  return e.map((v) => { const t = Math.pow(v / mx, 0.7); prev = t > prev ? t : prev * 0.55 + t * 0.45; return +prev.toFixed(2); });
}
const clean = (s) => s.replace(/[«»"]/g, '').replace(/…/g, '...').replace(/\s+/g, ' ').trim();

// ── 1. voix
const timing = {};
const voiceData = {};
for (const film of Object.values(FILMS)) {
  timing[film.id] = { lines: {} };
  for (const sc of film.scenes) for (const b of sc.beats) {
    const who = b.say || b.think;
    if (!who) continue;
    const custom = path.join(CUSTOM, b.id + '.wav');
    let x;
    if (fs.existsSync(custom)) { x = readWav(custom); console.log(`  ${film.id}/${b.id} ← voix personnalisée`); }
    else {
      const voice = film.voices[who];
      const rate = Math.round((film.rates[who] || 180) * (b.think ? 0.92 : 1));
      const text = clean(b.tts || b.text);
      const key = crypto.createHash('sha1').update([voice, rate, text].join('|')).digest('hex').slice(0, 12);
      const out = path.join(VOX, `${film.id}_${b.id}_${key}.wav`);
      if (!fs.existsSync(out)) execFileSync('say', ['-v', voice, '-r', String(rate), '-o', out, '--file-format=WAVE', '--data-format=LEI16@48000', text]);
      x = readWav(out);
    }
    x = trim(x);
    voiceData[film.id + '/' + b.id] = x;
    timing[film.id].lines[b.id] = { dur: +(x.length / SR).toFixed(3), env: b.think ? [] : envelope(x) };
    console.log(`  ${film.id}/${b.id.padEnd(5)} ${who.padEnd(8)} ${(x.length / SR).toFixed(2)} s  « ${b.text.replace(/\n/g, ' ')} »`);
  }
}
fs.writeFileSync(path.join(AUD, 'timing.json'), JSON.stringify(timing));
fs.writeFileSync(path.join(AUD, 'timing.js'), '/* généré par tools/build-audio.mjs — ne pas modifier */\nwindow.TIMING = ' + JSON.stringify(timing) + ';\n');

// ── 2. mixage
for (const film of Object.values(FILMS)) {
  const tl = TL.build(film, timing);
  const N = Math.ceil((tl.duration + 0.5) * SR);
  const voice = new Float32Array(N), fx = new Float32Array(N), mus = new Float32Array(N);
  for (const sc of tl.scenes) for (const B of sc.list) {
    const at = sc.start + B.start;
    if (B.who) {
      const x = voiceData[film.id + '/' + B.id];
      add(voice, x, at, B.think ? 0.55 : 0.95);
      if (B.think) add(voice, x, at + 0.11, 0.22); // écho léger = voix intérieure
    }
    for (const [name, off, gain = 0.5, opts] of B.sfx || []) add(fx, sfx(name, opts), at + off, gain);
  }
  // musique : une piste continue par suite de scènes de même ambiance, fondus de 0,4 s
  let i = 0;
  while (i < tl.scenes.length) {
    const mood = tl.scenes[i].def.music || 'none';
    let j = i;
    while (j + 1 < tl.scenes.length && (tl.scenes[j + 1].def.music || 'none') === mood) j++;
    const t0 = tl.scenes[i].start, t1 = tl.scenes[j].end;
    if (mood !== 'none') {
      const m = music(mood, t1 - t0 + 0.5, 21 + i);
      const fade = 0.4 * SR, len = Math.round((t1 - t0) * SR) + (j === tl.scenes.length - 1 ? 0 : fade);
      for (let k = 0; k < Math.min(m.length, len); k++) {
        const g = Math.min(1, k / fade, (len - k) / fade);
        const o = Math.round(t0 * SR) + k;
        if (o < N) mus[o] += m[k] * g;
      }
    }
    i = j + 1;
  }
  // fondu final
  const endFade = 2.0 * SR;
  for (let k = 0; k < endFade; k++) { const o = Math.round(tl.duration * SR) - endFade + k; if (o >= 0 && o < N) mus[o] *= 1 - k / endFade; }
  // ducking : la musique baisse quand quelqu'un parle
  let d = 0;
  const att = 1 - Math.exp(-1 / (0.03 * SR)), rel = 1 - Math.exp(-1 / (0.35 * SR));
  const L = new Float32Array(N), R = new Float32Array(N);
  for (let k = 0; k < N; k++) {
    const a = Math.min(1, Math.abs(voice[k]) * 6);
    d += (a > d ? att : rel) * (a - d);
    const mg = 0.45 * (1 - 0.65 * d);
    const v = voice[k] + fx[k] * 0.9;
    L[k] = v + mus[k] * mg;
    R[k] = v + mus[k] * mg;
  }
  let peak = 0;
  for (let k = 0; k < N; k++) peak = Math.max(peak, Math.abs(L[k]));
  const g = 0.89 / Math.max(peak, 1e-6);
  for (let k = 0; k < N; k++) { L[k] *= g; R[k] *= g; }
  const out = path.join(AUD, film.id + '.wav');
  writeWavStereo(out, L, R);
  console.log(`→ ${path.relative(ROOT, out)}  ${tl.duration.toFixed(2)} s  (gain ${g.toFixed(2)})`);
}
