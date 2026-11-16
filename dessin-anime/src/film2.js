/* film2.js — « On coupe le réseau ! »
 * Les textes des bulles (text) sont ceux de la planche, mot pour mot.
 * tts = prononciation donnée à la synthèse vocale.
 */
window.FILMS = window.FILMS || {};
window.FILMS.film2 = {
  id: 'film2',
  title: 'On coupe le réseau !',
  subtitle: '— Hiver, en alternance au service informatique',
  color: '#37474F',
  moralFill: '#E0F2F1',
  moralBorder: '#00897B',
  moral:
    "« Compris » n'est pas une confirmation. Avant une opération sensible, reformulez le périmètre : quoi, où, quand. Une consigne floue finit toujours coupée au mauvais endroit.",
  voices: {
    theo: 'Thomas',
    marc: 'Jacques',
    laurent: 'Sandy (Français (France))',
  },
  rates: { theo: 185, marc: 185, laurent: 190 },

  titleDeco(ctx, t) {
    // une prise réseau qu'on débranche… étincelle
    const pull = E.ease.out(E.prog(t, 1.6, 1.9));
    const y = 800;
    E.box(ctx, 1010, y - 70, 170, 140, '#ECEFF1', E.INK, 6, 14);
    E.box(ctx, 1040, y - 30, 110, 60, '#263238', E.INK, 4, 6);
    const px = E.lerp(930, 640, pull);
    E.line(ctx, -40, y, px - 120, y, '#1E88E5', 16);
    E.box(ctx, px - 130, y - 32, 130, 64, '#90CAF9', E.INK, 5, 8);
    E.box(ctx, px, y - 22, 90, 44, '#ECEFF1', E.INK, 4, 4);
    if (t > 1.62 && t < 2.1) {
      for (let i = 0; i < 6; i++) E.fx.sparkle(ctx, 1000 + Math.cos(i) * 70 * E.prog(t, 1.62, 2.1), y + Math.sin(i * 2) * 70 * E.prog(t, 1.62, 2.1), 22, t + i);
    }
  },

  scenes: [
    // ───────────── 0. Titre ─────────────
    {
      id: 'titre', label: 'Carton titre', music: 'title',
      beats: [{ id: 't', wait: 4.2, sfx: [['whoosh', 0.1, 0.5], ['pop', 0.6, 0.6], ['spark', 1.62, 0.5], ['powerdown', 1.75, 0.45]] }],
      draw(ctx, S, t, film) { E.titleCard(ctx, t, film); },
    },

    // ───────────── 1. Case 1 — la consigne floue ─────────────
    {
      id: 'couloir', label: 'Case 1 — Mercredi, 17h58 (la consigne dans le couloir)', music: 'calm',
      trans: { type: 'wipe', dur: 0.7 },
      beats: [
        { id: 'in', wait: 1.0, sfx: [['pop', 0.4, 0.5], ['steps', 0.1, 0.4, { dur: 0.9, fast: true }]] },
        { id: 'm1', say: 'marc', text: 'Vendredi 18h, tu coupes le réseau du labo. Travaux !', tts: 'Vendredi 18 heures, tu coupes le réseau du labo. Travaux !', sfx: [['steps', 0, 0.4, { dur: 2.8, fast: true }]] },
        { id: 't1', say: 'theo', text: 'Compris, chef !', sfx: [['steps', 0, 0.35, { dur: 1.2, fast: true }]] },
        { id: 'slam', wait: 0.8, sfx: [['slam', 0.3, 0.6]] },
        { id: 't1b', think: 'theo', text: "…C'est où, le labo ?", tts: "C'est où, le labo ?" },
        { id: 'cri', wait: 1.6, sfx: [['crickets', 0.1, 0.4, { dur: 1.4 }]] },
      ],
      draw(ctx, S, t) {
        const b = S.beats;
        const gone = b.slam.start + 0.3;
        const mx = E.kf(t, [[0, 2250], [b.m1.end, 900], [gone, 210]], 'lin');
        const moving = t < gone;
        const wk = E.walk(t, moving, 13);
        const cam = E.kf(t, [
          [0, { x: 1150, y: 560, z: 1.08 }],
          [b.t1.start, { x: 1000, y: 560, z: 1.05 }],
          [b.t1b.start, { x: 1000, y: 560, z: 1.05 }],
          [b.t1b.start + 0.6, { x: 1380, y: 520, z: 1.3 }],
        ]);
        const doorOpen = E.kf(t, [[gone - 0.6, 0], [gone - 0.3, 1], [gone, 1], [gone + 0.08, 0]], 'out');
        let M, T;
        E.withCam(ctx, cam, () => {
          E.D.wall(ctx, '#E3E7EA', 960, '#B0BEC5');
          E.D.door(ctx, 70, 380, 270, 580, doorOpen);
          if (t < gone + 0.05) {
            M = E.actor(ctx, S, t, { who: 'marc', x: mx, y: 1080, h: 660, flip: true, lift: wk.lift, tilt: wk.tilt, phone: true, alpha: 1 - E.prog(t, gone - 0.15, gone) });
            if (moving) E.fx.speed(ctx, mx + 200, 1000, 560, 1, t);
          } else M = { head: { x: 210, y: 500 } };
          E.fx.dust(ctx, 200, 900, E.prog(t, gone, gone + 0.6), 3);
          const salute = E.jump(t, b.t1.start, 0.4, 50);
          T = E.actor(ctx, S, t, { who: 'theo', x: 1500, y: 1080, h: 620, lift: salute, squash: E.pop(t, b.t1.start + 0.38) });
          if (t > b.t1.start && t < b.t1.start + 1.2) E.fx.sparkle(ctx, T.head.x + 170, T.head.y + 40, 30, t);
          if (t > b.t1b.start) {
            const qs = [[-190, 50], [200, -10]];
            qs.forEach(([dx, dy], i) => E.fx.mark(ctx, '?', T.head.x + dx, T.head.y + dy + Math.sin(t * 4 + i) * 8, 90, E.prog(t, b.t1b.start + 0.3 + i * 0.25, b.t1b.start + 0.6 + i * 0.25)));
          }
        });
        E.caption(ctx, 'Mercredi, 17h58.', t, 0.4);
        E.bubble(ctx, S, t, 'm1', { x: 60, y: 140, w: 840, tip: E.toScreen(cam, M.head), hideAt: b.t1b.start + 0.3 });
        E.bubble(ctx, S, t, 't1', { x: 1180, y: 200, w: 450, tip: E.toScreen(cam, T.head), hideAt: b.t1b.start + 0.3 });
        E.bubble(ctx, S, t, 't1b', { x: 700, y: 150, w: 520, tip: E.toScreen(cam, T.head) });
      },
    },

    // ───────────── 2. Case 2 — l'exécution ─────────────
    {
      id: 'serveur', label: 'Case 2 — Vendredi, 18h00 (salle serveur)', music: 'calm',
      trans: { type: 'whip', dur: 0.6 },
      beats: [
        { id: 'in', wait: 2.2, sfx: [['pop', 0.5, 0.5], ['hum', 0, 0.22, { dur: 2.2 }]] },
        { id: 'type', wait: 2.4, sfx: [['typing', 0.0, 0.4, { dur: 1.6 }], ['ding', 1.9, 0.2]] },
        { id: 'off', wait: 2.2, sfx: [0, 1, 2, 3, 4, 5].map((k) => ['clack', 0.15 + k * 0.3, 0.5]) },
        { id: 't2', say: 'theo', bold: true, text: 'Tout ce qui dit « LAB »… Mission accomplie !', tts: 'Tout ce qui dit LAB... Mission accomplie !', sfx: [['ding', 0.0, 0.3]] },
        { id: 'omen', wait: 2.0, sfx: [['sting', 0.1, 0.55]] },
      ],
      draw(ctx, S, t) {
        const b = S.beats;
        const cam = E.kf(t, [
          [0, { x: 960, y: 300, z: 1.55 }],
          [0.9, { x: 960, y: 300, z: 1.55 }],
          [b.in.end, { x: 960, y: 540, z: 1 }],
          [b.off.start, { x: 960, y: 540, z: 1 }],
          [b.off.start + 0.4, { x: 960, y: 330, z: 1.3 }],
          [b.t2.start - 0.1, { x: 960, y: 330, z: 1.3 }],
          [b.t2.start + 0.4, { x: 960, y: 540, z: 1 }],
          [b.omen.start + 0.1, { x: 960, y: 540, z: 1 }],
          [b.omen.start + 1.1, { x: 1215, y: 240, z: 2.3 }],
        ]);
        const offAt = (k) => b.off.start + 0.15 + k * 0.3;
        const typed = 'ports LAB :';
        const nType = Math.floor(typed.length * E.prog(t, b.type.start + 0.1, b.type.start + 1.6));
        const dots = '.'.repeat(Math.floor(E.prog(t, b.off.start, b.off.end - 0.2) * 3));
        const done = t > b.off.end - 0.2;
        let T;
        E.withCam(ctx, cam, () => {
          E.D.wall(ctx, '#CFD8DC', 1000, '#90A4AE');
          // baie serveur à droite (déco)
          E.box(ctx, 1560, 470, 300, 560, '#455A64', E.INK, 6, 6);
          for (let i = 0; i < 6; i++) {
            E.box(ctx, 1585, 495 + i * 85, 250, 62, '#37474F', '#263238', 3);
            E.circle(ctx, 1810, 526 + i * 85, 7, E.rand(Math.floor(t * 6) + i * 5) > 0.4 ? '#66FF66' : '#2E7D32', null);
          }
          E.D.switchBox(ctx, 140, 110, 1640, 330, 8, (k) => (k < 6 && t > offAt(k) ? 'off' : 'on'), t);
          [['LAB', 175, 140, 230, -4], ['LAB 2', 575, 170, 260, 3], ['LAB ?', 985, 140, 250, -2], ['ex-LAB → RH', 1360, 165, 380, 5]].forEach(([s, x, y, w, r]) => E.D.label(ctx, s, x, y, w, 84, r));
          for (let k = 0; k < 6; k++) {
            const p = E.prog(t, offAt(k), offAt(k) + 0.3);
            if (p > 0 && p < 1) E.fx.sparkle(ctx, 230 + k * 205, 360, 30 * (1 - p), t);
          }
          D2.table(ctx);
          E.D.cable(ctx, 1350, 640, 1560, 400, t, t > b.type.start && t < b.off.end);
          E.D.laptopFront(ctx, 840, 600, 560, 300, (c, x, y, w, h) => {
            c.fillStyle = '#102027';
            c.fillRect(x, y, w, h);
            const lines = [typed.slice(0, nType) + (Math.floor(t * 3) % 2 && !done ? '▌' : ''), t > b.off.start ? 'shutdown' + (done ? ' OK' : dots) : ''];
            lines.forEach((s, i) => E.text(c, s, x + 40, y + 100 + i * 80, { font: '"Courier New"', bold: true, size: 52, color: '#69F0AE' }));
          });
          const typing = t > b.type.start && t < b.type.end;
          const proud = t > b.t2.start ? E.jump(t, b.t2.start, 0.4, 40) : 0;
          T = E.actor(ctx, S, t, { who: 'theo', x: 420, y: 1080, h: 620, lift: (typing ? Math.abs(Math.sin(t * 15)) * 6 : 0) + proud, tilt: typing ? 3 : 0 });
          if (t > b.t2.start && t < b.omen.start) E.fx.sparkle(ctx, T.head.x + 190, T.head.y + 60, 32, t);
        });
        E.fx.vignette(ctx, E.prog(t, b.omen.start, b.omen.start + 1.1) * 0.7);
        E.caption(ctx, 'Vendredi, 18h00.', t, 0.5);
        E.bubble(ctx, S, t, 't2', { x: 600, y: 462, w: 1120, size: 40, tip: E.toScreen(cam, T.head), hideAt: b.omen.start + 0.3 });
      },
    },

    // ───────────── 3. Case 3 — la panique ─────────────
    {
      id: 'openspace', label: 'Case 3 — 18h03 (la panne au 2e étage)', music: 'tense',
      trans: { type: 'wipe', dur: 0.7 },
      beats: [
        { id: 'in', wait: 1.6, sfx: [['pop', 0.4, 0.5], ['notif', 0.9, 0.2]] },
        { id: 'cut', wait: 1.3, sfx: [['disconnect', 0, 0.6], ['murmur', 0.3, 0.4, { dur: 4.5 }], ['pop', 0.5, 0.4], ['pop', 0.75, 0.4]] },
        { id: 'l3', say: 'laurent', text: 'Allô, Montréal ? Allô ?!', tts: 'Allô, Montréal ? Allô ?' },
        { id: 'm3', say: 'marc', shout: true, text: "Pourquoi tout le 2e étage\nn'a plus de réseau ?!", tts: "Pourquoi tout le deuxième étage n'a plus de réseau ?!", sfx: [['whoosh', 0, 0.5], ['shock', 0.05, 0.4]] },
        { id: 'hold', wait: 1.1 },
      ],
      draw(ctx, S, t) {
        const b = S.beats;
        let cam = E.kf(t, [[0, { x: 960, y: 540, z: 1.04 }], [b.m3.start, { x: 960, y: 540, z: 1 }], [b.hold.end, { x: 1000, y: 560, z: 1.06 }]]);
        cam = E.camAdd(cam, E.shake(t, b.m3.start + 0.45, 0.5, 14));
        const frozen = t > b.cut.start;
        const glitch = t > b.cut.start && t < b.cut.start + 0.35;
        const mx = E.kf(t, [[b.m3.start - 0.1, 2300], [b.m3.start + 0.45, 1640]], 'out');
        let L, M;
        E.withCam(ctx, cam, () => {
          E.D.wall(ctx, '#ECEFF1', 1000, '#B0BEC5');
          // collègues au fond (en retrait)
          [['emp1', 1260], ['emp2', 1470]].forEach(([w, x], k) => {
            const head = E.actor(ctx, null, t, { who: w, x, y: 800, h: 380, alpha: 0.55, lift: frozen ? Math.abs(Math.sin(t * 7 + k)) * 6 : 0 });
            E.D.wifiOff(ctx, head.head.x, head.head.y - 50, 46, E.prog(t, b.cut.start + 0.5 + k * 0.25, b.cut.start + 0.8 + k * 0.25));
          });
          L = E.actor(ctx, S, t, { who: 'laurent', x: 330, y: 1080, h: 690, tilt: t > b.l3.start && t < b.m3.start ? Math.sin(t * 14) * 2 : 0 });
          E.D.monitor(ctx, 560, 440, 520, 330, (c, x, y, w, h) => {
            c.fillStyle = frozen && !glitch ? '#1C262B' : '#263238';
            c.fillRect(x, y, w, h);
            if (!frozen || glitch) {
              const off = glitch ? Math.sin(t * 90) * 20 : 0;
              E.text(c, 'Montréal', x + 24 + off, y + 48, { font: 'Arial', bold: true, size: 32, color: '#FFFFFF' });
              E.circle(c, x + w - 36, y + 36, 11, '#66FF66', null);
              for (let i = 0; i < 3; i++) {
                const tx = x + 20 + i * ((w - 40) / 3), ty = y + 80;
                E.box(c, tx + 4, ty, (w - 40) / 3 - 8, h - 100, '#37474F', null);
                const bob = frozen ? 0 : Math.sin(t * 3 + i * 2) * 6;
                E.circle(c, tx + (w - 40) / 6 - off, ty + 70 + bob, 34, ['#FFCC80', '#BCAAA4', '#FFE0B2'][i], '#111', 3);
                E.box(c, tx + (w - 40) / 6 - 50 - off, ty + 112 + bob, 100, 80, ['#5C6BC0', '#26A69A', '#EF5350'][i], '#111', 3, 30);
              }
            } else {
              E.D.spinner(c, x + w / 2, y + 95, 30, t);
              E.text(c, 'Montréal…', x + w / 2, y + 190, { font: 'Arial', size: 40, color: '#FFFFFF', align: 'center' });
              E.text(c, 'connexion perdue', x + w / 2, y + 245, { font: 'Arial', size: 40, color: '#FFFFFF', align: 'center' });
            }
          });
          E.box(ctx, -60, 900, 1260, 300, '#B0BEC5', '#78909C', 6);
          if (t > b.m3.start - 0.1) {
            const running = t < b.m3.start + 0.45;
            const wk = E.walk(t, running, 16);
            M = E.actor(ctx, S, t, { who: 'marc', x: mx, y: 1080, h: 660, flip: true, lift: wk.lift, tilt: wk.tilt - (running ? 6 : 0), squash: E.pop(t, b.m3.start + 0.45) });
            if (running) E.fx.speed(ctx, mx + 220, 1000, 560, 1, t);
            E.fx.shock(ctx, M.head.x, M.head.y + 140, 170, t, 1 - E.prog(t, b.m3.start + 1.2, b.m3.start + 1.6));
          } else M = { head: { x: 2100, y: 400 } };
          if (t > b.l3.start) E.fx.sweat(ctx, L.head.x - 110, L.head.y + 90, t, 2);
        });
        E.caption(ctx, '18h03.', t, 0.4);
        E.bubble(ctx, S, t, 'l3', { x: 60, y: 120, w: 610, tip: E.toScreen(cam, L.head) });
        E.bubble(ctx, S, t, 'm3', { x: 1000, y: 130, w: 820, tip: E.toScreen(cam, M.head) });
      },
    },

    // ───────────── 4. Case 4 — la chute ─────────────
    {
      id: 'baie', label: 'Case 4 — Devant la baie (la chute)', music: 'none',
      trans: { type: 'whip', dur: 0.6 },
      beats: [
        { id: 't4', say: 'theo', text: 'Mais… tous ces ports disent « LAB » !', tts: 'Mais... tous ces ports disent LAB !' },
        { id: 'lean', wait: 1.8, sfx: [['peel', 0.7, 0.5], ['whoosh', 0.1, 0.2]] },
        { id: 'm4a', say: 'marc', text: '…Ce sont les étiquettes de 2017.', tts: 'Ce sont les étiquettes de 2017.' },
        { id: 'beat', wait: 0.6 },
        { id: 'm4b', say: 'marc', bold: true, text: 'Lundi, on refait les étiquettes. Et toi, tu reformules mes consignes.' },
        { id: 'end', wait: 2.2, sfx: [['badumtss', 0.2, 0.6]] },
      ],
      draw(ctx, S, t) {
        const b = S.beats;
        const cam = E.kf(t, [
          [0, { x: 960, y: 540, z: 1 }],
          [b.lean.start + 0.2, { x: 960, y: 540, z: 1 }],
          [b.lean.start + 1.0, { x: 980, y: 560, z: 1.55 }],
          [b.m4a.end, { x: 980, y: 560, z: 1.55 }],
          [b.m4a.end + 0.5, { x: 960, y: 540, z: 1 }],
        ]);
        const lean = E.kf(t, [[b.lean.start, 0], [b.lean.start + 0.6, 1], [b.m4a.end, 1], [b.m4a.end + 0.4, 0]]);
        const peel = E.ease.outBack(E.prog(t, b.lean.start + 0.7, b.lean.start + 1.0));
        const nod = t > b.m4b.start ? Math.abs(Math.sin(t * 9)) * 12 * (1 - E.prog(t, b.end.start + 0.8, b.end.end)) : 0;
        let T, M;
        E.withCam(ctx, cam, () => {
          E.D.wall(ctx, '#CFD8DC', 1040, '#90A4AE');
          E.box(ctx, 730, 420, 520, 560, '#37474F', E.INK, 8, 8);
          for (let k = 0; k < 3; k++) E.box(ctx, 775 + k * 150, 860, 120, 76, '#111111', '#9E9E9E', 3);
          E.D.label(ctx, 'LAB', 760, 450, 200, 84, -4, peel);
          E.D.label(ctx, 'LAB ?', 990, 470, 220, 84, 3);
          E.D.label(ctx, 'ex-LAB → RH', 760, 600, 440, 84, -2);
          E.fx.dust(ctx, 955, 450, E.prog(t, b.lean.start + 0.75, b.lean.start + 1.6), 7);
          T = E.actor(ctx, S, t, { who: 'theo', pose: 'choc', x: 340, y: 1080, h: 640, tilt: t < b.t4.end ? Math.sin(t * 30) * 1.5 : 0, lift: nod });
          M = E.actor(ctx, S, t, { who: 'marc', x: E.lerp(1640, 1440, lean), y: 1080, h: 660, flip: true, tilt: -9 * lean, sx: 1 + 0.06 * lean, sy: 1 + 0.06 * lean });
          if (t > b.m4a.start) E.fx.sweat(ctx, M.head.x - 120, M.head.y + 70, t, 1);
          if (t > b.t4.start && t < b.lean.end) E.fx.mark(ctx, '!', T.head.x + 150, T.head.y, 100, E.prog(t, b.t4.start, b.t4.start + 0.25));
        });
        E.bubble(ctx, S, t, 't4', { x: 60, y: 60, w: 620, tip: E.toScreen(cam, T.head), hideAt: b.lean.start + 0.4 });
        E.bubble(ctx, S, t, 'm4a', { x: 1120, y: 110, w: 720, tip: E.toScreen(cam, M.head) });
        E.bubble(ctx, S, t, 'm4b', { x: 600, y: 235, w: 860, tip: E.toScreen(cam, M.head) });
      },
    },

    // ───────────── 5. Morale ─────────────
    {
      id: 'morale', label: 'Morale', music: 'calm',
      trans: { type: 'fade', dur: 0.8 },
      beats: [{ id: 'm', wait: 7.5, sfx: [['ding', 0.6, 0.3]] }],
      draw(ctx, S, t, film) { E.moralCard(ctx, t, film); },
    },
  ],
};

const D2 = {
  table(ctx) { E.box(ctx, 760, 900, 1300, 300, '#90A4AE', '#607D8B', 6); },
};
