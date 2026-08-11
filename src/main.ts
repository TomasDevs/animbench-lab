import './style.css'
import { allAdapterMeta } from './adapters/index.ts'
import { availableScenes } from './scenes/index.ts'
import { buildUrl } from './bench/params.ts'
import type { SceneId } from './types/scene.ts'

/**
 * Landing page. Never measured: it exists so a human can reach the measurement
 * page without hand-writing URL parameters.
 *
 * Links are built from the adapter and scene registries rather than hardcoded,
 * so a technique that is not implemented yet cannot be linked to.
 */

const COMPLEXITY_STEPS = [100, 500, 2000, 4000]
const BENCH_PAGE = import.meta.env.BASE_URL + 'bench.html'
const VALIDATE_PAGE = import.meta.env.BASE_URL + 'validate.html'

function demoUrl(technique: string, scene: SceneId, complexity: number): string {
  return buildUrl(
    {
      technique,
      scene,
      complexity,
      seed: 42,
      duration: 10_000,
      // Demo mode from the landing page: a human clicking a link wants to see
      // the animation and the readout. Measurement runs are started by the CLI
      // with mode=bench, where the panel must not exist.
      mode: 'demo',
      repeat: 0,
    },
    BENCH_PAGE,
  )
}

function link(href: string, text: string): HTMLAnchorElement {
  const a = document.createElement('a')
  a.href = href
  a.textContent = text
  return a
}

async function render(): Promise<void> {
  const app = document.querySelector<HTMLDivElement>('#app')
  if (!app) return

  const techniques = await allAdapterMeta()
  const scenes = availableScenes()

  const heading = document.createElement('h1')
  heading.textContent = 'animbench-lab'

  const lead = document.createElement('p')
  lead.textContent =
    'Demo app with animation scenes for benchmarking web animation techniques.'

  const note = document.createElement('p')
  note.className = 'note'
  note.textContent =
    'Opening bench.html without parameters renders the scene alone, with no control panel. That is intentional: the panel would run its own frame counter and pollute the measurement, so it only appears with mode=demo. The links below open demo mode.'

  app.append(heading, lead, note)

  for (const scene of scenes) {
    const section = document.createElement('section')
    const title = document.createElement('h2')
    title.textContent = `Scene: ${scene}`
    section.append(title)

    const table = document.createElement('table')
    const head = document.createElement('tr')
    head.append(cell('th', 'technique'))
    for (const n of COMPLEXITY_STEPS) head.append(cell('th', String(n)))
    table.append(head)

    for (const technique of techniques) {
      const row = document.createElement('tr')
      row.append(cell('td', technique.label))
      for (const n of COMPLEXITY_STEPS) {
        const td = document.createElement('td')
        td.append(link(demoUrl(technique.id, scene, n), `run`))
        row.append(td)
      }
      table.append(row)
    }
    section.append(table)
    app.append(section)
  }

  const tools = document.createElement('section')
  const toolsTitle = document.createElement('h2')
  toolsTitle.textContent = 'Equivalence check'
  const toolsText = document.createElement('p')
  const code = document.createElement('code')
  code.textContent = 'requestAnimationFrame'
  toolsText.append(
    'Every technique is compared against the ',
    code,
    ' reference before any measurement is trusted. ',
    link(VALIDATE_PAGE, 'Run the check'),
  )
  tools.append(toolsTitle, toolsText)
  app.append(tools)
}

function cell(tag: 'th' | 'td', text: string): HTMLElement {
  const el = document.createElement(tag)
  el.textContent = text
  return el
}

void render()
