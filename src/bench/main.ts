import { loadAdapter, allAdapterMeta } from '../adapters/index.ts'
import { loadScene, availableScenes } from '../scenes/index.ts'
import { specFor } from '../scenes/specs.ts'
import { collectMeta, markReady, runProbe } from '../probe/index.ts'
import { readParams } from './params.ts'

/**
 * Measurement page entry point.
 *
 * Driven entirely by URL parameters. One run equals one page load: the
 * technique is chosen once, at load, and never switched at runtime.
 */
async function main(): Promise<void> {
  const params = readParams()
  const container = document.getElementById('scene')
  if (!container) throw new Error('Missing #scene container')

  const generator = await loadScene(params.scene)
  const scene = generator.build(container, {
    complexity: params.complexity,
    seed: params.seed,
  })

  const spec = specFor(params.scene, params.duration)
  const Adapter = await loadAdapter(params.technique)
  const adapter = new Adapter()
  adapter.init({
    elements: scene.elements,
    root: scene.root,
    spec,
    scene: params.scene,
  })

  const meta = collectMeta({
    technique: params.technique,
    scene: params.scene,
    complexity: params.complexity,
    seed: params.seed,
    duration: params.duration,
    repeat: params.repeat,
  })

  // The panel module is imported only in demo mode, so bench mode never
  // downloads or executes it. It must not exist while measuring.
  const panel =
    params.mode === 'demo'
      ? await import('./panel.ts').then(async (m) =>
          m.createPanel({
            params,
            techniques: await allAdapterMeta(),
            scenes: availableScenes(),
          }),
        )
      : null

  panel?.setStatus('measuring baseline')

  markReady()

  const handle = await runProbe(meta, () => adapter.start())

  if (panel) {
    const { startFpsMeter } = await import('./fps-meter.ts')
    // The baseline is measured inside runProbe, so the achievable rate is known
    // by the time the panel starts reporting against it.
    const budget = handle.baseline.refreshRate || 60
    const meter = startFpsMeter((fps) => {
      panel.setFps(fps, fps / budget)
    })
    panel.setStatus('running')
    window.addEventListener('beforeunload', () => meter.stop(), { once: true })
  }

  // Stagger delays the last element, so the run outlasts the nominal duration.
  const tail = spec.duration + spec.stagger * scene.elements.length
  window.setTimeout(() => {
    adapter.stop()
    handle.finish()
    panel?.setStatus('done')
  }, tail)
}

void main()
