import type { SceneId } from './scene.ts'

export type SceneOptions = {
  /** Number of elements to build. */
  complexity: number
  seed: number
}

/**
 * What a scene generator hands over once the DOM is built.
 *
 * From this point on the structure is frozen. Adapters only change how the
 * elements move, never what they are.
 */
export type Scene = {
  id: SceneId
  root: HTMLElement
  elements: HTMLElement[]
  /** Teardown, so demo mode can rebuild without reloading the page. */
  dispose(): void
}

export type SceneGenerator = {
  id: SceneId
  build(container: HTMLElement, options: SceneOptions): Scene
}
