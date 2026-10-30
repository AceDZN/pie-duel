// Re-pick first-play seeds: the odds player must win, and constant play must not pass (scripted orders included).
import { LEVELS } from '../src/levels';
import { playMatch } from '../src/core/sim';
for (const L of LEVELS) {
  const ok = (seed: number) => {
    const X = { ...L, seed };
    return playMatch(X, 'odds', seed).won && (['alwaysRival', 'alwaysSelf', 'rivalUnlessNoPies', 'selfUnlessAllPies'] as const).every((s) => !playMatch(X, s, seed).passed);
  };
  if (ok(L.seed)) continue;
  let s = L.seed;
  while (!ok(++s));
  console.log(`L${L.id}: seed ${L.seed} → ${s}`);
}
