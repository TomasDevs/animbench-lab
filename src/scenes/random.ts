/**
 * Seeded pseudo random number generator (mulberry32).
 *
 * Math.random must not be used in scene generation: two techniques given the
 * same seed have to animate the same scene, or the comparison measures the
 * layout difference instead of the technique.
 */
export type Random = {
  /** Next value in [0, 1). */
  next(): number
  /** Next value in [min, max). */
  range(min: number, max: number): number
  /** Next integer in [min, max]. */
  int(min: number, max: number): number
}

export function createRandom(seed: number): Random {
  // Keep the state in uint32 range so the same seed behaves identically
  // regardless of what was passed in.
  let state = seed >>> 0

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  return {
    next,
    range: (min, max) => min + next() * (max - min),
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
  }
}
