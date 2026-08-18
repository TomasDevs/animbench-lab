import { loadAdapter, allAdapterMeta } from '../adapters/index.ts'
import { loadScene, availableScenes } from '../scenes/index.ts'
import { specFor } from '../scenes/specs.ts'
import { collectMeta, markReady, prepareProbe } from '../probe/index.ts'
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

  // Stagger delays the last element, so the run outlasts the nominal duration.
  const runDurationMs = spec.duration + spec.stagger * scene.elements.length

  const handle = await prepareProbe(meta, () => adapter.start(), { runDurationMs })

  let meter: { stop(): void } | null = null

  const startMeter = (): void => {
    if (!panel) return
    void import('./fps-meter.ts').then(({ startFpsMeter }) => {
      const budget = handle.baseline.refreshRateHz || 60
      let worst = Infinity
      meter = startFpsMeter((fps) => {
        worst = Math.min(worst, fps)
        panel.setFps(fps, fps / budget, worst)
      })
      window.addEventListener('beforeunload', () => meter?.stop(), { once: true })
    })
  }

  const runOnce = (): Promise<void> =>
    new Promise((resolve) => {
      handle.begin()
      startMeter()
      panel?.setStatus('running')

      window.setTimeout(() => {
        // Collection must end before teardown: the CSS adapter's stop() forces a
        // style recalculation that would otherwise be recorded as a long frame.
        handle.finish()
        adapter.stop()
        // An idle page reports a healthy frame rate that belongs to nothing.
        meter?.stop()
        panel?.setStatus('done — readout frozen')
        resolve()
      }, runDurationMs)
    })

  // The tool calls this to start the run, so building the scene is not recorded
  // as part of it. It discards the returned promise and watches __benchDone, so
  // __benchDone must not be set before __benchResult is complete.
  window.__benchStart = async () => {
    try {
      await runOnce()
    } catch (error) {
      reportError(error)
    }
    window.__benchDone = true
  }

  // Last, so the tool never sees a ready page without a way to start it.
  markReady()

  // Demo mode has no tool to press the button.
  if (params.mode === 'demo') void window.__benchStart()
}

function reportError(error: unknown): void {
  window.__benchError = {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  }
  console.error('[animbench] run failed:', error)
}

// A failed run must set __benchDone, or a polling harness waits forever.
void main().catch((error: unknown) => {
  reportError(error)
  window.__benchDone = true
})
