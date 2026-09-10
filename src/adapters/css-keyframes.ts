import type { Adapter, AdapterContext, AdapterMeta } from '../types/adapter.ts'
import { formatTransform } from './interpolate.ts'

/**
 * CSS keyframes adapter.
 *
 * The spec becomes a single @keyframes rule that every element shares, with
 * stagger applied as animation-delay. One rule for the whole scene keeps the
 * style sheet small: a per-element rule at 2000 elements would itself become a
 * measurable cost.
 *
 * The rule goes into <head>, not into the scene, so the element structure the
 * generator produced stays untouched.
 */
export class CssKeyframesAdapter implements Adapter {
  static readonly meta: AdapterMeta = {
    id: 'css-keyframes',
    label: 'CSS keyframes',
    scenes: ['grid', 'composite'],
  }

  static readonly #ANIMATION_NAME = 'animbench-keyframes'

  #ctx: AdapterContext | null = null
  #style: HTMLStyleElement | null = null

  init(ctx: AdapterContext): void {
    this.#ctx = ctx

    const first = ctx.spec.keyframes[0]
    if (!first) return
    for (const element of ctx.elements) {
      element.style.transform = formatTransform(first)
      element.style.opacity = String(first.opacity)
    }
  }

  start(): void {
    const ctx = this.#ctx
    if (!ctx || this.#style) return

    const { spec, elements } = ctx

    const steps = spec.keyframes
      .map((frame) => {
        const percent = (frame.offset * 100).toFixed(4).replace(/\.?0+$/, '')
        return `  ${percent}% { transform: ${formatTransform(frame)}; opacity: ${frame.opacity}; }`
      })
      .join('\n')

    const style = document.createElement('style')
    style.textContent = `@keyframes ${CssKeyframesAdapter.#ANIMATION_NAME} {\n${steps}\n}`
    document.head.append(style)
    this.#style = style

    // Delay is per element, so it stays inline rather than in the shared rule.
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i]
      if (!element) continue
      element.style.animation =
        `${CssKeyframesAdapter.#ANIMATION_NAME} ${spec.duration}ms ${spec.easing} ` +
        `${i * spec.stagger}ms ${spec.iterations} forwards`
    }
  }

  stop(): void {
    const ctx = this.#ctx
    if (ctx) {
      for (const element of ctx.elements) {
        // Read the current pose back before dropping the animation, so the
        // element freezes where it is instead of snapping to its base style.
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
      for (const element of ctx.elements) element.style.animation = ''
    }
    this.#ctx = null
  }
}

export default CssKeyframesAdapter
