import type { Baseline, BenchResult, RunMeta } from '../types/probe.ts'
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
  /** Begins frame collection. Call once, when the run is meant to start. */
  begin(): void
  /** Stops collection and publishes the result. */
  finish(): BenchResult
  collector: FrameCollector
  /** Measured before the run started, so demo mode can report against it. */
  baseline: Baseline
}

/**
 * Prepares the measurement: idle baseline first, then a collector sized for the
 * run. Collection itself starts on begin().
 *
 * The baseline must be measured before the animation starts, otherwise it would
 * capture the load it is meant to be compared against. Preparing and starting
 * are separate so that building the scene is not recorded as part of the run.
 */
export async function prepareProbe(
  meta: RunMeta,
  onStart: () => void,
  options: { expectedFrames?: number; runDurationMs?: number } = {},
): Promise<RunHandle> {
  const baseline = await measureBaseline()

  // Sized from the whole run, not the nominal duration: stagger stretches a 10 s
  // spec over 4000 elements to 26 s, and the tail would be discarded silently.
  const runMs = options.runDurationMs ?? meta.duration
  const frames =
    options.expectedFrames ??
    Math.ceil(((runMs / 1000) * (baseline.refreshRateHz || 60)) * 1.5) + 240

  const collector = new FrameCollector(frames)

  return {
    collector,
    baseline,
    begin(): void {
      collector.start()
      onStart()
    },
    finish(): BenchResult {
      collector.stop()
      const result: BenchResult = {
        meta,
        baseline,
        timestamps: collector.toArray(),
        startTime: collector.startTime,
        endTime: collector.endTime,
        // A truncated run must be detectable: it otherwise reads as a complete
        // one with fewer dropped frames.
        overflowed: collector.overflowed,
      }
      publishResult(result)
      return result
    },
  }
}
