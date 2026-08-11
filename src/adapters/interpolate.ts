import type { AnimationSpec, Keyframe } from '../types/animation.ts'

/**
 * Linear interpolation of the spec at a given progress.
 *
 * This is the single definition of what the animation *is*. The rAF adapter
 * uses it to drive elements directly; the validator uses it to produce expected
 * positions for every other technique. Both must read the same function,
 * otherwise the reference would drift from what is validated against it.
 */

/** A keyframe with no motion, used when the spec carries no keyframes. */
const REST: Keyframe = {
  offset: 0,
  translateX: 0,
  translateY: 0,
  scale: 1,
  rotate: 0,
  opacity: 1,
}

export function interpolate(spec: AnimationSpec, progress: number): Keyframe {
  const frames = spec.keyframes
  if (frames.length === 0) return REST

  const first = frames[0] ?? REST
  const last = frames[frames.length - 1] ?? REST

  // Clamp outside the timeline rather than extrapolating. A run that overshoots
  // its duration must hold the final pose, not keep moving.
  if (progress <= first.offset) return first
  if (progress >= last.offset) return last

  // Linear scan: keyframe counts are small (a handful per spec), so an index
  // search would cost more than it saves.
  for (let i = 0; i < frames.length - 1; i++) {
    const a = frames[i]
    const b = frames[i + 1]
    if (!a || !b) break
    if (progress < a.offset || progress > b.offset) continue

    const span = b.offset - a.offset
    // Two keyframes at the same offset: a step change, take the later one.
    const t = span <= 0 ? 1 : (progress - a.offset) / span

    return {
      offset: progress,
      translateX: a.translateX + (b.translateX - a.translateX) * t,
      translateY: a.translateY + (b.translateY - a.translateY) * t,
      scale: a.scale + (b.scale - a.scale) * t,
      rotate: a.rotate + (b.rotate - a.rotate) * t,
      opacity: a.opacity + (b.opacity - a.opacity) * t,
    }
  }

  return last
}

/**
 * Progress of one element at a given time, accounting for stagger and
 * iterations. Returns null before the element's stagger delay has elapsed.
 */
export function progressAt(
  spec: AnimationSpec,
  elapsed: number,
  index: number,
): number | null {
  const local = elapsed - index * spec.stagger
  if (local < 0) return null

  const total = spec.duration * spec.iterations
  if (spec.duration <= 0) return 1
  if (local >= total) return 1

  // Position within the current iteration.
  return (local % spec.duration) / spec.duration
}

/**
 * Transform functions always appear in the same order: translate, scale,
 * rotate. A missing or reordered function forces matrix decomposition and the
 * result diverges between engines.
 */
export function formatTransform(frame: Keyframe): string {
  return `translate(${frame.translateX}px, ${frame.translateY}px) scale(${frame.scale}) rotate(${frame.rotate}deg)`
}
