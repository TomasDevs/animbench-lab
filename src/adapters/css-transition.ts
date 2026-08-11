import type { Adapter, AdapterContext, AdapterMeta } from '../types/adapter.ts'
import type { Keyframe } from '../types/animation.ts'
import { formatTransform } from './interpolate.ts'

/**
 * CSS transitions adapter.
 *
 * A transition interpolates between two states only, so the keyframe list is
 * walked segment by segment. Segments advance on a timer rather than on
 * transitionend, which fires once per animated property and may not fire at all
 * in a background tab.
 *
 * This technique runs roughly one frame behind the reference, because a style
 * written from a timer is committed on the next frame. That lag is a property
 * of the technique; the validator reports it rather than correcting for it.
 */
export class CssTransitionAdapter implements Adapter {
  static readonly meta: AdapterMeta = {
    id: 'css-transition',
    label: 'CSS transitions',
    scenes: ['grid', 'composite'],
  }

  #ctx: AdapterContext | null = null
  #timers: number[] = []
  #running = false

  init(ctx: AdapterContext): void {
    this.#ctx = ctx

    const first = ctx.spec.keyframes[0]
    for (const element of ctx.elements) {
      // No transition yet: the time-zero pose must be applied instantly,
      // otherwise the elements would animate into their starting position.
      element.style.transition = 'none'
      if (first) {
        element.style.transform = formatTransform(first)
        element.style.opacity = String(first.opacity)
      }
    }
  }

  start(): void {
    const ctx = this.#ctx
    if (!ctx || this.#running) return
    this.#running = true

    const { spec, elements } = ctx
    const frames = spec.keyframes
    if (frames.length < 2) return

    for (let i = 0; i < elements.length; i++) {
      const element = elements[i]
      if (!element) continue
      const delay = i * spec.stagger

      for (let iteration = 0; iteration < spec.iterations; iteration++) {
        const iterationStart = delay + iteration * spec.duration

        for (let f = 0; f < frames.length - 1; f++) {
          const from = frames[f]
          const to = frames[f + 1]
          if (!from || !to) continue

          const segmentStart = iterationStart + from.offset * spec.duration
          const segmentMs = (to.offset - from.offset) * spec.duration

          this.#schedule(() => {
            this.#applySegment(element, to, segmentMs)
          }, segmentStart)
        }

        // Snap back before the next iteration, otherwise the element would
        // transition backwards through the whole timeline.
        if (iteration < spec.iterations - 1) {
          const wrap = iterationStart + spec.duration
          this.#schedule(() => {
            const first = frames[0]
            if (!first) return
            element.style.transition = 'none'
            element.style.transform = formatTransform(first)
            element.style.opacity = String(first.opacity)
          }, wrap)
        }
      }
    }
  }

  stop(): void {
    for (const timer of this.#timers) clearTimeout(timer)
    this.#timers = []
    this.#running = false

    // Reading the computed value and writing it back cancels the in-flight
    // transition without a jump.
    const ctx = this.#ctx
    if (!ctx) return
    for (const element of ctx.elements) {
      const computed = getComputedStyle(element)
      const transform = computed.transform
      const opacity = computed.opacity
      element.style.transition = 'none'
      element.style.transform = transform === 'none' ? '' : transform
      element.style.opacity = opacity
    }
  }

  dispose(): void {
    this.stop()
    const ctx = this.#ctx
    if (ctx) {
      for (const element of ctx.elements) {
        element.style.transition = ''
      }
    }
    this.#ctx = null
  }

  #schedule(fn: () => void, atMs: number): void {
    const timer = window.setTimeout(fn, atMs)
    this.#timers.push(timer)
  }

  #applySegment(element: HTMLElement, to: Keyframe, durationMs: number): void {
    element.style.transition = `transform ${durationMs}ms linear, opacity ${durationMs}ms linear`
    element.style.transform = formatTransform(to)
    element.style.opacity = String(to.opacity)
  }
}

export default CssTransitionAdapter
