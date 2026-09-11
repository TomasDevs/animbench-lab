import type { AnimationSpec } from '../types/animation.ts'
import type { SceneId } from '../types/scene.ts'

/**
 * Animation specs, one per scene.
 *
 * Every keyframe carries every channel in the same order, so no adapter can
 * produce a structurally different transform list.
 */

const GRID_SPEC: AnimationSpec = {
  duration: 10_000,
  iterations: 1,
  easing: 'linear',
  stagger: 4,
  keyframes: [
    { offset: 0, translateX: 0, translateY: 0, scale: 1, rotate: 0, opacity: 1 },
    { offset: 0.25, translateX: 40, translateY: -24, scale: 1, rotate: 0, opacity: 0.55 },
    { offset: 0.5, translateX: 0, translateY: -48, scale: 1, rotate: 0, opacity: 1 },
    { offset: 0.75, translateX: -40, translateY: -24, scale: 1, rotate: 0, opacity: 0.55 },
    { offset: 1, translateX: 0, translateY: 0, scale: 1, rotate: 0, opacity: 1 },
  ],
}

/**
 * Composite: translate, scale, rotate and opacity all in motion at once.
 *
 * The first spec where scale and rotate are not neutral, so it is the one that
 * actually exercises transform function order. A library that rewrites the
 * transform string produces a different matrix here, where on the grid the
 * neutral values hid the difference.
 */
const COMPOSITE_SPEC: AnimationSpec = {
  duration: 10_000,
  iterations: 1,
  easing: 'linear',
  stagger: 4,
  keyframes: [
    { offset: 0, translateX: 0, translateY: 0, scale: 1, rotate: 0, opacity: 1 },
    { offset: 0.25, translateX: 32, translateY: -20, scale: 1.4, rotate: 90, opacity: 0.6 },
    { offset: 0.5, translateX: 0, translateY: -40, scale: 0.7, rotate: 180, opacity: 1 },
    { offset: 0.75, translateX: -32, translateY: -20, scale: 1.4, rotate: 270, opacity: 0.6 },
    { offset: 1, translateX: 0, translateY: 0, scale: 1, rotate: 360, opacity: 1 },
  ],
}

const specs: Partial<Record<SceneId, AnimationSpec>> = {
  grid: GRID_SPEC,
  composite: COMPOSITE_SPEC,
}

/**
 * Returns a deep copy, so a run cannot mutate the shared definition. Every
 * adapter in one run still receives the same instance.
 */
export function specFor(scene: SceneId, duration?: number): AnimationSpec {
  const base = specs[scene]
  if (!base) {
    throw new Error(`No animation spec defined for scene "${scene}"`)
  }
  return {
    ...base,
    duration: duration ?? base.duration,
    keyframes: base.keyframes.map((frame) => ({ ...frame })),
  }
}

/**
 * Duration that yields a steady-state window of the requested width.
 *
 * The window runs from when the last element starts, stagger * (n - 1), to when
 * the first one stops, at duration. Solving for duration keeps the measured
 * window constant across complexities while only the unmeasured ramp-up grows.
 */
export function durationForWindow(
  spec: AnimationSpec,
  elementCount: number,
  windowMs: number,
): number {
  if (elementCount <= 1) return windowMs
  return windowMs + spec.stagger * (elementCount - 1)
}

/** Steady-state window the main matrix measures over, ms. */
export const STEADY_WINDOW_MS = 10_000
