// Exact fractions. Every probability the game shows or scores is a Frac, never a float.

export interface Frac {
  readonly n: number;
  readonly d: number;
}

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

export function frac(n: number, d = 1): Frac {
  if (d === 0) throw new Error('zero denominator');
  if (!Number.isInteger(n) || !Number.isInteger(d)) throw new Error(`non-integer fraction ${n}/${d}`);
  const s = d < 0 ? -1 : 1;
  const g = gcd(n, d);
  return { n: (s * n) / g, d: (s * d) / g };
}

export const ZERO = frac(0);
export const ONE = frac(1);
export const HALF = frac(1, 2);

export const add = (a: Frac, b: Frac) => frac(a.n * b.d + b.n * a.d, a.d * b.d);
export const sub = (a: Frac, b: Frac) => frac(a.n * b.d - b.n * a.d, a.d * b.d);
export const mul = (a: Frac, b: Frac) => frac(a.n * b.n, a.d * b.d);
export const div = (a: Frac, b: Frac) => frac(a.n * b.d, a.d * b.n);
export const complement = (a: Frac) => sub(ONE, a);
export const cmp = (a: Frac, b: Frac) => Math.sign(a.n * b.d - b.n * a.d);
export const eq = (a: Frac, b: Frac) => cmp(a, b) === 0;
export const toNum = (a: Frac) => a.n / a.d;
export const str = (a: Frac) => (a.d === 1 ? `${a.n}` : `${a.n}/${a.d}`);

export function maxFrac(...xs: Frac[]): Frac {
  return xs.reduce((m, x) => (cmp(x, m) > 0 ? x : m));
}

/** "a/b" written with an explicit (unsimplified) denominator, e.g. 2/4 stays 2/4. */
export interface RawFrac {
  n: number;
  d: number;
}
export const rawStr = (r: RawFrac) => `${r.n}/${r.d}`;
export const fromRaw = (r: RawFrac) => frac(r.n, r.d);
