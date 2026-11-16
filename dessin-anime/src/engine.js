/* engine.js — moteur d'animation 2D sur Canvas.
 * Rendu déterministe : chaque image est une fonction pure du temps t,
 * ce qui permet l'aperçu en direct ET l'export image par image en MP4.
 * Scène de référence : 1920 × 1080.
 */
(function () {
  const E = (window.E = {});
  E.W = 1920;
  E.H = 1080;
  E.FPS = 30;
  const INK = '#1a1a1a';
  E.INK = INK;
  const TAU = Math.PI * 2;

  // ───────────────────────── maths & interpolation ─────────────────────────
  E.clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  E.lerp = (a, b, p) => a + (b - a) * p;
  E.prog = (t, a, b) => (b <= a ? (t >= b ? 1 : 0) : E.clamp((t - a) / (b - a)));
  E.ease = {
    lin: (p) => p,
    in: (p) => p * p * p,
    out: (p) => 1 - Math.pow(1 - p, 3),
    inOut: (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
    outBack: (p) => {
      const c1 = 1.70158, c3 = c1 + 1;
      return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
    },
    outElastic: (p) =>
      p === 0 ? 0 : p === 1 ? 1 : Math.pow(2, -10 * p) * Math.sin((p * 10 - 0.75) * (TAU / 3)) + 1,
  };
  E.tw = (t, a, b, v0, v1, ease = 'inOut') => E.lerp(v0, v1, E.ease[ease](E.prog(t, a, b)));
  /** images-clés : [[t, valeur], …] ; valeur = nombre ou objet de nombres */
  E.kf = (t, keys, ease = 'inOut') => {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      if (t <= keys[i][0]) {
        const [t0, a] = keys[i - 1];
        const [t1, b] = keys[i];
        const p = E.ease[ease](E.prog(t, t0, t1));
        if (typeof a === 'number') return E.lerp(a, b, p);
        const o = {};
        for (const k in a) o[k] = E.lerp(a[k], b[k], p);
        return o;
      }
    }
    return keys[keys.length - 1][1];
  };
  /** fonction en escalier : [[t, valeur], …] */
  E.at = (t, keys) => {
    let v = keys[0][1];
    for (const [k, val] of keys) if (t >= k) v = val;
    return v;
  };
  E.rand = (n) => {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  };
  /** impulsion d'écrasement (squash) qui retombe : 0 → pic → 0 */
  E.pop = (t, t0, d = 0.35) => {
    if (t < t0 || t > t0 + d) return 0;
    const p = E.prog(t, t0, t0 + d);
    return Math.sin(p * Math.PI * 2.2) * (1 - p) * 0.12;
  };
  E.jump = (t, t0, d, h) => (t < t0 || t > t0 + d ? 0 : Math.sin(E.prog(t, t0, t0 + d) * Math.PI) * h);
  E.shake = (t, t0, d, amp) => {
    if (t < t0 || t > t0 + d) return { x: 0, y: 0 };
    const k = (1 - E.prog(t, t0, t0 + d)) * amp;
    return { x: Math.sin(t * 93) * k, y: Math.cos(t * 71) * k };
  };
  /** marche : petit rebond + balancement (les personnages sont des bustes) */
  E.walk = (t, moving, speed = 9) =>
    moving ? { lift: Math.abs(Math.sin(t * speed)) * 16, tilt: Math.sin(t * speed) * 2.5 } : { lift: 0, tilt: 0 };
  E.nb = (s) => s.replace(/ ([!?:;»])/g, ' $1').replace(/« /g, '« ');

  // ───────────────────────────── caméra ─────────────────────────────
  E.withCam = (ctx, cam, fn) => {
    ctx.save();
    ctx.translate(E.W / 2, E.H / 2);
    ctx.scale(cam.z, cam.z);
    ctx.translate(-cam.x, -cam.y);
    fn();
    ctx.restore();
  };
  E.toScreen = (cam, p) => ({ x: (p.x - cam.x) * cam.z + E.W / 2, y: (p.y - cam.y) * cam.z + E.H / 2 });
  E.camAdd = (cam, d) => ({ x: cam.x + d.x, y: cam.y + d.y, z: cam.z });

  // ───────────────────────────── ressources ─────────────────────────────
  E.PEEPS = [6, 18, 21, 25, 28, 31, 33, 54, 68, 71, 72, 80, 90, 93, 99];
  E.img = {};
  E.loadAssets = (base = 'assets/peeps/') =>
    Promise.all(
      E.PEEPS.map(
        (n) =>
          new Promise((res, rej) => {
            const im = new Image();
            im.onload = () => {
              E.img[n] = im;
              res();
            };
            im.onerror = () => rej(new Error('image manquante : peep-' + n));
            im.src = base + 'peep-' + n + '.png';
          })
      )
    ).then(() =>
      document.fonts
        ? Promise.all(
            ['42px "Comic Sans MS"', 'bold 42px "Comic Sans MS"', 'italic 42px "Comic Sans MS"', '42px Impact', 'italic 42px Cambria', 'bold 42px "Courier New"', 'bold 42px Arial'].map((f) =>
              document.fonts.load(f)
            )
          )
        : null
    );

  // ─────────────────────────── personnages ───────────────────────────
  // Même tête d'une scène à l'autre : seules la pose et l'expression changent.
  E.CHARS = {
    karim: { name: 'Karim', poses: { fier: 21, bras: 68 } },
    ines: { name: 'Inès', poses: { contente: 31, agacee: 71 } },
    yanis: { name: 'Yanis', poses: { base: 28 } },
    lea: { name: 'Léa', poses: { base: 72, pointe: 90, bras: 6 } },
    bernard: { name: 'M. Bernard', poses: { base: 99 } },
    theo: { name: 'Théo', poses: { base: 33, choc: 54 } },
    marc: { name: 'Marc', poses: { base: 18 } },
    laurent: { name: 'Mme Laurent', poses: { base: 93 } },
    emp1: { name: 'Employée', poses: { base: 80 } },
    emp2: { name: 'Employé', poses: { base: 25 } },
  };
  // Bouche de chaque dessin : [x, y] en fraction de l'image, type de visage
  // 0 = visage blanc (on efface la bouche dessinée), 1 = moustache, 2 = barbe noire
  E.MOUTH = {
    21: [0.61, 0.39, 0], 68: [0.61, 0.387, 0], 31: [0.605, 0.387, 0], 71: [0.6, 0.39, 0],
    28: [0.595, 0.418, 1], 72: [0.617, 0.379, 0], 90: [0.605, 0.375, 0], 6: [0.605, 0.385, 0],
    99: [0.56, 0.398, 1], 33: [0.6, 0.372, 0], 54: [0.597, 0.4, 0], 18: [0.61, 0.393, 2], 93: [0.583, 0.395, 0],
  };

  function drawMouth(ctx, n, w, h, amp) {
    const m = E.MOUTH[n];
    if (!m || amp < 0.1) return;
    const mx = (m[0] - 0.5) * w;
    const my = -h + m[1] * h;
    const mw = w * 0.04;
    const mh = h * (0.006 + 0.021 * amp);
    if (m[2] === 0) {
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.ellipse(mx, my, w * 0.05, h * 0.017, 0, 0, TAU);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.ellipse(mx, my + mh * 0.35, mw, mh, 0, 0, TAU);
    ctx.fillStyle = '#5a1a1a';
    ctx.fill();
    ctx.lineWidth = w * 0.011;
    ctx.strokeStyle = m[2] === 2 ? '#fff' : '#111';
    ctx.stroke();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = '#e57373';
    ctx.beginPath();
    ctx.ellipse(mx, my + mh * 1.15, mw * 0.7, mh * 0.6, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  /**
   * Dessine un personnage (ancré en bas, au centre).
   * o : { who, pose, x, y, h, flip, tilt, sx, sy, squash, lift, alpha, talk, phone }
   * Retourne la position de la tête (pour les pointes de bulles et les effets).
   */
  E.actor = (ctx, S, t, o) => {
    const ch = E.CHARS[o.who];
    const n = typeof o.pose === 'number' ? o.pose : ch.poses[o.pose || Object.keys(ch.poses)[0]];
    const im = E.img[n];
    const h = o.h;
    const w = (h * im.width) / im.height;
    const amp = o.talk === false || !S ? 0 : S.amp(o.who, t);
    const seed = o.who.charCodeAt(0) * 0.37 + (o.seed || 0);
    const breath = 1 + Math.sin(t * 2.1 + seed) * 0.007;
    const sq = o.squash || 0;
    const sx = (o.sx ?? 1) * (1 + sq * 0.8);
    const sy = (o.sy ?? 1) * breath * (1 + amp * 0.02) * (1 - sq);
    const tilt = (((o.tilt || 0) + Math.sin(t * 10 + seed) * amp * 1.4) * Math.PI) / 180;
    const x = o.x;
    const y = o.y - (o.lift || 0);
    const dir = o.flip ? -1 : 1;
    ctx.save();
    ctx.globalAlpha *= o.alpha ?? 1;
    ctx.translate(x, y);
    ctx.rotate(tilt);
    ctx.scale(sx * dir, sy);
    ctx.drawImage(im, -w / 2, -h, w, h);
    drawMouth(ctx, n, w, h, amp);
    if (o.phone) {
      // téléphone collé à l'oreille (côté gauche de l'image)
      ctx.save();
      ctx.translate(-w * 0.17, -h * 0.66);
      ctx.rotate(-0.25);
      ctx.fillStyle = '#263238';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(-w * 0.045, -h * 0.075, w * 0.09, h * 0.15, 8);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
    return {
      head: { x: x + dir * w * 0.05 * sx, y: y - h * sy * 0.88 },
      face: { x: x + dir * w * 0.08 * sx, y: y - h * sy * 0.66 },
      w: w * sx,
      h: h * sy,
    };
  };

  // ───────────────────────────── bulles ─────────────────────────────
  E.wrap = (ctx, text, maxW) => {
    const out = [];
    for (const para of text.split('\n')) {
      let line = '';
      for (const word of para.split(' ')) {
        const test = line ? line + ' ' + word : word;
        if (ctx.measureText(test).width > maxW && line) {
          out.push(line);
          line = word;
        } else line = test;
      }
      out.push(line);
    }
    return out;
  };

  function speechShape(ctx, x, y, w, h, tip, stroke, lw) {
    const r = Math.min(34, h / 2);
    let tail = null;
    if (tip) {
      const side = tip.y > y && tip.y < y + h + 40 && (tip.x < x || tip.x > x + w);
      let bx, by, base;
      if (side) {
        // tête à côté de la bulle : pointe qui part du bord gauche ou droit
        bx = tip.x < x ? x : x + w;
        by = E.clamp(tip.y, y + r, y + h - r);
        base = [[bx, by - 22], [bx, by + 22]];
      } else {
        const above = tip.y < y;
        bx = E.clamp(tip.x, x + r + 34, x + w - r - 34);
        by = above ? y : y + h;
        base = [[bx - 26, by], [bx + 26, by]];
      }
      let tx = tip.x, ty = tip.y;
      const L = Math.hypot(tx - bx, ty - by);
      const maxL = 230;
      if (L > maxL) {
        tx = bx + ((tx - bx) * maxL) / L;
        ty = by + ((ty - by) * maxL) / L;
      }
      tail = [base[0], base[1], [tx, ty]];
    }
    const tri = () => {
      ctx.beginPath();
      ctx.moveTo(tail[0][0], tail[0][1]);
      ctx.lineTo(tail[2][0], tail[2][1]);
      ctx.lineTo(tail[1][0], tail[1][1]);
      ctx.closePath();
    };
    const box = () => {
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, r);
    };
    ctx.lineJoin = 'round';
    ctx.lineWidth = lw;
    ctx.strokeStyle = stroke;
    ctx.fillStyle = '#fff';
    if (tail) { tri(); ctx.stroke(); }
    box(); ctx.stroke();
    if (tail) { tri(); ctx.fill(); }
    box(); ctx.fill();
  }

  function cloudShape(ctx, x, y, w, h, tip, lw) {
    const circles = [];
    const per = 2 * (w + h);
    const nB = Math.max(10, Math.round(per / 72));
    for (let i = 0; i < nB; i++) {
      const d = (i / nB) * per;
      let px, py;
      if (d < w) { px = x + d; py = y; }
      else if (d < w + h) { px = x + w; py = y + (d - w); }
      else if (d < 2 * w + h) { px = x + w - (d - w - h); py = y + h; }
      else { px = x; py = y + h - (d - 2 * w - h); }
      circles.push([px, py, 40 * (0.85 + 0.3 * E.rand(i + 3))]);
    }
    if (tip) {
      const sx = x + w * 0.7, sy = y + h + 30;
      for (let k = 1; k <= 3; k++) {
        const p = 0.18 + k * 0.22;
        circles.push([E.lerp(sx, tip.x, p), E.lerp(sy, tip.y, p), 24 - k * 5]);
      }
    }
    ctx.lineWidth = lw;
    ctx.strokeStyle = INK;
    ctx.fillStyle = '#fff';
    for (const [px, py, r] of circles) { ctx.beginPath(); ctx.arc(px, py, r, 0, TAU); ctx.stroke(); }
    for (const [px, py, r] of circles) { ctx.beginPath(); ctx.arc(px, py, r, 0, TAU); ctx.fill(); }
    ctx.fillRect(x, y, w, h);
  }

  /**
   * Bulle liée à une réplique (beat id). Apparition « pop », texte qui s'écrit
   * au rythme de la voix, pointe vers la tête du personnage (coordonnées écran).
   * o : { x, y, w, tip, hideAt, size, bold, kind }
   */
  E.bubble = (ctx, S, t, id, o) => {
    const B = S.beats[id];
    if (!B || t < B.start - 0.05) return;
    const hideAt = o.hideAt ?? Infinity;
    const fade = 1 - E.prog(t, hideAt - 0.25, hideAt);
    if (fade <= 0) return;
    const kind = o.kind || (B.think ? 'think' : B.shout ? 'shout' : 'say');
    const size = o.size || 42;
    const bold = o.bold ?? (B.bold || kind === 'shout');
    ctx.save();
    ctx.font = `${bold ? 'bold ' : ''}${size}px "Comic Sans MS"`;
    const pad = kind === 'think' ? 40 : 30;
    const lines = E.wrap(ctx, E.nb(B.text), o.w - pad * 2);
    const lh = size * 1.22;
    const w = o.w;
    const h = lines.length * lh + pad * 2 - size * 0.18;
    const x = o.x, y = o.y;
    const ap = E.ease.outBack(E.prog(t, B.start - 0.05, B.start + 0.22));
    const shaking = kind === 'shout' && t < B.speechEnd;
    const sh = shaking ? { x: Math.sin(t * 60) * 3, y: Math.cos(t * 47) * 3 } : { x: 0, y: 0 };
    const cx = x + w / 2, cy = y + h / 2;
    ctx.globalAlpha *= fade * E.clamp(ap * 1.6);
    ctx.translate(cx + sh.x, cy + sh.y);
    const s = 0.55 + 0.45 * ap;
    ctx.scale(s, s);
    ctx.translate(-cx, -cy);
    if (kind === 'think') cloudShape(ctx, x, y, w, h, o.tip, 5);
    else speechShape(ctx, x, y, w, h, o.tip, kind === 'shout' ? '#D32F2F' : INK, kind === 'shout' ? 8 : 5);
    const total = lines.reduce((a, l) => a + l.length, 0);
    const rp =
      kind === 'think'
        ? E.prog(t, B.start, B.start + 0.4)
        : E.prog(t, B.start, B.start + Math.max(0.3, (B.speechEnd - B.start) * 0.9));
    let left = Math.ceil(total * rp);
    ctx.fillStyle = INK;
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    lines.forEach((ln, i) => {
      const full = ctx.measureText(ln).width;
      ctx.fillText(ln.slice(0, Math.max(0, left)), cx - full / 2, y + pad + size * 0.86 + i * lh);
      left -= ln.length;
    });
    ctx.restore();
  };

  /** récitatif jaune (en haut à gauche), comme dans les planches */
  E.caption = (ctx, text, t, t0 = 0.3) => {
    if (t < t0) return;
    const p = E.ease.outBack(E.prog(t, t0, t0 + 0.4));
    ctx.save();
    ctx.font = 'italic 40px "Comic Sans MS"';
    const w = ctx.measureText(text).width + 64;
    const x = 34, y = E.lerp(-100, 30, p);
    ctx.fillStyle = '#FFF3B0';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.rect(x, y, w, 72);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + 32, y + 38);
    ctx.restore();
  };

  E.frame = (ctx) => {
    ctx.save();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 16;
    ctx.strokeRect(8, 8, E.W - 16, E.H - 16);
    ctx.restore();
  };

  // ───────────────────────────── formes ─────────────────────────────
  E.box = (ctx, x, y, w, h, fill, stroke = INK, lw = 5, r = 0) => {
    ctx.beginPath();
    if (r) ctx.roundRect(x, y, w, h, r);
    else ctx.rect(x, y, w, h);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.stroke(); }
  };
  E.circle = (ctx, x, y, r, fill, stroke = INK, lw = 5) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.stroke(); }
  };
  E.line = (ctx, x1, y1, x2, y2, color = INK, lw = 5) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineWidth = lw;
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.stroke();
  };
  E.text = (ctx, s, x, y, o = {}) => {
    ctx.save();
    ctx.font = `${o.italic ? 'italic ' : ''}${o.bold ? 'bold ' : ''}${o.size || 40}px ${o.font || '"Comic Sans MS"'}`;
    ctx.fillStyle = o.color || INK;
    ctx.textAlign = o.align || 'left';
    ctx.textBaseline = o.base || 'alphabetic';
    if (o.stroke) {
      ctx.lineWidth = o.lw || 8;
      ctx.strokeStyle = o.stroke;
      ctx.lineJoin = 'round';
      ctx.strokeText(s, x, y);
    }
    ctx.fillText(s, x, y);
    ctx.restore();
  };

  /** pièce de puzzle (motif des planches) */
  E.puzzle = (ctx, x, y, s, color, rot = 0) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    const k = s * 0.2;
    const parts = [
      () => ctx.rect(-s / 2, -s / 2, s, s),
      () => ctx.arc(0, -s / 2, k, 0, TAU),
      () => ctx.arc(s / 2, 0, k, 0, TAU),
    ];
    ctx.lineWidth = Math.max(2, s * 0.07);
    ctx.strokeStyle = INK;
    ctx.fillStyle = color;
    for (const p of parts) { ctx.beginPath(); p(); ctx.stroke(); }
    for (const p of parts) { ctx.beginPath(); p(); ctx.fill(); }
    ctx.restore();
  };
  E.PUZ = ['#E53935', '#1E88E5', '#43A047', '#FDD835'];

  // ───────────────────────────── décors ─────────────────────────────
  const D = (E.D = {});
  D.wall = (ctx, color, floorY, floorColor) => {
    ctx.fillStyle = color;
    ctx.fillRect(-400, -400, E.W + 800, E.H + 800);
    if (floorY != null) {
      ctx.fillStyle = floorColor;
      ctx.fillRect(-400, floorY, E.W + 800, E.H + 400);
      E.line(ctx, -400, floorY, E.W + 400, floorY, INK, 5);
    }
  };
  const BOOKS = ['#C62828', '#1565C0', '#2E7D32', '#F9A825', '#6A1B9A', '#EF6C00', '#00838F'];
  D.library = (ctx) => {
    D.wall(ctx, '#EFE6D8');
    E.box(ctx, 60, 250, 1800, 330, '#8D6E63', '#5D4037', 6);
    for (let r = 0; r < 2; r++) {
      const base = 250 + 20 + r * 155 + 135;
      for (let k = 0; k < 44; k++) {
        const h = [110, 128, 100, 120][(k + r) % 4];
        E.box(ctx, 82 + k * 40.3, base - h, 30, h, BOOKS[(k * 3 + r) % 7], '#3E2723', 2);
      }
      E.line(ctx, 60, base + 4, 1860, base + 4, '#5D4037', 8);
    }
  };
  D.table = (ctx, x, y, w, h, fill = '#A1887F', stroke = '#6D4C41') => E.box(ctx, x, y, w, h, fill, stroke, 6);
  D.laptopBack = (ctx, cx, y, w, h, color, glow = 0) => {
    E.box(ctx, cx - w / 2, y, w, h, '#CFD8DC', '#546E7A', 5, 10);
    E.puzzle(ctx, cx, y + h * 0.52, h * 0.34, color);
    if (glow > 0) {
      ctx.save();
      ctx.globalAlpha = glow;
      ctx.fillStyle = '#FFF59D';
      ctx.beginPath();
      ctx.ellipse(cx, y - 6, w * 0.45, 14, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  };
  D.whiteboard = (ctx, x, y, w, h, lines, reveal) => {
    E.box(ctx, x, y, w, h, '#FFFFFF', '#607D8B', 10, 6);
    E.box(ctx, x + w * 0.1, y + h, w * 0.8, 18, '#90A4AE', '#607D8B', 4);
    const total = lines.reduce((a, l) => a + l.length, 0);
    let left = Math.floor(total * reveal);
    lines.forEach((ln, i) => {
      E.text(ctx, ln.slice(0, Math.max(0, left)), x + w / 2, y + h * 0.38 + i * 96, {
        bold: true, size: 70, color: '#1565C0', align: 'center',
      });
      left -= ln.length;
    });
  };
  D.clock = (ctx, x, y, r, hour, minute) => {
    E.circle(ctx, x, y, r, '#FFFFFF', INK, 9);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      E.line(ctx, x + Math.sin(a) * r * 0.78, y - Math.cos(a) * r * 0.78, x + Math.sin(a) * r * 0.9, y - Math.cos(a) * r * 0.9, INK, i % 3 ? 3 : 6);
    }
    const ha = ((hour % 12) + minute / 60) / 12 * TAU;
    const ma = (minute / 60) * TAU;
    E.line(ctx, x, y, x + Math.sin(ha) * r * 0.48, y - Math.cos(ha) * r * 0.48, INK, 11);
    E.line(ctx, x, y, x + Math.sin(ma) * r * 0.74, y - Math.cos(ma) * r * 0.74, '#D32F2F', 7);
    E.circle(ctx, x, y, 8, INK, null);
  };
  D.monitor = (ctx, x, y, w, h, drawScreen) => {
    E.box(ctx, x + w / 2 - 22, y + h, 44, 46, '#455A64', INK, 4);
    E.box(ctx, x + w / 2 - 90, y + h + 44, 180, 14, '#455A64', INK, 4);
    E.box(ctx, x, y, w, h, '#263238', INK, 8, 10);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + 16, y + 16, w - 32, h - 32);
    ctx.clip();
    drawScreen(ctx, x + 16, y + 16, w - 32, h - 32);
    ctx.restore();
  };
  D.door = (ctx, x, y, w, h, open = 0) => {
    E.box(ctx, x, y, w, h, '#3E2723', INK, 6);
    const pw = w * (1 - 0.82 * open);
    E.box(ctx, x, y, pw, h, '#8D6E63', '#5D4037', 6);
    if (open < 0.5) E.circle(ctx, x + pw - 30, y + h * 0.52, 11, '#FFD54F', '#5D4037', 3);
    E.box(ctx, x + 10, y - 70, w - 20, 54, '#2E7D32', INK, 4);
    E.text(ctx, 'SORTIE', x + w / 2, y - 31, { font: 'Arial', bold: true, size: 34, color: '#FFFFFF', align: 'center' });
  };
  /** étiquette jaune collée de travers (lift = coin qui se décolle) */
  D.label = (ctx, text, x, y, w, h, rot = 0, lift = 0, size = 44) => {
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate((rot * Math.PI) / 180);
    E.box(ctx, -w / 2, -h / 2, w, h, '#FFE36E', '#B8A000', 3);
    E.text(ctx, text, 0, size * 0.36, { bold: true, size, align: 'center' });
    if (lift > 0) {
      const c = 26 + lift * 34;
      ctx.beginPath();
      ctx.moveTo(w / 2 - c, -h / 2);
      ctx.lineTo(w / 2, -h / 2);
      ctx.lineTo(w / 2, -h / 2 + c);
      ctx.closePath();
      ctx.fillStyle = '#37474F';
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(w / 2 - c, -h / 2);
      ctx.lineTo(w / 2 - c * 0.15, -h / 2 - c * 0.85);
      ctx.lineTo(w / 2, -h / 2 + c);
      ctx.closePath();
      ctx.fillStyle = '#FFF59D';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#B8A000';
      ctx.stroke();
    }
    ctx.restore();
  };
  /** switch réseau : ports + voyants. ledState(k) → 'on' | 'off' */
  D.switchBox = (ctx, x, y, w, h, nPorts, ledState, t) => {
    E.box(ctx, x, y, w, h, '#37474F', INK, 8, 8);
    const pw = Math.min(110, (w - 80) / nPorts - 26);
    const gap = (w - 60 - nPorts * pw) / (nPorts - 1);
    for (let k = 0; k < nPorts; k++) {
      const px = x + 30 + k * (pw + gap);
      const py = y + h - 34 - pw * 0.62;
      E.box(ctx, px, py, pw, pw * 0.62, '#111111', '#9E9E9E', 3);
      E.box(ctx, px + pw * 0.2, py + pw * 0.34, pw * 0.6, pw * 0.28, '#263238', null);
      const st = ledState(k);
      let col = '#9E9E9E';
      if (st === 'on') col = E.rand(Math.floor(t * 9) * 13 + k) > 0.3 ? '#66FF66' : '#2E7D32';
      E.circle(ctx, px + pw + gap * 0.45, py + pw * 0.31, 9, col, '#111', 2);
    }
  };
  D.laptopFront = (ctx, x, y, w, h, drawScreen) => {
    E.box(ctx, x, y, w, h, '#263238', INK, 8, 10);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + 14, y + 14, w - 28, h - 28);
    ctx.clip();
    drawScreen(ctx, x + 14, y + 14, w - 28, h - 28);
    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(x - 40, y + h + 26);
    ctx.lineTo(x + w + 40, y + h + 26);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
    ctx.fillStyle = '#78909C';
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = INK;
    ctx.stroke();
  };
  /** câble avec paquets de données qui circulent */
  D.cable = (ctx, x1, y1, x2, y2, t, active) => {
    E.line(ctx, x1, y1, x2, y2, '#1565C0', 12);
    E.line(ctx, x1, y1, x2, y2, '#1E88E5', 7);
    if (!active) return;
    for (let i = 0; i < 4; i++) {
      const p = (t * 0.9 + i / 4) % 1;
      E.circle(ctx, E.lerp(x1, x2, p), E.lerp(y1, y2, p), 9, '#FFFFFF', '#0D47A1', 3);
    }
  };
  D.wifiOff = (ctx, x, y, s, p) => {
    if (p <= 0) return;
    ctx.save();
    ctx.translate(x, y);
    const k = E.ease.outBack(p);
    ctx.scale(k, k);
    E.circle(ctx, 0, 0, s, '#FFFFFF', INK, 4);
    ctx.lineCap = 'round';
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath();
      ctx.arc(0, s * 0.45, s * 0.22 * i, -Math.PI * 0.78, -Math.PI * 0.22);
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#546E7A';
      ctx.stroke();
    }
    E.line(ctx, -s * 0.6, -s * 0.6, s * 0.6, s * 0.6, '#D32F2F', 8);
    ctx.restore();
  };
  D.spinner = (ctx, x, y, r, t) => {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + t * 5;
      ctx.globalAlpha = 0.25 + (i / 8) * 0.75;
      E.circle(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.2, '#CFD8DC', null);
    }
    ctx.globalAlpha = 1;
  };
  D.noteSheet = (ctx, x, y, rot) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((rot * Math.PI) / 180);
    E.box(ctx, -160, -40, 320, 80, '#FFFFFF', '#9E9E9E', 3);
    E.text(ctx, 'Note : ___ / 20', 0, 14, { size: 38, align: 'center' });
    ctx.restore();
  };

  // ──────────────────────────── effets BD ────────────────────────────
  const FX = (E.fx = {});
  FX.sweat = (ctx, x, y, t, seed = 0, s = 1) => {
    const p = ((t * 0.9 + seed * 0.37) % 1 + 1) % 1;
    ctx.save();
    ctx.globalAlpha = 1 - p * 0.8;
    ctx.translate(x, y + p * 40 * s);
    ctx.scale(s, s);
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.quadraticCurveTo(15, 0, 0, 12);
    ctx.quadraticCurveTo(-15, 0, 0, -22);
    ctx.fillStyle = '#4FC3F7';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#0277BD';
    ctx.stroke();
    ctx.restore();
  };
  FX.shock = (ctx, x, y, r, t, p = 1) => {
    if (p <= 0) return;
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI * 0.95 + (i / 6) * Math.PI * 0.9;
      const f = 0.75 + 0.25 * Math.sin(t * 30 + i);
      const r0 = r, r1 = r + 55 * f * p;
      E.line(ctx, x + Math.cos(a) * r0, y + Math.sin(a) * r0, x + Math.cos(a) * r1, y + Math.sin(a) * r1, INK, 6);
    }
  };
  /** grand signe « ! », « ? », « ?! » qui jaillit */
  FX.mark = (ctx, s, x, y, size, p, color = '#FFEB3B') => {
    if (p <= 0) return;
    const k = E.ease.outBack(E.clamp(p));
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(k, k);
    ctx.rotate(Math.sin(p * 9) * 0.08);
    E.text(ctx, s, 0, 0, { font: 'Impact', size, color, align: 'center', base: 'middle', stroke: INK, lw: 10 });
    ctx.restore();
  };
  FX.speed = (ctx, x, y, h, dir, t, n = 6) => {
    for (let i = 0; i < n; i++) {
      const yy = y - h * 0.15 - (i / n) * h * 0.7;
      const len = 90 + E.rand(i + Math.floor(t * 12)) * 120;
      const xx = x + dir * (40 + E.rand(i * 7) * 60);
      E.line(ctx, xx, yy, xx + dir * len, yy, '#78909C', 6);
    }
  };
  FX.sparkle = (ctx, x, y, s, t) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t * 2);
    const k = s * (0.7 + 0.3 * Math.sin(t * 12));
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const r = i % 2 ? k * 0.28 : k;
      const a = (i / 8) * TAU;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fillStyle = '#FFEB3B';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.restore();
  };
  FX.dust = (ctx, x, y, p, seed = 1) => {
    if (p <= 0 || p >= 1) return;
    for (let i = 0; i < 10; i++) {
      const a = E.rand(seed * 10 + i) * TAU;
      const d = 20 + p * 120 * E.rand(seed + i * 3);
      ctx.globalAlpha = (1 - p) * 0.9;
      E.circle(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.6 + p * 30, 8 + 14 * E.rand(i + seed), '#BCAAA4', null);
    }
    ctx.globalAlpha = 1;
  };
  FX.vignette = (ctx, a, color = '0,0,0') => {
    if (a <= 0) return;
    const g = ctx.createRadialGradient(E.W / 2, E.H / 2, E.H * 0.3, E.W / 2, E.H / 2, E.H * 0.95);
    g.addColorStop(0, `rgba(${color},0)`);
    g.addColorStop(1, `rgba(${color},${a})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, E.W, E.H);
  };
  FX.flash = (ctx, a, color = '#FFFFFF') => {
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, E.W, E.H);
    ctx.restore();
  };

  // ─────────────────────── cartons titre & morale ───────────────────────
  E.titleCard = (ctx, t, film) => {
    ctx.fillStyle = film.color;
    ctx.fillRect(0, 0, E.W, E.H);
    ctx.save(); // rayons qui tournent (ambiance dessin animé)
    ctx.translate(E.W / 2, E.H / 2);
    ctx.rotate(t * 0.15);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    for (let i = 0; i < 16; i++) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 1400, (i / 16) * TAU, (i / 16 + 1 / 32) * TAU);
      ctx.fill();
    }
    ctx.restore();
    const p = E.ease.outBack(E.prog(t, 0.25, 0.85));
    ctx.save();
    ctx.translate(E.W / 2, E.lerp(-200, 430, p));
    ctx.rotate(Math.sin(E.prog(t, 0.25, 1.4) * Math.PI * 3) * 0.02 * (1 - E.prog(t, 0.8, 1.6)));
    ctx.font = '118px Impact';
    const tw = ctx.measureText(film.title).width;
    const sc = Math.min(1, 1760 / tw);
    ctx.scale(sc, sc);
    E.text(ctx, film.title, 0, 0, { font: 'Impact', size: 118, color: '#FFFFFF', align: 'center', base: 'middle', stroke: INK, lw: 14 });
    ctx.restore();
    ctx.globalAlpha = E.prog(t, 0.8, 1.3);
    E.text(ctx, film.subtitle, E.W / 2, 560, { font: 'Cambria', italic: true, size: 54, color: '#FFFFFF', align: 'center' });
    ctx.globalAlpha = 1;
    if (film.titleDeco) film.titleDeco(ctx, t);
    ctx.globalAlpha = E.prog(t, 1.6, 2.2);
    E.text(ctx, "Un court-métrage d'animation d'après la BD", E.W / 2, 1000, { font: 'Arial', italic: true, size: 30, color: 'rgba(255,255,255,0.85)', align: 'center' });
    ctx.globalAlpha = 1;
  };

  E.moralCard = (ctx, t, film) => {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, E.W, E.H);
    E.box(ctx, 0, 0, E.W, 150, film.color, null);
    E.text(ctx, film.title, E.W / 2, 96, { font: 'Impact', size: 64, color: '#FFFFFF', align: 'center' });
    const p = E.ease.outBack(E.prog(t, 0.3, 0.9));
    ctx.save();
    ctx.translate(E.W / 2, 560);
    ctx.scale(0.8 + 0.2 * p, 0.8 + 0.2 * p);
    ctx.globalAlpha = E.clamp(p);
    E.box(ctx, -820, -300, 1640, 560, film.moralFill, film.moralBorder, 10, 40);
    E.text(ctx, 'MORALE', -760, -200, { font: 'Impact', size: 76, color: film.moralBorder });
    ctx.font = 'bold 56px "Comic Sans MS"';
    const lines = E.wrap(ctx, E.nb(film.moral), 1500);
    lines.forEach((ln, i) => {
      ctx.globalAlpha = E.prog(t, 0.7 + i * 0.35, 1.2 + i * 0.35);
      E.text(ctx, ln, -760, -90 + i * 82, { bold: true, size: 56 });
    });
    ctx.restore();
    ctx.globalAlpha = E.prog(t, 2.4, 3.0);
    E.text(ctx, 'Personnages : Open Peeps (Pablo Stanley, CC0) · Voix : synthèse vocale macOS · Musique et bruitages : générés par le code du projet', E.W / 2, 1000, {
      font: 'Arial', italic: true, size: 26, color: '#757575', align: 'center',
    });
    ctx.globalAlpha = 1;
  };

  // ───────────────────────────── transitions ─────────────────────────────
  E.composite = (ctx, A, B, type, p) => {
    const W = E.W, H = E.H;
    const e = E.ease.inOut(p);
    ctx.save();
    if (type === 'wipe') {
      ctx.drawImage(A, 0, 0);
      const x = E.lerp(-320, W + 320, e);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(x + 160, 0);
      ctx.lineTo(x - 160, H);
      ctx.lineTo(0, H);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(B, 0, 0);
      ctx.restore();
      E.line(ctx, x + 160, -20, x - 160, H + 20, INK, 22);
    } else if (type === 'iris') {
      ctx.drawImage(A, 0, 0);
      const r = E.ease.in(p) * Math.hypot(W, H) * 0.55;
      ctx.save();
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, Math.max(1, r), 0, TAU);
      ctx.clip();
      ctx.drawImage(B, 0, 0);
      ctx.restore();
      E.circle(ctx, W / 2, H / 2, Math.max(1, r), null, INK, 20);
    } else if (type === 'whip') {
      const blur = Math.sin(p * Math.PI) * 22;
      ctx.filter = `blur(${blur.toFixed(1)}px)`;
      ctx.drawImage(A, -e * W, 0);
      ctx.drawImage(B, W - e * W, 0);
      ctx.filter = 'none';
      ctx.globalAlpha = Math.sin(p * Math.PI) * 0.7;
      for (let i = 0; i < 46; i++) {
        const y = E.rand(i * 3.1) * H;
        const len = 300 + E.rand(i) * 900;
        const x = E.rand(i * 1.7 + 4) * W;
        E.line(ctx, x, y, x + len, y, '#FFFFFF', 3 + E.rand(i + 9) * 6);
      }
    } else if (type === 'slide') {
      ctx.drawImage(A, 0, 0);
      const y = (1 - E.ease.outBack(p)) * -H;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(0, y + H, W, 40);
      ctx.drawImage(B, 0, y);
      E.line(ctx, 0, y + H, W, y + H, INK, 16);
    } else if (type === 'fade') {
      if (p < 0.5) {
        ctx.drawImage(A, 0, 0);
        FX.flash(ctx, p * 2, '#000000');
      } else {
        ctx.drawImage(B, 0, 0);
        FX.flash(ctx, (1 - p) * 2, '#000000');
      }
    } else ctx.drawImage(B, 0, 0);
    ctx.restore();
  };

  // ───────────────────────────── rendu ─────────────────────────────
  const bufs = [];
  function buf(i) {
    if (!bufs[i]) {
      const c = document.createElement('canvas');
      c.width = E.W;
      c.height = E.H;
      bufs[i] = { c, ctx: c.getContext('2d') };
    }
    return bufs[i];
  }
  function drawScene(ctx, film, sc, lt) {
    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, E.W, E.H);
    sc.def.draw(ctx, sc, lt, film);
    ctx.restore();
  }
  E.sceneAt = (tl, t) => {
    let i = tl.scenes.findIndex((s) => t < s.end);
    if (i < 0) i = tl.scenes.length - 1;
    return i;
  };
  E.render = (ctx, tl, t) => {
    t = E.clamp(t, 0, tl.duration - 1e-3);
    const i = E.sceneAt(tl, t);
    const sc = tl.scenes[i];
    const lt = t - sc.start;
    const tr = sc.def.trans;
    if (tr && i > 0 && lt < tr.dur) {
      const prev = tl.scenes[i - 1];
      const A = buf(0), B = buf(1);
      drawScene(A.ctx, tl.film, prev, prev.dur - 1e-3);
      drawScene(B.ctx, tl.film, sc, lt);
      E.composite(ctx, A.c, B.c, tr.type, E.prog(lt, 0, tr.dur));
    } else drawScene(ctx, tl.film, sc, lt);
    E.frame(ctx);
  };
})();
