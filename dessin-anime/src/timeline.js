/* timeline.js — calcule les instants de chaque scène et de chaque « beat ».
 * Partagé par le navigateur (rendu image) et par Node (mixage audio) :
 * l'image et le son utilisent donc exactement les mêmes instants.
 *
 * Un beat est soit une pause ({ wait: secondes }), soit une réplique
 * ({ say: 'perso', text }) / une pensée ({ think: 'perso', text }).
 * La durée d'une réplique vient du fichier audio de la voix (audio/timing.js) ;
 * sans audio, elle est estimée d'après la longueur du texte.
 */
(function (root) {
  const DEFAULT_PAD = 0.35; // silence après chaque réplique (s)

  function estimate(text) {
    return 0.5 + text.replace(/\s+/g, ' ').length * 0.065;
  }

  function build(film, timing) {
    const lines = (timing && timing[film.id] && timing[film.id].lines) || {};
    const scenes = [];
    let t = 0;
    for (const def of film.scenes) {
      const beats = {};
      const list = [];
      let bt = 0;
      for (const b of def.beats) {
        const who = b.say || b.think || null;
        const L = who ? lines[b.id] : null;
        const speech = who ? (L ? L.dur : estimate(b.text)) : 0;
        const slot = who ? speech + (b.pad ?? DEFAULT_PAD) : b.wait ?? 0;
        const B = Object.assign({}, b, {
          who,
          start: bt,
          speechEnd: bt + speech,
          end: bt + slot,
          env: L ? L.env : null,
        });
        if (b.id) beats[b.id] = B;
        list.push(B);
        bt += slot;
      }
      const sc = { def, id: def.id, label: def.label, start: t, dur: bt, end: t + bt, beats, list };
      // amplitude de la voix d'un personnage à l'instant t (relatif à la scène) → 0..1
      sc.amp = function (who, tt) {
        for (const B of list) {
          if (B.say !== who || tt < B.start || tt >= B.speechEnd) continue;
          if (B.env) {
            const i = Math.floor((tt - B.start) * 30);
            return B.env[Math.min(B.env.length - 1, Math.max(0, i))] || 0;
          }
          return 0.45 + 0.45 * Math.sin(tt * 24); // sans audio : bouche approximative
        }
        return 0;
      };
      scenes.push(sc);
      t += bt;
    }
    return { film, scenes, duration: t };
  }

  const TL = { build, estimate, DEFAULT_PAD };
  root.TL = TL;
  if (typeof module !== 'undefined' && module.exports) module.exports = TL;
})(typeof window !== 'undefined' ? window : globalThis);
