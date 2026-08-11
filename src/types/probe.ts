import type { SceneId } from './scene.ts'

/**
 * Baseline measured before the run, with no animation on screen.
 *
 * There is no web API for the display refresh rate, so it is derived
 * empirically. Adaptive displays change it by themselves, so it is recorded per
 * run rather than once per device.
 */
export type Baseline = {
  /** Raw frame timestamps of the idle loop, ms. */
  timestamps: number[]
  /** Median gap between idle frames, ms. The device's real frame budget. */
  medianDelta: number
  /** Derived refresh rate in Hz, rounded to the nearest plausible value. */
  refreshRate: number
  /** How long the idle loop ran, ms. */
  duration: number
}

/** Everything needed to reproduce the run, recorded alongside the timestamps. */
export type RunMeta = {
  technique: string
  scene: SceneId
  complexity: number
  seed: number
  /** Requested duration in ms. */
  duration: number
  /** Run index, for logging only. */
  repeat: number
  userAgent: string
  viewport: { width: number; height: number }
  devicePixelRatio: number
  /** Set when the browser exposes it; absent on most non-Chromium engines. */
  hardwareConcurrency?: number
  deviceMemory?: number
  /** ISO timestamp of when the run started. */
  startedAt: string
}

/**
 * The result handed to the measuring tool.
 *
 * Raw timestamps only. All aggregation happens outside the browser: computing
 * averages inside the page would load the very thread being measured.
 */
export type BenchResult = {
  meta: RunMeta
  baseline: Baseline
  /** Frame timestamps collected during the run, ms, from performance.now(). */
  timestamps: number[]
  /** Wall clock start of collection, ms. */
  startTime: number
  /** Wall clock end of collection, ms. */
  endTime: number
  /**
   * True when the run produced more frames than the buffer could hold, so the
   * timestamps are truncated. Such a run must be discarded rather than
   * aggregated: it would look like a shorter run with fewer dropped frames.
   */
  overflowed: boolean
}

declare global {
  interface Window {
    /** True once the scene is built and the adapter initialised. */
    __benchReady?: boolean
    /** Raw timestamps and run metadata after the run ends. */
    __benchResult?: BenchResult
    /** True once the result is available, or once the run has failed. */
    __benchDone?: boolean
    /** Set instead of __benchResult when the run could not complete. */
    __benchError?: string
  }
}
