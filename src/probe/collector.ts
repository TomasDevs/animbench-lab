/**
 * Frame timestamp collector.
 *
 * Raw timestamps and nothing else: all aggregation happens outside the browser,
 * because computing anything here would load the thread being measured. The
 * buffer is preallocated so the hot loop never triggers a resize mid-run.
 */
export class FrameCollector {
  #timestamps: Float64Array
  #count = 0
  #handle = 0
  #startTime = 0
  #endTime = 0

  /**
   * @param expectedFrames Capacity hint. Overflow is dropped rather than
   * reallocated mid-run, so the measurement stays free of allocation pauses.
   */
  constructor(expectedFrames = 4096) {
    this.#timestamps = new Float64Array(expectedFrames)
  }

  get running(): boolean {
    return this.#handle !== 0
  }

  start(): void {
    if (this.#handle !== 0) return
    this.#count = 0
    this.#startTime = performance.now()

    const tick = (now: number): void => {
      if (this.#count < this.#timestamps.length) {
        this.#timestamps[this.#count++] = now
      }
      this.#handle = requestAnimationFrame(tick)
    }
    this.#handle = requestAnimationFrame(tick)
  }

  stop(): void {
    if (this.#handle === 0) return
    cancelAnimationFrame(this.#handle)
    this.#handle = 0
    this.#endTime = performance.now()
  }

  /** Whether the run produced more frames than the buffer could hold. */
  get overflowed(): boolean {
    return this.#count >= this.#timestamps.length
  }

  get startTime(): number {
    return this.#startTime
  }

  get endTime(): number {
    return this.#endTime === 0 ? performance.now() : this.#endTime
  }

  /** Converts to a plain array. Called once, after the run has ended. */
  toArray(): number[] {
    return Array.from(this.#timestamps.subarray(0, this.#count))
  }
}
