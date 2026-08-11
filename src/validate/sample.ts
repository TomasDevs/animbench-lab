import type { TrajectorySample } from '../types/validation.ts'

/**
 * Reads the pose the browser actually applied.
 *
 * The computed matrix is read rather than the spec, because the point of
 * validation is to compare what each technique produced, not what it was asked
 * to produce.
 */
export function readPose(element: HTMLElement, time: number): TrajectorySample {
  const style = getComputedStyle(element)
  const opacity = Number.parseFloat(style.opacity) || 0
  const transform = style.transform

  if (transform === 'none' || transform === '') {
    return { time, translateX: 0, translateY: 0, scale: 1, rotate: 0, opacity }
  }

  const values = transform
    .slice(transform.indexOf('(') + 1, transform.lastIndexOf(')'))
    .split(',')
    .map((part) => Number.parseFloat(part))

  // matrix(a, b, c, d, e, f)
  const a = values[0] ?? 1
  const b = values[1] ?? 0
  const e = values[4] ?? 0
  const f = values[5] ?? 0

  return {
    time,
    translateX: e,
    translateY: f,
    // Decomposed from the matrix: both techniques must produce the same values
    // regardless of how they wrote them.
    scale: Math.hypot(a, b),
    rotate: (Math.atan2(b, a) * 180) / Math.PI,
    opacity,
  }
}
