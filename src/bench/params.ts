import type { SceneId } from '../types/scene.ts'
import { isSceneId } from '../types/scene.ts'

export type BenchMode = 'bench' | 'demo'

export type BenchParams = {
  technique: string
  scene: SceneId
  complexity: number
  seed: number
  /** ms */
  duration: number
  /**
   * Requested steady-state window in ms. When present, duration is derived from
   * it so the measured window stays constant across complexities.
   */
  window?: number
  mode: BenchMode
  /** Run index, for logging only. */
  repeat: number
}

const DEFAULTS: BenchParams = {
  technique: 'raf',
  scene: 'grid',
  complexity: 500,
  seed: 42,
  duration: 10_000,
  mode: 'bench',
  repeat: 0,
}

function intParam(source: URLSearchParams, key: string, fallback: number, min: number, max: number): number {
  const raw = source.get(key)
  if (raw === null) return fallback
  const value = Number.parseInt(raw, 10)
  if (!Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, value))
}

/**
 * Reads the run configuration from the URL.
 *
 * One measurement run equals one page load, so the parameters are read once and
 * never change afterwards. Invalid values fall back to defaults rather than
 * throwing: a malformed URL must not leave the page without a scene.
 */
export function readParams(search: string = window.location.search): BenchParams {
  const source = new URLSearchParams(search)

  const scene = source.get('scene')
  const mode = source.get('mode')

  return {
    technique: source.get('technique') ?? DEFAULTS.technique,
    scene: scene !== null && isSceneId(scene) ? scene : DEFAULTS.scene,
    complexity: intParam(source, 'complexity', DEFAULTS.complexity, 1, 20_000),
    seed: intParam(source, 'seed', DEFAULTS.seed, 0, Number.MAX_SAFE_INTEGER),
    duration: intParam(source, 'duration', DEFAULTS.duration, 100, 600_000),
    window: source.get('window') === null
      ? undefined
      : intParam(source, 'window', DEFAULTS.duration, 100, 600_000),
    mode: mode === 'demo' ? 'demo' : DEFAULTS.mode,
    repeat: intParam(source, 'repeat', DEFAULTS.repeat, 0, 10_000),
  }
}

/** Builds a bench.html URL from params. Used by the demo panel to reload. */
export function buildUrl(params: BenchParams, base = window.location.pathname): string {
  const search = new URLSearchParams({
    technique: params.technique,
    scene: params.scene,
    complexity: String(params.complexity),
    seed: String(params.seed),
    duration: String(params.duration),
    ...(params.window === undefined ? {} : { window: String(params.window) }),
    mode: params.mode,
    repeat: String(params.repeat),
  })
  return `${base}?${search.toString()}`
}
