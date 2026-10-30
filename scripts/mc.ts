import { LEVELS } from '../src/levels';
import { monteCarlo, type Strategy } from '../src/core/sim';
const S: Strategy[] = (process.argv[3]?.split(',') as Strategy[]) ?? ['odds', 'alwaysRival', 'alwaysSelf', 'random', 'gambler'];
const n = Number(process.argv[2] ?? 300);
console.log('lvl ' + S.map((s) => s.padEnd(22)).join(''));
for (const L of LEVELS) {
  const row = S.map((s) => { const r = monteCarlo(L, s, n); return `w${(r.winRate*100).toFixed(0)} p${(r.passRate*100).toFixed(0)}/${(r.passWithin2*100).toFixed(0)} a${(r.accuracy*100).toFixed(0)}`.padEnd(22); });
  console.log(String(L.id).padEnd(4) + row.join(''));
}
