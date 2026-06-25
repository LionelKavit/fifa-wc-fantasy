// Seedable PRNG + Poisson sampler for reproducible Monte Carlo simulation.

/** A pseudo-random generator returning a float in [0, 1). */
export type Rng = () => number;

/** mulberry32 — a small, fast, deterministic PRNG. Same seed → same sequence. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Sample a non-negative integer from Poisson(lambda) via Knuth's algorithm.
 * Suitable for the small rates (≈1–2 goals) used here. */
export function samplePoisson(lambda: number, rng: Rng): number {
  if (lambda <= 0) return 0;
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rng();
  } while (p > L);
  return k - 1;
}
