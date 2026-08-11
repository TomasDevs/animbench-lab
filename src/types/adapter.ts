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

export interface Adapter {
  init(ctx: AdapterContext): void
  start(): void
  stop(): void
  dispose(): void
}

/**
 * The shape of an adapter module's default export: a constructor carrying
 * static meta, so the technique list can be read without instantiating it.
 */
export interface AdapterConstructor {
  new (): Adapter
  readonly meta: AdapterMeta
}
