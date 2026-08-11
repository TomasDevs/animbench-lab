/**
 * Live frame rate readout for demo mode only.
 *
 * This deliberately duplicates work the probe refuses to do. The probe collects
 * raw timestamps and never aggregates, because aggregation would load the
 * measured thread. The readout is a debugging aid, so it may aggregate, and it
 * exists only in demo mode where nothing is being measured.
 *
 * Never use this in bench mode.
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
  // Set on the first frame rather than at construction: the gap between
  // starting the meter and the first rAF would otherwise be counted as frame
  // time, under-reporting the first sample and poisoning any running minimum.
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
