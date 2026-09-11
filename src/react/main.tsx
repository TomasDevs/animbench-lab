import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ReactMotionScene, type SceneItem } from './ReactMotionScene.tsx'
import { createRandom } from '../scenes/random.ts'
import { specFor } from '../scenes/specs.ts'
import { collectMeta, markReady, prepareProbe } from '../probe/index.ts'
import { steadyStateFor } from '../probe/steady-state.ts'
import { readParams } from '../bench/params.ts'

/**
 * React Motion entry point.
 *
 * Exposes the same contract as bench.html, so the tool measures it exactly like
 * any other run. The comparison against the vanilla Motion adapter isolates what
 * the framework itself costs.
 *
 * StrictMode is off on purpose: it double-invokes effects in development, which
 * would start the run twice.
 */

const HUE_MIN = 200
const HUE_MAX = 280

function columnsFor(count: number, width: number, height: number): number {
  if (count <= 1) return 1
  const aspect = width / Math.max(height, 1)
  return Math.min(count, Math.max(1, Math.round(Math.sqrt(count * aspect))))
}

/** Same generator and seed as the vanilla grid scene, so the layout matches. */
function buildItems(complexity: number, seed: number): SceneItem[] {
  const random = createRandom(seed)
  const items: SceneItem[] = []
  for (let i = 0; i < complexity; i++) {
    const hue = random.range(HUE_MIN, HUE_MAX)
    const lightness = random.range(45, 65)
    items.push({ fill: `hsl(${hue.toFixed(1)} 70% ${lightness.toFixed(1)}%)` })
  }
  return items
}

function App() {
  const params = readParams()
  const [play, setPlay] = useState(false)

  const items = buildItems(params.complexity, params.seed)
  const cols = columnsFor(items.length, window.innerWidth, window.innerHeight)
  const rows = Math.ceil(items.length / cols)

  const baseSpec = specFor('grid')
  const duration =
    params.window === undefined
      ? params.duration
      : params.window + baseSpec.stagger * Math.max(0, items.length - 1)
  const spec = specFor('grid', duration)

  useEffect(() => {
    let cancelled = false

    const prepare = async (): Promise<void> => {
      const steady = steadyStateFor(spec, items.length)
      const meta = collectMeta({
        technique: 'react-motion',
        scene: 'grid',
        complexity: params.complexity,
        seed: params.seed,
        duration,
        repeat: params.repeat,
        concurrentElements: steady.concurrentElements,
      })

      const runDurationMs = spec.duration + spec.stagger * items.length
      // React has to render the scene before anything is measured, so the probe
      // is prepared only after the first paint.
      const handle = await prepareProbe(meta, () => setPlay(true), { runDurationMs })
      if (cancelled) return

      window.__benchStart = async () => {
        const runStart = performance.now()
        handle.begin()
        meta.steadyStateFromMs = runStart + steady.fromMs
        meta.steadyStateToMs = runStart + steady.toMs

        await new Promise<void>((resolve) => {
          window.setTimeout(() => {
            handle.finish()
            resolve()
          }, runDurationMs)
        })
        window.__benchDone = true
      }

      markReady()
    }

    void prepare().catch((error: unknown) => {
      window.__benchError = {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      }
      window.__benchDone = true
    })

    return () => {
      cancelled = true
    }
    // Runs once: one measurement run equals one page load.
  }, [])

  return (
    <ReactMotionScene
      items={items}
      spec={spec}
      cols={cols}
      rows={rows}
      gap={params.complexity > 500 ? '2px' : '6px'}
      play={play}
    />
  )
}

const container = document.getElementById('scene')
if (container) createRoot(container).render(<App />)
