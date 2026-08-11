import type { AnimationSpec } from '../types/animation.ts'
import type { SceneId } from '../types/scene.ts'

/**
 * The spec is data, shared by every adapter for a given run. One instance per
 * run, handed to whichever technique is being measured.
 *
 * Every keyframe carries every channel, in the same order, so no adapter can
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

const specs: Partial<Record<SceneId, AnimationSpec>> = {
  grid: GRID_SPEC,
}

/**
 * Returns a deep copy so a run cannot mutate the shared definition. Adapters
 * still receive one identical instance per run; the copy guards against a
 * previous run leaking state into the next.
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
