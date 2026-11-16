// storyboard.mjs — écrit STORYBOARD.md avec les durées réelles (après npm run audio)
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { ROOT } from './server.mjs';

const sb = { window: {} };
vm.createContext(sb);
for (const f of ['timeline.js', 'film1.js', 'film2.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, 'src', f), 'utf8'), sb);
const tf = path.join(ROOT, 'audio', 'timing.json');
const timing = fs.existsSync(tf) ? JSON.parse(fs.readFileSync(tf, 'utf8')) : null;
const CH = { karim: 'Karim', yanis: 'Yanis', ines: 'Inès', lea: 'Léa', bernard: 'M. Bernard', theo: 'Théo', marc: 'Marc', laurent: 'Mme Laurent' };
const TR = { wipe: 'volet diagonal', whip: 'panoramique filé', iris: 'ouverture en iris', slide: 'case qui tombe', fade: 'fondu au noir' };
const fmt = (s) => s.toFixed(1).replace('.', ',') + ' s';
let md = '# Storyboard animé\n\nDurées réelles, calculées à partir des voix générées (`npm run storyboard` après `npm run audio`).\n';
for (const film of Object.values(sb.window.FILMS)) {
  const tl = sb.window.TL.build(film, timing);
  md += `\n## ${film.title}\n\nDurée totale : **${fmt(tl.duration)}** · musique et ambiances : ${[...new Set(film.scenes.map((s) => s.music))].join(', ')}\n\n| # | Scène | Début | Durée | Transition | Contenu (répliques exactes de la planche) |\n|---|---|---|---|---|---|\n`;
  tl.scenes.forEach((s, i) => {
    const lines = s.list.map((b) => (b.say ? `**${CH[b.say]}** : « ${b.text.replace(/\n/g, ' ')} »` : b.think ? `*${CH[b.think]} (pensée)* : « ${b.text} »` : `pause ${fmt(b.wait)}${b.sfx ? ' (' + b.sfx.map((x) => x[0]).join(', ') + ')' : ''}`));
    md += `| ${i} | ${s.label} | ${fmt(s.start)} | ${fmt(s.dur)} | ${s.def.trans ? TR[s.def.trans.type] : '—'} | ${lines.join('<br>')} |\n`;
  });
}
fs.writeFileSync(path.join(ROOT, 'STORYBOARD.md'), md);
console.log('→ STORYBOARD.md');
