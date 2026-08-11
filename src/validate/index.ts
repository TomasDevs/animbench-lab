import type { SceneId } from '../types/scene.ts'
import type { Trajectory, ValidationReport } from '../types/validation.ts'
import { loadAdapter, REFERENCE_ADAPTER_ID } from '../adapters/index.ts'
import { loadScene } from '../scenes/index.ts'
import { specFor } from '../scenes/specs.ts'
import { readPose } from './sample.ts'
import { compareTrajectories } from './compare.ts'

export { compareTrajectories, estimateLag, TOLERANCE_PX } from './compare.ts'
export { readPose } from './sample.ts'

export type ValidationOptions = {
  scene?: SceneId
  /** Kept small: equivalence is about the path, not about load. */
  complexity?: number
  seed?: number
  duration?: number
  /** Nominal sample times as a fraction of duration. */
  offsets?: number[]
}

const DEFAULT_OFFSETS = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95]

/**
 * Runs one technique and samples the first element's pose at fixed times.
 *
 * Element 0 carries no stagger delay, so its timeline starts with the run and
 * needs no offset correction.
 */
async function traceTechnique(
  container: HTMLElement,
  technique: string,
  options: Required<Omit<ValidationOptions, 'offsets'>> & { offsets: number[] },
): Promise<Trajectory> {
  const generator = await loadScene(options.scene)
  const scene = generator.build(container, {
    complexity: options.complexity,
    seed: options.seed,
  })

  const spec = specFor(options.scene, options.duration)
  const Adapter = await loadAdapter(technique)
  const adapter = new Adapter()
  adapter.init({
    elements: scene.elements,
    root: scene.root,
    spec,
    scene: options.scene,
  })

  const element = scene.elements[0]
  if (!element) throw new Error('Scene produced no elements')

  const samples = []
  const startedAt = performance.now()
  adapter.start()

  for (const offset of options.offsets) {
    const target = offset * options.duration
    const wait = target - (performance.now() - startedAt)
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait))
    // Record the real elapsed time, not the nominal one: a late sample compared
    // against its nominal time would look like a trajectory error.
    samples.push(readPose(element, performance.now() - startedAt))
  }

  adapter.stop()
  adapter.dispose()
  scene.dispose()

  return { technique, samples }
}

/**
 * Validates a technique against the reference implementation.
 *
 * Each technique runs in its own freshly built scene, one after another, so
 * neither run can influence the other's layout or timing.
 */
export async function validateTechnique(
  container: HTMLElement,
  technique: string,
  options: ValidationOptions = {},
): Promise<ValidationReport> {
  const resolved = {
    scene: options.scene ?? ('grid' as SceneId),
    complexity: options.complexity ?? 20,
    seed: options.seed ?? 42,
    duration: options.duration ?? 2000,
    offsets: options.offsets ?? DEFAULT_OFFSETS,
  }

  const reference = await traceTechnique(container, REFERENCE_ADAPTER_ID, resolved)
  const candidate = await traceTechnique(container, technique, resolved)
  const spec = specFor(resolved.scene, resolved.duration)

  return compareTrajectories(spec, reference, candidate)
}
