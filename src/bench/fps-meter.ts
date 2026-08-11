/**
 * Live frame rate readout. Demo mode only.
 *
 * Aggregating in the page is exactly what the probe refuses to do, since it
 * loads the measured thread. This is a debugging aid and must never run in
 * bench mode.
 */
export type FpsMeter = {
  stop(): void
}

export function startFpsMeter(
  onSample: (fps: number) => void,
  intervalMs = 500,
): FpsMeter {
  let handle = 0
  let frames = 0
  // Set on the first frame, not at construction: the gap before the first rAF
  // would otherwise count as frame time and poison a running minimum.
  let last = 0

  const tick = (now: number): void => {
    if (last === 0) {
      last = now
      handle = requestAnimationFrame(tick)
      return
    }
    frames++
    const elapsed = now - last
    if (elapsed >= intervalMs) {
      onSample((frames * 1000) / elapsed)
      frames = 0
      last = now
    }
    handle = requestAnimationFrame(tick)
  }
  handle = requestAnimationFrame(tick)

  return {
    stop() {
      if (handle !== 0) {
        cancelAnimationFrame(handle)
        handle = 0
      }
    },
  }
}
