import type { SceneId } from '../types/scene.ts'
import type { SceneGenerator } from '../types/scene-generator.ts'

/**
 * Scene generators are loaded on demand so a run never downloads code it does
 * not use. parallax and composite are added in later steps.
 */
const loaders: Partial<Record<SceneId, () => Promise<SceneGenerator>>> = {
  grid: () => import('./grid.ts').then((m) => m.gridScene),
  composite: () => import('./composite.ts').then((m) => m.compositeScene),
  parallax: () => import('./parallax.ts').then((m) => m.parallaxScene),
}

export async function loadScene(id: SceneId): Promise<SceneGenerator> {
  const loader = loaders[id]
  if (!loader) {
    throw new Error(`Scene "${id}" is not implemented yet`)
  }
  return loader()
}

export function availableScenes(): SceneId[] {
  return Object.keys(loaders) as SceneId[]
}
