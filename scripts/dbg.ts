import { LEVELS } from '../src/levels';
import { playMatch } from '../src/core/sim';
const id = Number(process.argv[2]); const seed = Number(process.argv[3] ?? 1);
const r = playMatch(LEVELS.find(l=>l.id===id)!, (process.argv[4] as any) ?? 'odds', seed);
console.log(r.duel.describe(), r.duel.winner, r.total, r.correct, r.passed, r.over);
