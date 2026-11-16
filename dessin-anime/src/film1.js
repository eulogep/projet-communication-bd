/* film1.js — « Tout le monde a terminé… sauf le projet ! »
 * Les textes des bulles (text) sont ceux de la planche, mot pour mot.
 * tts = prononciation donnée à la synthèse vocale (heures écrites en toutes lettres…).
 * Pour modifier un dialogue : changer text/tts ici, puis `npm run audio`.
 */
window.FILMS = window.FILMS || {};
window.FILMS.film1 = {
  id: 'film1',
  title: 'Tout le monde a terminé… sauf le projet !',
  subtitle: "— Automne, à l'université",
  color: '#2B4C7E',
  moralFill: '#E3EEFA',
  moralBorder: '#2B4C7E',
  moral:
    "Quatre parties terminées ne font pas un projet. Mettez-vous d'accord tôt sur les règles communes, et testez ensemble avant de dire « terminé ».",
  voices: {
    karim: 'Eddy (Français (France))',
    yanis: 'Rocko (Français (France))',
    ines: 'Flo (Français (France))',
    lea: 'Shelley (Français (France))',
    bernard: 'Jacques',
  },
  rates: { karim: 190, yanis: 180, ines: 190, lea: 185, bernard: 165 },

  titleDeco(ctx, t) {
    // les 4 pièces arrivent… mais ne s'emboîtent pas
    const pts = [[-240, 0], [-80, 0], [80, 0], [240, 0]];
    pts.forEach(([dx], k) => {
      const p = E.ease.outBack(E.prog(t, 0.9 + k * 0.12, 1.5 + k * 0.12));
      const from = [[-200, 1300], [600, 1400], [1300, 1400], [2100, 1300]][k];
      const hop = E.jump(t, 1.55, 0.45, 40) * (k % 2 ? 1 : -1);
      const x = E.lerp(from[0], E.W / 2 + dx * (1 + E.prog(t, 1.55, 1.9) * 0.25), p);
      const y = E.lerp(from[1], 760, p) - Math.abs(hop);
      E.puzzle(ctx, x, y, 92, E.PUZ[k], Math.sin(t * 2 + k) * 0.15 + hop * 0.004);
    });
  },

  scenes: [
    // ───────────── 0. Titre ─────────────
    {
      id: 'titre', label: 'Carton titre', music: 'title',
      beats: [{ id: 't', wait: 4.2, sfx: [['whoosh', 0.1, 0.5], ['pop', 0.6, 0.6], ['pop', 1.0, 0.35], ['pop', 1.25, 0.35], ['boing', 1.55, 0.5]] }],
      draw(ctx, S, t, film) { E.titleCard(ctx, t, film); },
    },

    // ───────────── 1. Case 1 — chacun dans sa bulle ─────────────
    {
      id: 'biblio', label: 'Case 1 — La veille du rendu, 18h (bibliothèque)', music: 'calm',
      trans: { type: 'wipe', dur: 0.7 },
      beats: [
        { id: 'intro', wait: 2.8, sfx: [['pop', 0.5, 0.5], ['typing', 0.8, 0.35, { dur: 1.9 }]] },
        { id: 'k1', say: 'karim', text: "Moi, j'ai terminé !", sfx: [['boing', 0, 0.3]] },
        { id: 'y1', say: 'yanis', text: 'Moi aussi !', sfx: [['pop', 0, 0.35]] },
        { id: 'i1', say: 'ines', text: 'Pareil !', sfx: [['pop', 0, 0.35]] },
        { id: 'fin', wait: 1.6, sfx: [['ding', 0.3, 0.25]] },
      ],
      draw(ctx, S, t) {
        const b = S.beats;
        const cam = E.kf(t, [
          [0, { x: 520, y: 600, z: 1.4 }],
          [b.intro.end - 0.3, { x: 1400, y: 600, z: 1.4 }],
          [b.k1.start + 0.5, { x: 960, y: 540, z: 1 }],
        ]);
        const xs = [300, 760, 1220, 1680];
        const who = ['karim', 'ines', 'yanis', 'lea'];
        const poses = ['fier', 'contente', 'base', 'base'];
        const speak = { karim: b.k1, yanis: b.y1, ines: b.i1 };
        const typing = t < b.k1.start;
        const H = {};
        E.withCam(ctx, cam, () => {
          E.D.library(ctx);
          who.forEach((w, k) => {
            const B = speak[w];
            const j = B ? E.jump(t, B.start, 0.45, 70) : 0;
            const ty = typing ? Math.abs(Math.sin(t * 16 + k * 1.3)) * 6 : 0;
            const flip = w === 'lea' ? E.at(t, [[0, false], [b.fin.start + 0.1, true], [b.fin.start + 0.55, false], [b.fin.start + 1.0, true]]) : false;
            H[w] = E.actor(ctx, S, t, {
              who: w, pose: poses[k], x: xs[k], y: 985, h: 530, flip,
              lift: j + ty, squash: B ? E.pop(t, B.start + 0.42) : 0,
              tilt: typing ? Math.sin(t * 3 + k) * 1.5 : 0,
            });
          });
          [530, 990, 1450].forEach((x) => E.box(ctx, x - 7, 560, 14, 540, '#90A4AE', '#607D8B', 3));
          xs.forEach((x, k) => {
            E.D.laptopBack(ctx, x, 725, 230, 125, E.PUZ[k], speak[who[k]] ? E.prog(t, speak[who[k]].start, speak[who[k]].start + 0.2) * 0.6 : 0);
            E.D.table(ctx, x - 205, 845, 410, 300);
          });
          // satisfaction générale : petites étoiles au-dessus de chaque « terminé »
          for (const w of ['karim', 'yanis', 'ines']) {
            const B = speak[w];
            if (t > B.start && t < B.start + 1.2) E.fx.sparkle(ctx, H[w].head.x + 120, H[w].head.y + 30, 26, t);
          }
        });
        E.caption(ctx, 'La veille du rendu, 18h.', t, 0.5);
        const tip = (w) => E.toScreen(cam, H[w].head);
        E.bubble(ctx, S, t, 'k1', { x: 60, y: 135, w: 520, tip: tip('karim') });
        E.bubble(ctx, S, t, 'y1', { x: 1180, y: 180, w: 420, tip: tip('yanis') });
        E.bubble(ctx, S, t, 'i1', { x: 610, y: 330, w: 330, tip: tip('ines') });
      },
    },

    // ───────────── 2. Case 2 — la fausse bonne nouvelle ─────────────
    {
      id: 'tableau', label: 'Case 2 — Léa planifie l’assemblage (tableau blanc)', music: 'calm',
      trans: { type: 'whip', dur: 0.6 },
      beats: [
        { id: 'walk', wait: 1.7, sfx: [['steps', 0.05, 0.4, { dur: 1.5 }]] },
        { id: 'write', wait: 1.9, sfx: [['marker', 0.1, 0.45, { dur: 0.75 }], ['marker', 0.95, 0.45, { dur: 0.8 }]] },
        { id: 'l1', say: 'lea', text: 'Parfait ! On assemble demain à 8h30. Rendu à 9h.', tts: 'Parfait ! On assemble demain à 8 heures 30. Rendu à 9 heures.' },
        { id: 'l2', say: 'lea', text: 'Ça prendra 5 minutes, max !', bold: true },
        { id: 'omen', wait: 2.4, sfx: [['sting', 0.1, 0.6]] },
      ],
      draw(ctx, S, t) {
        const b = S.beats;
        const cam = E.kf(t, [
          [0, { x: 960, y: 540, z: 1 }],
          [b.omen.start + 0.1, { x: 960, y: 540, z: 1 }],
          [b.omen.start + 1.3, { x: 1450, y: 420, z: 2.1 }],
        ]);
        const walking = t < b.walk.end - 0.1;
        const wk = E.walk(t, walking, 10);
        const lx = E.kf(t, [[0, -280], [b.walk.end, 470]], 'out');
        const nod = t > b.l1.start && t < b.omen.start ? Math.abs(Math.sin(t * 5)) * 9 : 0;
        let L;
        E.withCam(ctx, cam, () => {
          E.D.wall(ctx, '#EFE6D8', 1000, '#BCAAA4');
          E.D.whiteboard(ctx, 1050, 130, 800, 460, ['Demain 8h30 :', 'Assemblage = 5 min !'], E.prog(t, b.write.start + 0.1, b.write.end - 0.2));
          ['karim', 'ines', 'yanis'].forEach((w, k) =>
            E.actor(ctx, S, t, { who: w, pose: ['fier', 'contente', 'base'][k], x: 1230 + k * 230, y: 1085, h: 330, lift: nod * (k % 2 ? 0.6 : 1) })
          );
          L = E.actor(ctx, S, t, { who: 'lea', pose: 'pointe', x: lx, y: 1090, h: 720, lift: wk.lift, tilt: wk.tilt });
          if (walking) E.fx.speed(ctx, lx - 260, 1050, 500, -1, t, 4);
        });
        E.fx.vignette(ctx, E.prog(t, b.omen.start, b.omen.start + 1.2) * 0.75);
        const tip = E.toScreen(cam, L.head);
        const hide = b.omen.start + 0.35;
        E.bubble(ctx, S, t, 'l1', { x: 60, y: 40, w: 900, tip, hideAt: hide });
        E.bubble(ctx, S, t, 'l2', { x: 120, y: 260, w: 640, tip, hideAt: hide });
      },
    },

    // ───────────── 3a. Case 3 — le lendemain, 8h52 ─────────────
    {
      id: 'horloge', label: 'Case 3 — Le lendemain, 8h52 (assemblage)', music: 'none',
      trans: { type: 'iris', dur: 0.8 },
      beats: [
        { id: 'clock', wait: 2.4, sfx: [['tick', 0.3, 0.5], ['tick', 1.3, 0.7], ['tick', 2.3, 0.5]] },
        { id: 'pull', wait: 1.0, sfx: [['whoosh', 0, 0.4]] },
        { id: 'load', wait: 2.7, sfx: [['typing', 0.1, 0.3, { dur: 1.1 }], ['tick', 1.3, 0.3], ['tick', 2.3, 0.3]] },
      ],
      draw(ctx, S, t) {
        const b = S.beats;
        const cam = E.kf(t, [
          [0, { x: 1690, y: 190, z: 2.6 }],
          [b.pull.start, { x: 1690, y: 190, z: 2.6 }],
          [b.pull.end, { x: 960, y: 540, z: 1 }],
        ]);
        const p = E.kf(t, [[b.load.start, 0], [b.load.start + 1.6, 0.8], [b.load.end, 0.97]], 'out');
        classroom(ctx, S, t, {
          cam,
          minute: E.at(t, [[0, 51], [1.3, 52]]),
          poses: ['fier', 'base', 'contente', 'base'],
          screen(c, x, y, w, h) {
            E.text(c, 'Assemblage en cours…', x + w / 2, y + 110, { font: '"Courier New"', bold: true, size: 34, color: '#69F0AE', align: 'center' });
            E.box(c, x + 40, y + 170, w - 80, 46, null, '#69F0AE', 4);
            E.box(c, x + 48, y + 178, (w - 96) * p, 30, '#69F0AE', null);
            E.text(c, Math.round(p * 100) + ' %', x + w / 2, y + 270, { font: '"Courier New"', bold: true, size: 34, color: '#69F0AE', align: 'center' });
          },
          hope: t > b.load.start,
        });
        E.caption(ctx, 'Le lendemain, 8h52.', t, 1.4);
      },
    },

    // ───────────── 3b. Case 3 — la catastrophe ─────────────
    {
      id: 'erreur', label: 'Case 3 — L’erreur et la dispute', music: 'tense',
      beats: [
        { id: 'err', wait: 1.8, sfx: [['error', 0, 0.6], ['error', 0.5, 0.6], ['shock', 0.02, 0.5]] },
        { id: 'puz', wait: 2.3, sfx: [['pop', 0.05, 0.4], ['pop', 0.15, 0.4], ['pop', 0.25, 0.4], ['pop', 0.35, 0.4], ['boing', 1.05, 0.5], ['boing', 1.2, 0.4]] },
        { id: 'k3', say: 'karim', shout: true, text: 'Pourquoi ta page envoie « login » et ma base attend « identifiant » ?!', tts: 'Pourquoi ta page envoie login, et ma base attend identifiant ?!' },
        { id: 'i3', say: 'ines', text: 'Et pourquoi la tienne est en anglais ?!' },
        { id: 'hold', wait: 1.3 },
      ],
      draw(ctx, S, t) {
        const b = S.beats;
        let cam = E.kf(t, [
          [0, { x: 960, y: 540, z: 1 }],
          [b.puz.end - 0.2, { x: 960, y: 540, z: 1 }],
          [b.k3.start + 0.4, { x: 620, y: 600, z: 1.16 }],
          [b.i3.start, { x: 620, y: 600, z: 1.16 }],
          [b.i3.start + 0.45, { x: 930, y: 600, z: 1.12 }],
        ]);
        cam = E.camAdd(cam, E.shake(t, 0, 0.7, 20));
        cam = E.camAdd(cam, E.shake(t, b.k3.start, 0.5, 9));
        const flash = t < b.err.end && Math.floor(t * 7) % 2 === 0;
        const glitch = t < 0.6 ? Math.sin(t * 80) * 14 : 0;
        const pz = b.puz;
        classroom(ctx, S, t, {
          cam,
          minute: 52,
          poses: ['bras', 'base', 'agacee', 'bras'],
          swapAt: 0,
          inesFlip: t > b.i3.start - 0.15,
          inesFlipAt: b.i3.start - 0.15,
          yanisShrink: E.prog(t, b.k3.start, b.k3.start + 0.3) * (1 - E.prog(t, b.hold.start, b.hold.end)),
          shock: 1 - E.prog(t, 1.2, 1.7),
          marks: t,
          screen(c, x, y, w, h) {
            c.fillStyle = flash ? '#B71C1C' : '#263238';
            c.fillRect(x, y, w, h);
            ['ERREUR :', 'champ', '"identifiant"', 'introuvable'].forEach((s, i) =>
              E.text(c, s, x + w / 2 + (i % 2 ? glitch : -glitch), y + 70 + i * 62, { font: '"Courier New"', bold: true, size: 46, color: flash ? '#FFFFFF' : '#FF5252', align: 'center' })
            );
          },
          after(c) {
            // les quatre pièces de puzzle sortent de l'écran, se cognent et rebondissent
            if (t < pz.start) return;
            const cx = 1010, cy = 430;
            for (let k = 0; k < 4; k++) {
              const a = (k / 4) * Math.PI * 2 + 0.6;
              const p1 = E.ease.out(E.prog(t, pz.start + k * 0.1, pz.start + 0.5 + k * 0.1));
              const p2 = E.ease.in(E.prog(t, pz.start + 0.6, pz.start + 1.05));
              const p3 = E.prog(t, pz.start + 1.05, pz.start + 2.3);
              let r = E.lerp(0, 260, p1);
              r = E.lerp(r, 70, p2);
              r += p3 * 700;
              const x = cx + Math.cos(a) * r;
              const y = (p1 < 1 ? E.lerp(300, cy, p1) : cy) + Math.sin(a) * r * 0.6 + p3 * p3 * 600 - Math.sin(p3 * Math.PI) * 150;
              c.globalAlpha = 1 - E.prog(t, pz.start + 1.8, pz.start + 2.3);
              E.puzzle(c, x, y, 90, E.PUZ[k], t * 3 * (k % 2 ? 1 : -1) * p3 + k);
              c.globalAlpha = 1;
            }
            if (t > pz.start + 1.0 && t < pz.start + 1.5) E.fx.mark(c, 'BOING', cx, cy - 150, 90, E.prog(t, pz.start + 1.0, pz.start + 1.2), '#FFFFFF');
          },
          bubbles(H, camNow) {
            const tip = (w) => E.toScreen(camNow, H[w].head);
            E.bubble(ctx, S, t, 'k3', { x: 60, y: 60, w: 820, tip: tip('karim') });
            E.bubble(ctx, S, t, 'i3', { x: 1040, y: 120, w: 690, tip: tip('ines') });
          },
        });
      },
    },

    // ───────────── 4. Case 4 — la chute ─────────────
    {
      id: 'jury', label: 'Case 4 — Devant le professeur (la chute)', music: 'none',
      trans: { type: 'slide', dur: 0.75 },
      beats: [
        { id: 'in', wait: 1.5, sfx: [['tap', 0.6, 0.4], ['tap', 0.85, 0.4], ['tap', 1.1, 0.4]] },
        { id: 'b1', say: 'bernard', text: 'Vous avez testé le projet ensemble ?' },
        { id: 'look', wait: 1.1, sfx: [['whoosh', 0.1, 0.18]] },
        { id: 'l4', say: 'lea', text: 'Euh… chacun a testé sa partie.', tts: 'Euh... chacun a testé sa partie.' },
        { id: 'cri', wait: 1.8, sfx: [['crickets', 0.1, 0.45, { dur: 1.6 }]] },
        { id: 'b2', say: 'bernard', bold: true, text: "Bravo. Vous avez réussi quatre projets. J'en avais demandé un." },
        { id: 'sad', wait: 3.0, sfx: [['trombone', 0.2, 0.55]] },
      ],
      draw(ctx, S, t) {
        const b = S.beats;
        const cam =
          t < b.sad.start
            ? E.kf(t, [
                [0, { x: 960, y: 540, z: 1.06 }],
                [b.in.end, { x: 960, y: 540, z: 1 }],
                [b.cri.start, { x: 960, y: 540, z: 1 }],
                [b.b2.start + 0.3, { x: 560, y: 520, z: 1.35 }],
                [b.sad.start, { x: 560, y: 520, z: 1.42 }],
              ])
            : E.kf(t, [[b.sad.start, { x: 960, y: 540, z: 1.0 }], [S.dur, { x: 1200, y: 600, z: 1.08 }]]);
        const deflate = E.ease.out(E.prog(t, b.sad.start + 0.3, b.sad.start + 1.6));
        const H = {};
        E.withCam(ctx, cam, () => {
          E.D.wall(ctx, '#E3EAF2');
          const st = [['karim', 'bras'], ['yanis', 'base'], ['ines', 'agacee'], ['lea', 'bras']];
          st.forEach(([w, pose], k) => {
            const flip = E.at(t, [[0, false], [b.look.start + 0.1 + k * 0.06, k % 2 === 0], [b.look.start + 0.55 + k * 0.05, k % 2 === 1], [b.look.end, false]]);
            H[w] = E.actor(ctx, S, t, { who: w, pose, x: 1160 + k * 210, y: 985 + deflate * 26, h: 360, flip, sy: 1 - deflate * 0.14 });
            E.fx.sweat(ctx, H[w].head.x + 62, H[w].head.y + 70, t, k, 0.8);
          });
          H.bernard = E.actor(ctx, S, t, { who: 'bernard', x: 470, y: 1010, h: 780 });
          E.D.table(ctx, -60, 900, 2040, 300, '#8D6E63', '#5D4037');
          E.D.noteSheet(ctx, 840, 975, -4);
          // stylo qui tapote
          const tap = t < b.in.end ? Math.abs(Math.sin(t * 13)) * 14 : 0;
          E.line(ctx, 1020, 960 - tap, 1110, 925 - tap, '#283593', 12);
          E.puzzle(ctx, 1170, 995, 64, E.PUZ[0], -0.2);
          E.puzzle(ctx, 1340 + deflate * 20, 1000, 64, E.PUZ[1], 0.15);
          E.puzzle(ctx, 1520 + deflate * 40, 995, 64, E.PUZ[2], -0.1);
          E.puzzle(ctx, 1700 + deflate * 70, 1002, 64, E.PUZ[3], 0.25);
        });
        if (t > b.cri.start && t < b.b2.start) E.fx.mark(ctx, '…', 1500, 300, 120, E.prog(t, b.cri.start, b.cri.start + 0.3), '#FFFFFF');
        const tip = (w) => E.toScreen(cam, H[w].head);
        E.bubble(ctx, S, t, 'b1', { x: 60, y: 50, w: 720, tip: tip('bernard'), hideAt: b.b2.start });
        E.bubble(ctx, S, t, 'l4', { x: 1130, y: 230, w: 620, tip: tip('lea'), hideAt: b.b2.start });
        E.bubble(ctx, S, t, 'b2', { x: 1000, y: 110, w: 840, tip: tip('bernard') });
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

/* Salle de cours commune aux deux moitiés de la case 3 */
function classroom(ctx, S, t, o) {
  const xs = [260, 700, 1140, 1580];
  const who = ['karim', 'yanis', 'ines', 'lea'];
  const H = {};
  E.withCam(ctx, o.cam, () => {
    E.D.wall(ctx, '#E3EAF2', 1040, '#B0BEC5');
    E.D.clock(ctx, 1690, 190, 120, 8, o.minute);
    E.D.monitor(ctx, 760, 110, 500, 360, o.screen);
    who.forEach((w, k) => {
      const swap = o.swapAt != null ? E.pop(t, o.swapAt) : 0;
      const flip = w === 'ines' && o.inesFlip;
      const sq = swap + (w === 'ines' && o.inesFlipAt != null ? E.pop(t, o.inesFlipAt) : 0);
      const hope = o.hope ? Math.abs(Math.sin(t * 4 + k)) * 6 : 0;
      H[w] = E.actor(ctx, S, t, {
        who: w, pose: o.poses[k], x: xs[k], y: 1080, h: 540, flip, squash: sq, lift: hope,
        sy: w === 'yanis' && o.yanisShrink ? 1 - o.yanisShrink * 0.09 : 1,
      });
      if (o.shock > 0) E.fx.shock(ctx, H[w].head.x, H[w].head.y + 120, 150, t, o.shock);
      if (o.marks != null) E.fx.mark(ctx, '!', H[w].head.x + 10, H[w].head.y - 40, 110, E.prog(t, 0.05 + k * 0.05, 0.3 + k * 0.05) * (1 - E.prog(t, 1.4, 1.7)));
      if (o.marks != null && (w === 'yanis' || w === 'lea')) E.fx.sweat(ctx, H[w].head.x + 95, H[w].head.y + 70, t, k);
    });
    if (o.after) o.after(ctx);
  });
  if (o.bubbles) o.bubbles(H, o.cam);
  return H;
}
