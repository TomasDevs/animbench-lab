export type SceneId = 'grid' | 'parallax' | 'composite'

export const SCENE_IDS: readonly SceneId[] = ['grid', 'parallax', 'composite']

export function isSceneId(value: string): value is SceneId {
  return (SCENE_IDS as readonly string[]).includes(value)
}
