import { animate } from 'motion'
import type { Adapter, AdapterContext, AdapterMeta } from '../types/adapter.ts'
import { formatTransform } from './interpolate.ts'

/**
 * Motion adapter, vanilla animate() API.
 *
 * Used without motion/react on purpose: measuring the React bindings would
 * compare React plus Motion against vanilla GSAP, not the techniques
 * themselves. The React variant is measured separately.
 *
 * Motion, like GSAP, normally writes transforms as individual properties and
 * reorders the function list. It therefore drives a progress value and the
 * transform is written here, which keeps the function order identical to the
 * reference.
 */
export class MotionAdapter implements Adapter {
  static readonly meta: AdapterMeta = {
    id: 'motion',
    label: 'Motion',
    scenes: ['grid', 'composite'],
  }

  #ctx: AdapterContext | null = null
  #animations: { stop(): void }[] = []

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
    if (!ctx || this.#animations.length > 0) return

    const { spec, elements } = ctx
    const frames = spec.keyframes
    if (frames.length < 2) return

    // Offsets drive a single 0..1 value; the pose is derived from it, so Motion
    // never sees a transform string to reinterpret.
    const offsets = frames.map((frame) => frame.offset)
    const progressValues = frames.map((frame) => frame.offset)

    for (let i = 0; i < elements.length; i++) {
      const element = elements[i]
      if (!element) continue

      const state = { progress: 0 }
      const animation = animate(state, { progress: progressValues }, {
        duration: spec.duration / 1000,
        delay: (i * spec.stagger) / 1000,
        ease: 'linear',
        repeat: spec.iterations - 1,
        times: offsets,
        onUpdate: (latest: { progress?: number }) => {
          const frame = frameAt(frames, latest.progress ?? state.progress)
          element.style.transform = formatTransform(frame)
          element.style.opacity = String(frame.opacity)
        },
      })
      this.#animations.push(animation)
    }
  }

  stop(): void {
    for (const animation of this.#animations) animation.stop()
    this.#animations = []
  }

  dispose(): void {
    this.stop()
    this.#ctx = null
  }
}

/** Linear interpolation of the keyframe list at a progress value. */
function frameAt(frames: AdapterContext['spec']['keyframes'], progress: number) {
  const first = frames[0]
  const last = frames[frames.length - 1]
  if (!first || !last) throw new Error('Spec carries no keyframes')
  if (progress <= first.offset) return first
  if (progress >= last.offset) return last

  for (let i = 0; i < frames.length - 1; i++) {
    const a = frames[i]
    const b = frames[i + 1]
    if (!a || !b || progress < a.offset || progress > b.offset) continue
    const span = b.offset - a.offset
    const t = span <= 0 ? 1 : (progress - a.offset) / span
    return {
      offset: progress,
      translateX: a.translateX + (b.translateX - a.translateX) * t,
      translateY: a.translateY + (b.translateY - a.translateY) * t,
      scale: a.scale + (b.scale - a.scale) * t,
      rotate: a.rotate + (b.rotate - a.rotate) * t,
      opacity: a.opacity + (b.opacity - a.opacity) * t,
    }
  }
  return last
}

export default MotionAdapter
