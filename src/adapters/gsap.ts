import { gsap } from 'gsap'
import type { Adapter, AdapterContext, AdapterMeta } from '../types/adapter.ts'
import { formatTransform } from './interpolate.ts'

/**
 * GSAP adapter.
 *
 * The spec becomes one timeline per element, built from the same keyframe list
 * every other adapter reads.
 *
 * GSAP normally parses and recomposes transforms into its own x/y/scale/rotation
 * properties, which would reorder the transform functions and diverge from the
 * reference. Writing the whole transform string as a single property keeps the
 * function order fixed.
 */
export class GsapAdapter implements Adapter {
  static readonly meta: AdapterMeta = {
    id: 'gsap',
    label: 'GSAP',
    scenes: ['grid', 'composite'],
  }

  #ctx: AdapterContext | null = null
  #timeline: gsap.core.Timeline | null = null

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
    if (!ctx || this.#timeline) return

    const { spec, elements } = ctx
    const frames = spec.keyframes
    if (frames.length < 2) return

    const timeline = gsap.timeline({ paused: true })

    for (let i = 0; i < elements.length; i++) {
      const element = elements[i]
      if (!element) continue
      const delaySeconds = (i * spec.stagger) / 1000
      for (let f = 0; f < frames.length - 1; f++) {
        const from = frames[f]
        const to = frames[f + 1]
        if (!from || !to) continue

        // A carrier object GSAP tweens instead of the element, so GSAP never
        // touches the transform and cannot reorder its functions. One per
        // segment, since each starts from zero.
        const carrier = { animbenchProgress: 0 }

        timeline.to(
          carrier,
          {
            // GSAP rewrites a transform string into translate3d() and drops the
            // scale and rotate functions when they are neutral, which changes
            // the function list the browser sees. Driving a plain object and
            // writing the transform ourselves keeps the order fixed.
            animbenchProgress: 1,
            duration: ((to.offset - from.offset) * spec.duration) / 1000,
            ease: 'none',
            immediateRender: false,
            onUpdate(this: gsap.core.Tween) {
              const t = this.progress()
              const frame = {
                offset: 0,
                translateX: from.translateX + (to.translateX - from.translateX) * t,
                translateY: from.translateY + (to.translateY - from.translateY) * t,
                scale: from.scale + (to.scale - from.scale) * t,
                rotate: from.rotate + (to.rotate - from.rotate) * t,
                opacity: from.opacity + (to.opacity - from.opacity) * t,
              }
              element.style.transform = formatTransform(frame)
              element.style.opacity = String(frame.opacity)
            },
          },
          delaySeconds + (from.offset * spec.duration) / 1000,
        )
      }
    }

    this.#timeline = timeline
    timeline.play(0)
  }

  stop(): void {
    // pause() leaves the elements wherever the timeline had them; kill() would
    // drop GSAP's inline styles and snap the scene back.
    this.#timeline?.pause()
  }

  dispose(): void {
    this.stop()
    this.#timeline?.kill()
    this.#timeline = null
    this.#ctx = null
  }
}

export default GsapAdapter
