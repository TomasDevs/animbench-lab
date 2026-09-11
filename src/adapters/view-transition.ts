import type { Adapter, AdapterContext, AdapterMeta } from '../types/adapter.ts'
import { formatTransform } from './interpolate.ts'

/**
 * View Transitions API adapter. Separate regime, not the main matrix.
 *
 * The API animates a one-shot transition between two document states, so it has
 * no duration to fill and no keyframe list to follow: the browser interpolates
 * between the snapshot it took and the new state. A ten second run and an
 * average frame rate are meaningless here.
 *
 * The spec is therefore read only for its extremes. The run performs one
 * transition from the first keyframe to the one furthest from it, and what gets
 * measured is how long the transition takes and how many frames it drops.
 *
 * The last keyframe is deliberately not used: a looping spec ends where it
 * starts, so transitioning to it would move nothing at all.
 */
export class ViewTransitionAdapter implements Adapter {
  static readonly meta: AdapterMeta = {
    id: 'view-transition',
    label: 'View Transitions API',
    scenes: ['grid', 'composite'],
  }

  #ctx: AdapterContext | null = null
  #style: HTMLStyleElement | null = null
  #transition: ViewTransition | null = null

  init(ctx: AdapterContext): void {
    this.#ctx = ctx

    const first = ctx.spec.keyframes[0]
    if (!first) return

    // Every element needs its own transition name, otherwise the browser
    // snapshots them as one group and animates a single rectangle instead of
    // the individual elements.
    for (let i = 0; i < ctx.elements.length; i++) {
      const element = ctx.elements[i]
      if (!element) continue
      element.style.viewTransitionName = `animbench-vt-${i}`
      element.style.transform = formatTransform(first)
      element.style.opacity = String(first.opacity)
    }

    // The default pseudo-element animation is a cross-fade over ~250 ms. Pinning
    // it to the spec's duration and a linear curve keeps the comparison with the
    // other techniques as close as the API allows.
    const style = document.createElement('style')
    style.textContent =
      `::view-transition-group(*) { animation-duration: ${ctx.spec.duration}ms; animation-timing-function: linear; }\n` +
      `::view-transition-old(*), ::view-transition-new(*) { animation-duration: ${ctx.spec.duration}ms; animation-timing-function: linear; }`
    document.head.append(style)
    this.#style = style
  }

  start(): void {
    const ctx = this.#ctx
    if (!ctx || this.#transition) return

    const target = farthestKeyframe(ctx.spec.keyframes)
    if (!target) return

    this.#transition = document.startViewTransition(() => {
      for (const element of ctx.elements) {
        element.style.transform = formatTransform(target)
        element.style.opacity = String(target.opacity)
      }
    })
  }

  stop(): void {
    this.#transition?.skipTransition()
    this.#transition = null
  }

  dispose(): void {
    this.stop()
    const ctx = this.#ctx
    if (ctx) {
      for (const element of ctx.elements) element.style.viewTransitionName = ''
    }
    this.#style?.remove()
    this.#style = null
    this.#ctx = null
  }

  /** Resolves once the transition has finished, for the page to await. */
  get finished(): Promise<void> {
    return this.#transition?.finished ?? Promise.resolve()
  }
}

export default ViewTransitionAdapter

/**
 * Keyframe furthest from the first one, by translation distance.
 *
 * A one-shot transition needs two distinct states. Cyclic specs return to their
 * starting pose, so the endpoint has to be chosen by distance rather than by
 * position in the list.
 */
function farthestKeyframe(frames: AdapterContext['spec']['keyframes']) {
  const first = frames[0]
  if (!first) return null

  let best = first
  let bestDistance = -1
  for (const frame of frames) {
    const distance = Math.hypot(
      frame.translateX - first.translateX,
      frame.translateY - first.translateY,
    )
    if (distance > bestDistance) {
      bestDistance = distance
      best = frame
    }
  }
  return bestDistance > 0 ? best : null
}
