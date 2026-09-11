import type { Adapter, AdapterContext, AdapterMeta } from '../types/adapter.ts'
import { formatTransform } from './interpolate.ts'

/**
 * Scroll-driven animations adapter.
 *
 * Progress comes from the scroller position, not from elapsed time, so this
 * technique only works on a scene that provides a scroller. The parallax scene
 * exposes one under the named timeline --animbench-scroll; an adapter must not
 * create its own, since that would change the scene structure.
 *
 * The run still has to be driven, so the adapter scrolls programmatically at a
 * fixed rate. Verified that setting scrollTop advances a ScrollTimeline, so no
 * synthesized input gesture is needed.
 */
export class ScrollDrivenAdapter implements Adapter {
  static readonly meta: AdapterMeta = {
    id: 'scroll-driven',
    label: 'Scroll-driven',
    scenes: ['parallax'],
  }

  static readonly #TIMELINE = '--animbench-scroll'
  static readonly #ANIMATION = 'animbench-scroll-driven'

  #ctx: AdapterContext | null = null
  #style: HTMLStyleElement | null = null
  #scroller: HTMLElement | null = null
  #handle = 0

  init(ctx: AdapterContext): void {
    this.#ctx = ctx
    // The scene root is the scroller; the adapter only reads it.
    this.#scroller = ctx.root

    const first = ctx.spec.keyframes[0]
    if (!first) return
    for (const element of ctx.elements) {
      element.style.transform = formatTransform(first)
      element.style.opacity = String(first.opacity)
    }
  }

  start(): void {
    const ctx = this.#ctx
    const scroller = this.#scroller
    if (!ctx || !scroller || this.#style) return

    const { spec, elements } = ctx

    // One rule per layer speed rather than per element: the keyframe values are
    // scaled by the layer multiplier the scene assigned.
    const speeds = [...new Set(elements.map((el) => el.style.getPropertyValue('--speed') || '1'))]
    const rules = speeds
      .map((speed) => {
        const factor = Number.parseFloat(speed) || 1
        const steps = spec.keyframes
          .map((frame) => {
            const scaled = {
              ...frame,
              translateX: frame.translateX * factor,
              translateY: frame.translateY * factor,
            }
            const percent = (frame.offset * 100).toFixed(4).replace(/\.?0+$/, '')
            return `  ${percent}% { transform: ${formatTransform(scaled)}; opacity: ${frame.opacity}; }`
          })
          .join('\n')
        const name = `${ScrollDrivenAdapter.#ANIMATION}-${factor.toString().replace('.', '_')}`
        return {
          factor,
          name,
          css:
            `@keyframes ${name} {\n${steps}\n}\n` +
            `[data-speed="${speed}"] { animation: ${name} linear both; ` +
            `animation-timeline: ${ScrollDrivenAdapter.#TIMELINE}; }`,
        }
      })

    const style = document.createElement('style')
    style.textContent = rules.map((r) => r.css).join('\n')
    document.head.append(style)
    this.#style = style

    // data-speed selects the rule; it is an attribute on an existing element,
    // not a change to the element list or its order.
    for (const element of elements) {
      element.dataset.speed = element.style.getPropertyValue('--speed') || '1'
    }

    this.#drive(scroller, spec.duration)
  }

  stop(): void {
    if (this.#handle !== 0) {
      cancelAnimationFrame(this.#handle)
      this.#handle = 0
    }
    const ctx = this.#ctx
    if (ctx) {
      for (const element of ctx.elements) {
        const computed = getComputedStyle(element)
        const transform = computed.transform
        const opacity = computed.opacity
        element.style.animation = 'none'
        element.style.transform = transform === 'none' ? '' : transform
        element.style.opacity = opacity
      }
    }
    this.#style?.remove()
    this.#style = null
  }

  dispose(): void {
    this.stop()
    const ctx = this.#ctx
    if (ctx) {
      for (const element of ctx.elements) {
        element.style.animation = ''
        delete element.dataset.speed
      }
    }
    this.#ctx = null
    this.#scroller = null
  }

  /**
   * Scrolls the whole range over the spec's duration at a constant rate, so the
   * run covers the same distance in the same time for every technique.
   */
  #drive(scroller: HTMLElement, durationMs: number): void {
    const distance = scroller.scrollHeight - scroller.clientHeight
    if (distance <= 0 || durationMs <= 0) return

    const startTime = performance.now()
    const tick = (now: number): void => {
      const progress = Math.min((now - startTime) / durationMs, 1)
      scroller.scrollTop = distance * progress
      if (progress >= 1) {
        this.#handle = 0
        return
      }
      this.#handle = requestAnimationFrame(tick)
    }
    this.#handle = requestAnimationFrame(tick)
  }
}

export default ScrollDrivenAdapter
