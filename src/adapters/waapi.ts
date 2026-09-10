import type { Adapter, AdapterContext, AdapterMeta } from '../types/adapter.ts'
import { formatTransform } from './interpolate.ts'

/**
 * Web Animations API adapter.
 *
 * The spec maps almost directly onto element.animate(): its keyframe list takes
 * the same offsets and the same transform strings the reference computes, so
 * the browser does the interpolation instead of a per-frame callback.
 *
 * Stagger is expressed as a negative-free delay rather than by shifting the
 * keyframes, so every element receives an identical keyframe list.
 */
export class WaapiAdapter implements Adapter {
  static readonly meta: AdapterMeta = {
    id: 'waapi',
    label: 'Web Animations API',
    scenes: ['grid', 'parallax', 'composite'],
  }

  #ctx: AdapterContext | null = null
  #animations: Animation[] = []

  init(ctx: AdapterContext): void {
    this.#ctx = ctx

    const first = ctx.spec.keyframes[0]
    if (!first) return
    // Time-zero pose written inline, so the scene looks identical across
    // techniques before any animation exists.
    for (const element of ctx.elements) {
      element.style.transform = formatTransform(first)
      element.style.opacity = String(first.opacity)
    }
  }

  start(): void {
    const ctx = this.#ctx
    if (!ctx || this.#animations.length > 0) return

    const { spec, elements } = ctx
    const keyframes = spec.keyframes.map((frame) => ({
      offset: frame.offset,
      transform: formatTransform(frame),
      opacity: String(frame.opacity),
    }))

    for (let i = 0; i < elements.length; i++) {
      const element = elements[i]
      if (!element) continue

      const animation = element.animate(keyframes, {
        duration: spec.duration,
        iterations: spec.iterations,
        delay: i * spec.stagger,
        easing: spec.easing,
        // Hold the final pose instead of snapping back, matching what the
        // reference leaves on screen at the end of the run.
        fill: 'forwards',
      })
      this.#animations.push(animation)
    }
  }

  stop(): void {
    for (const animation of this.#animations) {
      // commitStyles writes the current pose inline before cancelling, so the
      // element freezes where it is rather than jumping back.
      try {
        animation.commitStyles()
      } catch {
        // Throws if the element is not rendered; nothing to preserve then.
      }
      animation.cancel()
    }
    this.#animations = []
  }

  dispose(): void {
    this.stop()
    this.#ctx = null
  }
}

export default WaapiAdapter
