import type { BenchParams } from './params.ts'
import { buildUrl } from './params.ts'
import type { SceneId } from '../types/scene.ts'

/**
 * Demo mode control panel.
 *
 * This module is only ever imported in demo mode, so in bench mode its code is
 * never downloaded, parsed or executed. Switching a control reloads the page
 * with new parameters: one measurement run equals one page load, and the
 * technique is never swapped at runtime.
 *
 * The panel is rendered outside the scene container so it cannot affect the
 * scene's layout.
 */

const COMPLEXITY_STEPS = [50, 100, 250, 500, 1000, 2000, 4000]

export type PanelOptions = {
  params: BenchParams
  techniques: { id: string; label: string }[]
  scenes: SceneId[]
}

export type Panel = {
  /**
   * Updates the live frame rate readout.
   *
   * @param worst Lowest sample seen so far. The current value returns to the
   * display rate as soon as the page goes idle, so the worst sample is what
   * actually characterises the run.
   */
  setFps(fps: number, ratio: number, worst?: number): void
  setStatus(text: string): void
  dispose(): void
}

function styles(): HTMLStyleElement {
  const style = document.createElement('style')
  style.textContent = `
.demo-panel {
  position: fixed;
  top: 12px;
  left: 12px;
  z-index: 9999;
  display: grid;
  gap: 8px;
  padding: 12px;
  border-radius: 6px;
  background: rgba(17, 17, 17, 0.88);
  color: #f5f5f5;
  font: 12px/1.4 system-ui, sans-serif;
  min-width: 210px;
}
.demo-panel label { display: grid; gap: 3px; }
.demo-panel select {
  font: inherit;
  padding: 3px 4px;
  color: inherit;
  background: #2a2a2a;
  border: 1px solid #454545;
  border-radius: 3px;
}
.demo-panel__readout {
  display: flex;
  justify-content: space-between;
  padding-top: 6px;
  border-top: 1px solid #3a3a3a;
  font-variant-numeric: tabular-nums;
}
.demo-panel__fps { font-size: 18px; font-weight: 600; }
.demo-panel__status { color: #9a9a9a; }
`
  return style
}

function option(value: string, label: string, selected: boolean): HTMLOptionElement {
  const el = document.createElement('option')
  el.value = value
  el.textContent = label
  el.selected = selected
  return el
}

function field(labelText: string, select: HTMLSelectElement): HTMLLabelElement {
  const label = document.createElement('label')
  const span = document.createElement('span')
  span.textContent = labelText
  label.append(span, select)
  return label
}

export function createPanel(options: PanelOptions): Panel {
  const { params, techniques, scenes } = options

  const style = styles()
  document.head.append(style)

  const root = document.createElement('aside')
  root.className = 'demo-panel'

  const reload = (changes: Partial<BenchParams>): void => {
    window.location.href = buildUrl({ ...params, ...changes })
  }

  const techniqueSelect = document.createElement('select')
  for (const t of techniques) {
    techniqueSelect.append(option(t.id, t.label, t.id === params.technique))
  }
  techniqueSelect.addEventListener('change', () => {
    reload({ technique: techniqueSelect.value })
  })

  const sceneSelect = document.createElement('select')
  for (const s of scenes) {
    sceneSelect.append(option(s, s, s === params.scene))
  }
  sceneSelect.addEventListener('change', () => {
    reload({ scene: sceneSelect.value as SceneId })
  })

  const complexitySelect = document.createElement('select')
  // Include the current value even when it is not one of the steps, so an
  // unusual complexity from the URL is not silently changed.
  const steps = COMPLEXITY_STEPS.includes(params.complexity)
    ? COMPLEXITY_STEPS
    : [...COMPLEXITY_STEPS, params.complexity].sort((a, b) => a - b)
  for (const n of steps) {
    complexitySelect.append(option(String(n), String(n), n === params.complexity))
  }
  complexitySelect.addEventListener('change', () => {
    reload({ complexity: Number.parseInt(complexitySelect.value, 10) })
  })

  const readout = document.createElement('div')
  readout.className = 'demo-panel__readout'
  const fpsEl = document.createElement('span')
  fpsEl.className = 'demo-panel__fps'
  fpsEl.textContent = '--'
  const ratioEl = document.createElement('span')
  ratioEl.className = 'demo-panel__status'
  readout.append(fpsEl, ratioEl)

  const worstEl = document.createElement('div')
  worstEl.className = 'demo-panel__status'

  const statusEl = document.createElement('div')
  statusEl.className = 'demo-panel__status'

  root.append(
    field('technique', techniqueSelect),
    field('scene', sceneSelect),
    field('complexity', complexitySelect),
    readout,
    worstEl,
    statusEl,
  )
  document.body.append(root)

  return {
    setFps(fps, ratio, worst) {
      fpsEl.textContent = `${fps.toFixed(1)} fps`
      ratioEl.textContent = `${Math.round(ratio * 100)}% of budget`
      if (worst !== undefined && Number.isFinite(worst)) {
        worstEl.textContent = `worst ${worst.toFixed(1)} fps`
      }
    },
    setStatus(text) {
      statusEl.textContent = text
    },
    dispose() {
      root.remove()
      style.remove()
    },
  }
}
