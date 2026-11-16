// synth.mjs — bruitages et musique 100 % générés par le code (aucun fichier externe,
// donc librement utilisables). Tout est déterministe (graine fixe).
export const SR = 48000;

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const buf = (sec) => new Float32Array(Math.max(1, Math.round(sec * SR)));
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const env = (i, n, a = 0.005, r = 0.1) => {
  const t = i / SR, d = n / SR;
  return Math.min(1, t / a) * Math.min(1, Math.max(0, (d - t) / r));
};
function add(dst, src, at, gain = 1) {
  const o = Math.round(at * SR);
  for (let i = 0; i < src.length; i++) if (o + i >= 0 && o + i < dst.length) dst[o + i] += src[i] * gain;
}
// filtre passe-bas d'ordre 1 (pour adoucir les bruits)
function lowpass(x, cutoff) {
  const y = new Float32Array(x.length);
  const k = 1 - Math.exp((-2 * Math.PI * cutoff) / SR);
  let s = 0;
  for (let i = 0; i < x.length; i++) { s += k * (x[i] - s); y[i] = s; }
  return y;
}
const highpass = (x, c) => { const l = lowpass(x, c); return x.map((v, i) => v - l[i]); };

// ─────────────────────────── bruitages ───────────────────────────
const S = {};
S.click = (r = rng(1)) => {
  const b = buf(0.035);
  for (let i = 0; i < b.length; i++) b[i] = (r() * 2 - 1) * Math.exp(-i / (SR * 0.004)) + Math.sin(i * 2 * Math.PI * (2200 + r() * 600) / SR) * Math.exp(-i / (SR * 0.006)) * 0.4;
  return highpass(b, 900);
};
S.typing = ({ dur = 1.5 } = {}, seed = 7) => {
  const r = rng(seed), b = buf(dur + 0.1);
  let t = 0;
  while (t < dur) { add(b, S.click(r), t, 0.5 + r() * 0.5); t += 0.06 + r() * 0.09; if (r() < 0.08) t += 0.2; }
  return b;
};
S.tick = () => {
  const b = buf(0.06);
  for (let i = 0; i < b.length; i++) b[i] = Math.sin(i * 2 * Math.PI * 3000 / SR) * Math.exp(-i / (SR * 0.005)) + Math.sin(i * 2 * Math.PI * 1200 / SR) * Math.exp(-i / (SR * 0.01)) * 0.5;
  return b;
};
S.tap = () => { const b = buf(0.08); for (let i = 0; i < b.length; i++) b[i] = Math.sin(i * 2 * Math.PI * 520 / SR) * Math.exp(-i / (SR * 0.012)) + (Math.random() * 0) ; return b; };
S.ding = () => {
  const b = buf(1.2);
  for (let i = 0; i < b.length; i++) { const t = i / SR; b[i] = (Math.sin(2 * Math.PI * 1318.5 * t) * 0.6 + Math.sin(2 * Math.PI * 1975.5 * t) * 0.3) * Math.exp(-t * 4) * Math.min(1, t / 0.003); }
  return b;
};
S.notif = () => { const b = buf(0.6); [880, 1174.7].forEach((f, k) => { const n = buf(0.35); for (let i = 0; i < n.length; i++) { const t = i / SR; n[i] = Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 9); } add(b, n, k * 0.12, 0.6); }); return b; };
S.error = () => {
  const b = buf(0.45);
  for (let i = 0; i < b.length; i++) { const t = i / SR; const sq = Math.sign(Math.sin(2 * Math.PI * 140 * t)) * 0.5 + Math.sign(Math.sin(2 * Math.PI * 147 * t)) * 0.5; b[i] = sq * env(i, b.length, 0.005, 0.05); }
  return lowpass(b, 2500);
};
S.boing = () => {
  const b = buf(0.6);
  let ph = 0;
  for (let i = 0; i < b.length; i++) { const t = i / SR; const f = 180 + 420 * Math.min(1, t / 0.12) + Math.sin(t * 2 * Math.PI * 14) * 60 * Math.exp(-t * 3); ph += (2 * Math.PI * f) / SR; b[i] = Math.sin(ph) * Math.exp(-t * 5.5) * Math.min(1, t / 0.004); }
  return b;
};
S.pop = () => {
  const b = buf(0.09); let ph = 0;
  for (let i = 0; i < b.length; i++) { const t = i / SR; ph += (2 * Math.PI * (500 + 1600 * t / 0.09)) / SR; b[i] = Math.sin(ph) * Math.exp(-t * 45); }
  return b;
};
S.whoosh = (o = {}, seed = 3) => {
  const r = rng(seed), d = 0.55, b = buf(d);
  for (let i = 0; i < b.length; i++) b[i] = (r() * 2 - 1) * Math.sin(Math.PI * i / b.length) ** 2;
  return lowpass(highpass(b, 300), 2400);
};
S.marker = ({ dur = 0.7 } = {}, seed = 5) => {
  const r = rng(seed), b = buf(dur);
  for (let i = 0; i < b.length; i++) { const t = i / SR; const am = 0.5 + 0.5 * Math.sin(2 * Math.PI * 7 * t + Math.sin(t * 13)); b[i] = (r() * 2 - 1) * am * env(i, b.length, 0.02, 0.05); }
  return lowpass(highpass(b, 2500), 6000);
};
S.steps = ({ dur = 1.2, fast = false } = {}, seed = 11) => {
  const r = rng(seed), b = buf(dur + 0.2), gap = fast ? 0.24 : 0.36;
  for (let t = 0.02; t < dur; t += gap * (0.9 + r() * 0.2)) {
    const s = buf(0.09);
    for (let i = 0; i < s.length; i++) s[i] = ((r() * 2 - 1) * 0.6 + Math.sin(i * 2 * Math.PI * 110 / SR)) * Math.exp(-i / (SR * 0.018));
    add(b, lowpass(s, 900), t, 0.8 + r() * 0.2);
  }
  return b;
};
S.sting = () => { // « dun dun duuun »
  const b = buf(2.0);
  [[0, 50, 0.25], [0.3, 49, 0.25], [0.6, 46, 1.3]].forEach(([at, m, d]) => {
    const n = buf(d + 0.3); let ph = 0;
    for (let i = 0; i < n.length; i++) { const t = i / SR; ph += (2 * Math.PI * mtof(m)) / SR; const saw = ((ph / (2 * Math.PI)) % 1) * 2 - 1; n[i] = (saw * 0.5 + Math.sin(ph * 0.5) * 0.6) * env(i, n.length, 0.01, 0.3); }
    add(b, lowpass(n, 900), at, 0.8);
  });
  return b;
};
S.shock = () => { const r = rng(15); const b = buf(0.5); let ph = 0; for (let i = 0; i < b.length; i++) { const t = i / SR; ph += (2 * Math.PI * (90 - 40 * t)) / SR; b[i] = Math.sin(ph) * Math.exp(-t * 7) + (r() * 2 - 1) * Math.exp(-t * 30) * 0.3; } return lowpass(b, 1500); };
S.crickets = ({ dur = 1.5 } = {}) => {
  const b = buf(dur);
  for (let i = 0; i < b.length; i++) { const t = i / SR; const chirp = Math.max(0, Math.sin(2 * Math.PI * 2.2 * t)) ** 6; const trill = 0.5 + 0.5 * Math.sin(2 * Math.PI * 45 * t); b[i] = Math.sin(2 * Math.PI * 4400 * t) * chirp * trill * 0.5 * env(i, b.length, 0.05, 0.2); }
  return b;
};
S.trombone = () => { // « wah wah wah waaah »
  const b = buf(3.0);
  [[0, 58, 0.42], [0.45, 57, 0.42], [0.9, 56, 0.42], [1.35, 55, 1.4]].forEach(([at, m, d], k) => {
    const n = buf(d); let ph = 0;
    for (let i = 0; i < n.length; i++) { const t = i / SR; const vib = k === 3 ? Math.sin(2 * Math.PI * 5.5 * t) * 0.012 * Math.min(1, t / 0.4) : 0; ph += (2 * Math.PI * mtof(m) * (1 + vib - 0.02 * Math.exp(-t * 20))) / SR; const saw = ((ph / (2 * Math.PI)) % 1) * 2 - 1; const wah = 0.5 + 0.5 * Math.sin(Math.PI * Math.min(1, t / d)); n[i] = saw * wah * env(i, n.length, 0.03, 0.12); }
    add(b, lowpass(n, 1400), at, 0.7);
  });
  return b;
};
S.badumtss = () => {
  const b = buf(1.6), r = rng(9);
  const drum = (f, d) => { const n = buf(d); let ph = 0; for (let i = 0; i < n.length; i++) { const t = i / SR; ph += (2 * Math.PI * f * (1 + 2 * Math.exp(-t * 40))) / SR; n[i] = Math.sin(ph) * Math.exp(-t * 18); } return n; };
  const snare = () => { const n = buf(0.2); for (let i = 0; i < n.length; i++) { const t = i / SR; n[i] = ((r() * 2 - 1) * 0.7 + Math.sin(2 * Math.PI * 190 * t) * 0.5) * Math.exp(-t * 22); } return n; };
  const cym = () => { const n = buf(1.1); for (let i = 0; i < n.length; i++) { const t = i / SR; n[i] = (r() * 2 - 1) * Math.exp(-t * 3.5); } return highpass(n, 5000); };
  add(b, drum(160, 0.25), 0, 0.8); add(b, snare(), 0.18, 0.7); add(b, drum(70, 0.3), 0.36, 0.8); add(b, cym(), 0.36, 0.6);
  return b;
};
S.clack = () => { const b = buf(0.12); const r = rng(4); for (let i = 0; i < b.length; i++) { const t = i / SR; b[i] = (r() * 2 - 1) * Math.exp(-t * 60) * 0.6 + Math.sin(2 * Math.PI * 300 * t) * Math.exp(-t * 35); } return lowpass(b, 4000); };
S.hum = ({ dur = 2 } = {}) => { const b = buf(dur); const r = rng(8); for (let i = 0; i < b.length; i++) { const t = i / SR; b[i] = (Math.sin(2 * Math.PI * 100 * t) * 0.3 + (r() * 2 - 1) * 0.25) * env(i, b.length, 0.3, 0.3); } return lowpass(b, 700); };
S.disconnect = () => { const b = buf(0.8); [[0, 784], [0.18, 659], [0.36, 523]].forEach(([at, f]) => { const n = buf(0.25); for (let i = 0; i < n.length; i++) { const t = i / SR; n[i] = Math.sin(2 * Math.PI * f * t) * env(i, n.length, 0.005, 0.08); } add(b, n, at, 0.6); }); return b; };
S.murmur = ({ dur = 3 } = {}) => { const r = rng(12); const b = buf(dur); for (let i = 0; i < b.length; i++) { const t = i / SR; const am = 0.5 + 0.25 * Math.sin(2 * Math.PI * 3.1 * t) + 0.25 * Math.sin(2 * Math.PI * 4.7 * t + 1); b[i] = (r() * 2 - 1) * am * env(i, b.length, 0.4, 0.6); } return lowpass(highpass(b, 250), 1100); };
S.slam = () => { const b = buf(0.4); const r = rng(6); for (let i = 0; i < b.length; i++) { const t = i / SR; b[i] = ((r() * 2 - 1) * 0.6 + Math.sin(2 * Math.PI * 60 * t)) * Math.exp(-t * 14); } return lowpass(b, 1200); };
S.spark = () => { const b = buf(0.35); const r = rng(13); for (let i = 0; i < b.length; i++) { const t = i / SR; b[i] = (r() * 2 - 1) * (r() < 0.1 ? 1 : 0.15) * Math.exp(-t * 10); } return highpass(b, 2000); };
S.powerdown = () => { const b = buf(0.8); let ph = 0; for (let i = 0; i < b.length; i++) { const t = i / SR; ph += (2 * Math.PI * (700 * Math.exp(-t * 3) + 60)) / SR; b[i] = Math.sin(ph) * env(i, b.length, 0.01, 0.2) * 0.8; } return b; };
S.peel = () => { const b = buf(0.4); const r = rng(14); for (let i = 0; i < b.length; i++) { const t = i / SR; b[i] = (r() * 2 - 1) * (r() < 0.3 ? 1 : 0.2) * env(i, b.length, 0.02, 0.1); } return lowpass(highpass(b, 1500), 7000); };
export const SFX = S;
export function sfx(name, opts) {
  if (!S[name]) throw new Error('bruitage inconnu : ' + name);
  return S[name](opts || {});
}

// ─────────────────────────── musique ───────────────────────────
// Ambiances : title (enjouée), calm (lo-fi douce), tense (pulsation mineure), none.
const MOODS = {
  title: { bpm: 112, chords: [[48, 52, 55], [53, 57, 60], [55, 59, 62], [48, 52, 55]], arp: true, melody: [72, 74, 76, 79, 76, 74, 72, 67], hat: 0.25, bass: 'bounce', pad: 0.08 },
  calm: { bpm: 96, chords: [[48, 52, 55, 59], [45, 48, 52, 55], [41, 45, 48, 52], [43, 47, 50, 53]], arp: true, melody: null, hat: 0.12, bass: 'soft', pad: 0.12 },
  tense: { bpm: 128, chords: [[45, 48, 52], [45, 48, 52], [41, 45, 48], [40, 44, 47]], arp: false, melody: null, hat: 0.35, bass: 'pulse', pad: 0.05 },
};
function pluck(f, d, bright = 0.3) {
  const n = buf(d);
  for (let i = 0; i < n.length; i++) { const t = i / SR; n[i] = (Math.sin(2 * Math.PI * f * t) + Math.sin(4 * Math.PI * f * t) * bright) * Math.exp(-t * 7) * Math.min(1, t / 0.004); }
  return n;
}
export function music(mood, seconds, seed = 21) {
  const out = buf(seconds);
  const M = MOODS[mood];
  if (!M) return out;
  const r = rng(seed);
  const beat = 60 / M.bpm, bar = beat * 4;
  const bars = Math.ceil(seconds / bar);
  for (let k = 0; k < bars; k++) {
    const t0 = k * bar, ch = M.chords[k % M.chords.length];
    // nappe douce (triangle)
    const pad = buf(bar + 0.2);
    for (let i = 0; i < pad.length; i++) {
      const t = i / SR; let v = 0;
      for (const m of ch) { const p = (t * mtof(m)) % 1; v += 4 * Math.abs(p - 0.5) - 1; }
      pad[i] = (v / ch.length) * env(i, pad.length, 0.25, 0.3);
    }
    add(out, lowpass(pad, 1200), t0, M.pad);
    // basse
    const root = mtof(ch[0] - 12);
    const bassHits = M.bass === 'pulse' ? [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5] : M.bass === 'bounce' ? [0, 1.5, 2, 3] : [0, 2];
    for (const h of bassHits) add(out, pluck(root, M.bass === 'pulse' ? 0.18 : 0.45, 0.1), t0 + h * beat, M.bass === 'pulse' ? 0.22 : 0.28);
    // arpège
    if (M.arp) { const pat = [0, 2, 1, 3, 2, 1, 3, 2]; pat.forEach((ix, j) => add(out, pluck(mtof(ch[ix % ch.length] + 12), 0.35, 0.25), t0 + j * beat * 0.5, 0.09)); }
    // mélodie (carton titre)
    if (M.melody) M.melody.forEach((m, j) => { if (j % 2 === 0 || r() > 0.3) add(out, pluck(mtof(m), 0.3, 0.5), t0 + j * beat * 0.5, 0.11); });
    // charleston (bruit très court)
    const sub = M.bpm > 120 ? 4 : 2;
    for (let j = 0; j < 4 * sub; j++) {
      const n = buf(0.03); for (let i = 0; i < n.length; i++) n[i] = (r() * 2 - 1) * Math.exp(-i / (SR * 0.006));
      add(out, highpass(n, 6000), t0 + (j * beat) / sub, M.hat * (j % sub === 1 ? 1 : 0.5) * 0.25);
    }
    // grosse caisse douce sur les temps forts
    for (const h of M.bpm > 120 ? [0, 1, 2, 3] : [0, 2]) { const n = buf(0.2); let ph = 0; for (let i = 0; i < n.length; i++) { const t = i / SR; ph += (2 * Math.PI * 55 * (1 + 3 * Math.exp(-t * 35))) / SR; n[i] = Math.sin(ph) * Math.exp(-t * 14); } add(out, n, t0 + h * beat, 0.18); }
  }
  return out;
}
export { add, lowpass, buf };
