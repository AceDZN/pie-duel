import { LEVELS } from '../src/levels';
import { Duel } from '../src/core/duel';
import { playMove, type Strategy } from '../src/core/sim';
import { str } from '../src/core/frac';
const id = Number(process.argv[2]); const seed = Number(process.argv[3] ?? 1); const strat = (process.argv[4] ?? 'odds') as Strategy;
const d = new Duel(LEVELS.find(l=>l.id===id)!, seed);
let g=0;
const show = () => { for (const e of d.drain()) { const x:any = {...e}; for (const k of ['p','value','truth']) if (x[k]) x[k]=str(x[k]); if (x.load) x.load = x.load.type + (x.load.shells? ' '+x.load.shells.map((s:any)=>s.kind[0]).join(''):''); console.log(JSON.stringify(x)); } };
show();
while (d.phase !== 'over' && g++ < 200) { if (d.phase==='rival') d.rivalStep(); else playMove(d, strat, Math.random); show(); }
console.log(d.result());
