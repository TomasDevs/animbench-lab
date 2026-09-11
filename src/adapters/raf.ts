import type { Adapter, AdapterContext, AdapterMeta } from '../types/adapter.ts'
import { formatTransform, interpolate, progressAt } from './interpolate.ts'

/**
 * Reference implementation: positions computed straight from the spec, with no
 * engine involved.
 *
 * Every other adapter is validated against this one, so it must stay free of
 * shortcuts such as caching computed strings or skipping unchanged frames.
 * Those would make the reference faster than what it validates.
 */
export class RafAdapter implements Adapter {
  static readonly meta: AdapterMeta = {
    id: 'raf',
    label: 'requestAnimationFrame',
    scenes: ['grid', 'composite'],
  }

  #ctx: AdapterContext | null = null
  #handle = 0
  #startTime = 0

  init(ctx: AdapterContext): void {
    this.#ctx = ctx
    // Put every element in its time-zero pose so the scene looks identical
    // across techniques before the run begins.
    this.#applyAt(0)
  }

  start(): void {
    if (!this.#ctx || this.#handle !== 0) return

    // Time zero is start(), not the first frame: timer driven adapters count
    // from start() too, and a differing origin shows up as a trajectory
    // difference that no technique actually has.
    this.#startTime = performance.now()

    const tick = (now: number): void => {
      const elapsed = now - this.#startTime

      const finished = this.#applyAt(elapsed)
      if (finished) {
        this.#handle = 0
        return
      }
      this.#handle = requestAnimationFrame(tick)
    }
    this.#handle = requestAnimationFrame(tick)
  }

  stop(): void {
    if (this.#handle !== 0) {
      cancelAnimationFrame(this.#handle)
      this.#handle = 0
    }
  }

  dispose(): void {
    this.stop()
    this.#ctx = null
  }

  /**
   * Writes the pose for every element at the given elapsed time.
   * Returns true once every element has reached the end of its timeline.
   */
  #applyAt(elapsed: number): boolean {
    const ctx = this.#ctx
    if (!ctx) return true

    const { spec, elements } = ctx
    let allDone = true

    for (let i = 0; i < elements.length; i++) {
      const element = elements[i]
      if (!element) continue

      const progress = progressAt(spec, elapsed, i)
      // Element still waiting for its stagger delay: leave it at time zero.
      if (progress === null) {
        allDone = false
        const frame = interpolate(spec, 0)
        element.style.transform = formatTransform(frame)
        element.style.opacity = String(frame.opacity)
        continue
      }

      const total = spec.duration * spec.iterations
      if (elapsed - i * spec.stagger < total) allDone = false

      const frame = interpolate(spec, progress)
      element.style.transform = formatTransform(frame)
      element.style.opacity = String(frame.opacity)
    }

    return allDone
  }
}

export default RafAdapter
