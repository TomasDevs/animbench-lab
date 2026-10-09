import type { AnimationSpec } from './animation.ts'
import type { SceneId } from './scene.ts'

/**
 * Everything an adapter is given.
 *
 * The element list is already built by the scene generator. An adapter must not
 * insert, remove or reorder DOM nodes.
 */
export type AdapterContext = {
  /** Elements to animate, in scene order. */
  elements: HTMLElement[]
  /** The container holding the elements. Adapters may read it, not restructure it. */
  root: HTMLElement
  spec: AnimationSpec
  scene: SceneId
}

export type AdapterMeta = {
  id: string
  label: string
  scenes: SceneId[]
}

/** Moments of a one-shot animation, in the performance.now() clock. */
export type OneShotMarks = {
  /** start() was called. */
  startMs: number
  /** The browser had prepared the animation and began playing it. */
  readyMs: number
  /** The animation finished. */
  finishedMs: number
}

export interface Adapter {
  init(ctx: AdapterContext): void
  start(): void
  stop(): void
  dispose(): void
  /**
   * Only for one-shot techniques, which have no duration to fill. Resolves when
   * the animation has finished; the page then measures from readyMs to
   * finishedMs instead of over a stagger-derived window.
   */
  completion?(): Promise<OneShotMarks>
}

/**
 * The shape of an adapter module's default export: a constructor carrying
 * static meta, so the technique list can be read without instantiating it.
 */
export interface AdapterConstructor {
  new (): Adapter
  readonly meta: AdapterMeta
}
