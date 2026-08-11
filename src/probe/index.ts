import type { BenchResult, RunMeta } from '../types/probe.ts'
import { measureBaseline } from './baseline.ts'
import { FrameCollector } from './collector.ts'

export { measureBaseline } from './baseline.ts'
export { FrameCollector } from './collector.ts'

/**
 * Marks the page as ready. Called once the scene is built and the adapter
 * initialised, so the measuring tool knows it may start the run.
 */
export function markReady(): void {
  window.__benchReady = true
}

/**
 * Publishes the result. After this, __benchDone is true and the tool can read
 * __benchResult.
 */
export function publishResult(result: BenchResult): void {
  window.__benchResult = result
  window.__benchDone = true
}

/** Collects the environment facts needed to reproduce and interpret a run. */
export function collectMeta(
  base: Omit<RunMeta, 'userAgent' | 'viewport' | 'devicePixelRatio' | 'startedAt'>,
): RunMeta {
  const nav = navigator as Navigator & { deviceMemory?: number }
  return {
    ...base,
    userAgent: navigator.userAgent,
    viewport: { width: window.innerWidth, height: window.innerHeight },
    devicePixelRatio: window.devicePixelRatio,
    hardwareConcurrency: navigator.hardwareConcurrency,
    deviceMemory: nav.deviceMemory,
    startedAt: new Date().toISOString(),
  }
}

export type RunHandle = {
  /** Stops collection and publishes the result. */
  finish(): BenchResult
  collector: FrameCollector
}

/**
 * Runs the measurement: idle baseline first, then frame collection.
 *
 * The baseline must be measured before the animation starts, otherwise it would
 * capture the load it is meant to be compared against.
 */
export async function runProbe(
  meta: RunMeta,
  onStart: () => void,
  expectedFrames?: number,
): Promise<RunHandle> {
  const baseline = await measureBaseline()

  // Size the buffer from the measured rate plus headroom, so a fast display
  // does not overflow a 60 Hz assumption.
  const frames =
    expectedFrames ??
    Math.ceil(((meta.duration / 1000) * (baseline.refreshRate || 60)) * 1.5) + 240

  const collector = new FrameCollector(frames)
  collector.start()
  onStart()

  return {
    collector,
    finish(): BenchResult {
      collector.stop()
      const result: BenchResult = {
        meta,
        baseline,
        timestamps: collector.toArray(),
        startTime: collector.startTime,
        endTime: collector.endTime,
      }
      publishResult(result)
      return result
    },
  }
}
