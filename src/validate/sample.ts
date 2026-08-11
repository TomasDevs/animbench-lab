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

  // A promoted layer may report matrix3d(...) even for a purely 2D transform,
  // and there the translation sits at indices 12 and 13 rather than 4 and 5.
  // Reading the wrong pair would return 0 for every sample and make two
  // unrelated trajectories look identical.
  const is3d = transform.startsWith('matrix3d')

  const a = values[0] ?? 1
  const b = values[1] ?? 0
  const e = (is3d ? values[12] : values[4]) ?? 0
  const f = (is3d ? values[13] : values[5]) ?? 0

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
