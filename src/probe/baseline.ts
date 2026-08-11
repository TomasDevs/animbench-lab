import type { Baseline } from '../types/probe.ts'

/** Refresh rates displays actually run at. Used to snap the measured value. */
const KNOWN_RATES = [24, 30, 48, 50, 60, 75, 90, 100, 120, 144, 165, 240]

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 1) return sorted[mid] ?? 0
  return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
}

/**
 * Snaps a measured rate to the nearest plausible display rate.
 *
 * The idle loop rarely lands exactly on 60.000 Hz, and reporting 59.94 as the
 * device budget would make the achieved/achievable ratio slightly wrong for
 * every run. Anything further than 10 % from a known rate is kept as measured,
 * so an unusual display is not silently misreported.
 */
function snapRefreshRate(measured: number): number {
  let best = measured
  let bestDistance = Infinity
  for (const rate of KNOWN_RATES) {
    const distance = Math.abs(rate - measured)
    if (distance < bestDistance) {
      bestDistance = distance
      best = rate
    }
  }
  return bestDistance / measured <= 0.1 ? best : measured
}

/**
 * Measures the idle frame interval before the animation starts.
 *
 * Nothing is animated while this runs, so the result reflects what the device
 * can achieve rather than what the technique achieved. Results are later
 * expressed as a ratio of the two.
 */
export function measureBaseline(durationMs = 1000): Promise<Baseline> {
  return new Promise((resolve) => {
    const timestamps: number[] = []
    let start = 0

    const tick = (now: number): void => {
      if (start === 0) start = now
      timestamps.push(now)

      if (now - start < durationMs) {
        requestAnimationFrame(tick)
        return
      }

      const deltas = timestamps.slice(1).map((t, i) => t - (timestamps[i] ?? t))
      // Drop the first delta: the loop's own first frame is often long.
      const settled = deltas.length > 1 ? deltas.slice(1) : deltas
      const medianDelta = median(settled)

      resolve({
        timestamps,
        medianDelta,
        refreshRate: medianDelta > 0 ? snapRefreshRate(1000 / medianDelta) : 0,
        duration: timestamps.length > 0 ? now - start : 0,
      })
    }

    requestAnimationFrame(tick)
  })
}
