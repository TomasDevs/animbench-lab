import type { AnimationSpec } from '../types/animation.ts'

/**
 * The window during which every element is animating.
 *
 * Stagger starts element i at i * stagger and it runs for duration, so the
 * count of concurrently animating elements rises, plateaus, then falls. Only
 * the plateau is a constant load; metrics taken over the whole run average
 * three different loads together.
 *
 * Times are relative to the start of the run.
 */
export type SteadyState = {
  fromMs: number
  toMs: number
  /** Elements animating at once during the plateau. */
  concurrentElements: number
  /** True when a plateau with every element exists at all. */
  fullOverlap: boolean
}

export function steadyStateFor(spec: AnimationSpec, elementCount: number): SteadyState {
  if (elementCount <= 0) {
    return { fromMs: 0, toMs: 0, concurrentElements: 0, fullOverlap: false }
  }

  const total = spec.duration * spec.iterations
  // Last element starts here; before it, the load is still ramping up.
  const lastStart = (elementCount - 1) * spec.stagger
  // First element stops here; after it, the load is falling.
  const firstEnd = total

  if (lastStart < firstEnd) {
    return {
      fromMs: lastStart,
      toMs: firstEnd,
      concurrentElements: elementCount,
      fullOverlap: true,
    }
  }

  // No instant holds every element. The plateau is the widest stretch where the
  // count is at its maximum, which is however many elements fit inside one
  // duration.
  const concurrent = Math.max(1, Math.floor(total / spec.stagger))
  const runEnd = total + lastStart
  return {
    fromMs: Math.min(total, runEnd),
    toMs: Math.max(0, lastStart),
    concurrentElements: concurrent,
    fullOverlap: false,
  }
}

/**
 * Steady state for a scene driven by scroller position rather than stagger.
 *
 * The window is expressed in timestamps like every other scene, so the contract
 * stays the same and the tool needs no special case. Both ends are trimmed: the
 * scroller needs a moment to reach a constant rate, and the final frames land
 * after it has stopped.
 */
export function scrollSteadyState(durationMs: number, elementCount: number): SteadyState {
  const trim = Math.min(durationMs * 0.1, 500)
  return {
    fromMs: trim,
    toMs: Math.max(trim, durationMs - trim),
    concurrentElements: elementCount,
    fullOverlap: true,
  }
}
