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

  // Imported only in demo mode, so bench mode never downloads or executes it.
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

  // Stagger delays the last element, so the run outlasts the nominal duration.
  const runDurationMs = spec.duration + spec.stagger * scene.elements.length

  const handle = await runProbe(meta, () => adapter.start(), { runDurationMs })

  let meter: { stop(): void } | null = null

  if (panel) {
    const { startFpsMeter } = await import('./fps-meter.ts')
    const budget = handle.baseline.refreshRate || 60
    let worst = Infinity
    meter = startFpsMeter((fps) => {
      worst = Math.min(worst, fps)
      panel.setFps(fps, fps / budget, worst)
    })
    panel.setStatus('running')
    window.addEventListener('beforeunload', () => meter?.stop(), { once: true })
  }

  window.setTimeout(() => {
    // Collection must end before teardown: the CSS adapter's stop() forces a
    // style recalculation that would otherwise be recorded as a long frame.
    handle.finish()
    adapter.stop()
    // An idle page reports a healthy frame rate that belongs to nothing.
    meter?.stop()
    panel?.setStatus('done — readout frozen')
  }, runDurationMs)
}

// A failed run must set __benchDone, or a polling harness waits forever.
void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  window.__benchError = message
  window.__benchDone = true
  console.error('[animbench] run failed:', error)
})
