import lottie from 'lottie-web'
import type { AnimationItem } from 'lottie-web'
import type { Adapter, AdapterContext, AdapterMeta } from '../types/adapter.ts'
import { buildLottieSource } from '../scenes/lottie-source.ts'

/**
 * Lottie adapter. Separate regime, not the main matrix.
 *
 * Lottie plays a prepared document and renders it into a structure of its own,
 * which breaks the rule that an adapter must not touch the scene. The scene's
 * elements are hidden and the player draws its own equivalent alongside them.
 * That is the reason this technique cannot be compared element for element with
 * the others, and why it is measured separately.
 *
 * The document is generated from the same AnimationSpec rather than exported
 * from a design tool, so the motion is identical by construction. What differs
 * is who draws it.
 */
export class LottieAdapter implements Adapter {
  static readonly meta: AdapterMeta = {
    id: 'lottie',
    label: 'Lottie',
    scenes: ['grid', 'composite'],
  }

  #ctx: AdapterContext | null = null
  #animation: AnimationItem | null = null
  #host: HTMLElement | null = null

  init(ctx: AdapterContext): void {
    this.#ctx = ctx

    const first = ctx.elements[0]
    const box = first?.getBoundingClientRect()
    const size = Math.max(1, Math.round(box?.width ?? 20))
    const rootBox = ctx.root.getBoundingClientRect()

    // The scene's own elements are hidden rather than removed: the generator
    // still owns them, and removing nodes would change what dispose() restores.
    for (const element of ctx.elements) element.style.visibility = 'hidden'

    const host = document.createElement('div')
    host.dataset.lottieHost = 'true'
    host.style.cssText =
      'position:absolute;inset:0;width:100%;height:100%;pointer-events:none'
    ctx.root.append(host)
    this.#host = host

    this.#animation = lottie.loadAnimation({
      container: host,
      renderer: 'svg',
      loop: ctx.spec.iterations > 1,
      autoplay: false,
      animationData: buildLottieSource(
        ctx.spec,
        ctx.elements.length,
        size,
        Math.round(rootBox.width),
        Math.round(rootBox.height),
      ),
    })
  }

  start(): void {
    this.#animation?.play()
  }

  stop(): void {
    this.#animation?.pause()
  }

  dispose(): void {
    this.#animation?.destroy()
    this.#animation = null
    this.#host?.remove()
    this.#host = null

    const ctx = this.#ctx
    if (ctx) {
      for (const element of ctx.elements) element.style.visibility = ''
    }
    this.#ctx = null
  }
}

export default LottieAdapter
