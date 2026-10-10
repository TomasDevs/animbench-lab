import '../style.css'
import './validate.css'
import { applyTheme, readTheme, themeToggle } from '../theme.ts'
import { applyLang, carry, decimal, langToggle, readLang, techniqueName, toggleClass, type Lang } from '../i18n.ts'
import { validateTechnique, TOLERANCE_PX } from './index.ts'
import { loadAdapter, availableAdapters, REFERENCE_ADAPTER_ID, SEPARATE_REGIME_IDS } from '../adapters/index.ts'
import { availableScenes } from '../scenes/index.ts'
import type { SceneId } from '../types/scene.ts'
import type { ValidationReport } from '../types/validation.ts'

/**
 * Equivalence check page. Never measured: every technique is sampled at the
 * same nominal times and compared against the requestAnimationFrame reference.
 *
 * Validation runs once per page load. The toggles only re-render the page from
 * the stored reports, so switching language never restarts it.
 */

/** label is the adapter's own English name; it is translated only for display. */
type Row = ValidationReport & { scene: SceneId; label: string }

declare global {
  interface Window {
    __validation?: Row[]
    __validationDone?: boolean
  }
}

const STRINGS = {
  en: {
    title: 'animbench-lab equivalence check',
    crumb: 'Equivalence check',
    lead: 'Every technique is sampled at the same moments and compared against the requestAnimationFrame reference. A constant delay is reported apart from a real difference in path: a technique may follow the same path one frame later without animating anything different.',
    running: (technique: string, scene: string) => `Checking ${technique} on ${scene}…`,
    allPass: (n: number) => `All ${n} technique and scene pairs follow the reference.`,
    someFail: (failed: number, n: number) => `${failed} of ${n} pairs diverge from the reference.`,
    columns: ['Technique', 'Scene', 'Max deviation', 'Delay', 'After delay', 'Opacity', 'Verdict'],
    pass: 'equivalent',
    fail: 'diverges',
    legend: (tolerance: string) => `Deviations are in pixels at the sampled moments. A pair is equivalent when, once the delay is removed, the path stays within ${tolerance} px of the reference.`,
    raw: 'Raw report',
    theme: { light: 'Switch to light theme', dark: 'Switch to dark theme' },
  },
  cs: {
    title: 'animbench-lab kontrola shody',
    crumb: 'Kontrola shody',
    lead: 'Každá technika se vzorkuje ve stejných okamžicích a porovná s referencí requestAnimationFrame. Stálé zpoždění se uvádí odděleně od skutečného rozdílu dráhy: technika může jet po stejné dráze o snímek později, aniž by animovala něco jiného.',
    running: (technique: string, scene: string) => `Kontroluji ${technique} ve scéně ${scene}…`,
    allPass: (n: number) => `Všech ${n} dvojic techniky a scény sleduje referenci.`,
    someFail: (failed: number, n: number) => `${failed} z ${n} dvojic se od reference odchyluje.`,
    columns: ['Technika', 'Scéna', 'Max. odchylka', 'Zpoždění', 'Po odečtení', 'Průhlednost', 'Výsledek'],
    pass: 'shodná',
    fail: 'liší se',
    legend: (tolerance: string) => `Odchylky jsou v pixelech ve vzorkovaných okamžicích. Dvojice je shodná, když po odečtení zpoždění dráha nevybočí z reference o víc než ${tolerance} px.`,
    raw: 'Surový report',
    theme: { light: 'Přepnout na světlý motiv', dark: 'Přepnout na tmavý motiv' },
  },
} satisfies Record<Lang, unknown>

const sceneName = (id: string): string => id.charAt(0).toUpperCase() + id.slice(1)

const state: { rows: Row[]; current: { technique: string; scene: string } | null; done: boolean } = {
  rows: [],
  current: null,
  done: false,
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

function resultsTable(lang: Lang): HTMLElement {
  const t = STRINGS[lang]
  const wrap = el('div', 'table-wrap')
  const table = el('table', 'results-table')
  const head = el('tr')
  t.columns.forEach((h, i) => {
    // Technique, scene and verdict hold text; the rest are numbers.
    head.append(el('th', i >= 2 && i <= 5 ? 'num' : undefined, h))
  })
  table.append(el('thead'))
  table.tHead?.append(head)

  const body = el('tbody')
  for (const r of state.rows) {
    const row = el('tr', r.equivalent ? undefined : 'is-fail')
    const verdict = el('td', r.equivalent ? 'verdict verdict--pass' : 'verdict verdict--fail')
    // The mark carries the verdict as well as the word, never color alone.
    verdict.append(el('span', 'verdict__mark', r.equivalent ? '✓' : '✗'), document.createTextNode(r.equivalent ? t.pass : t.fail))
    row.append(
      el('td', undefined, techniqueName(r.technique, r.label, lang)),
      el('td', 'muted', sceneName(r.scene)),
      el('td', 'num', `${decimal(r.maxDeltaPx, 2, lang)} px`),
      el('td', 'num muted', `${decimal(r.estimatedLagMs, 1, lang)} ms`),
      el('td', 'num', `${decimal(r.maxDeltaLagCorrectedPx, 3, lang)} px`),
      el('td', 'num muted', decimal(r.maxOpacityDelta, 3, lang)),
      verdict,
    )
    body.append(row)
  }
  table.append(body)
  wrap.append(table)
  return wrap
}

function render(): void {
  const app = document.querySelector<HTMLDivElement>('#app')
  if (!app) return
  const lang = readLang()
  const t = STRINGS[lang]
  document.title = t.title
  const page = document.createDocumentFragment()

  const header = el('header', 'masthead')
  const row = el('div', 'masthead__row')
  const title = el('h1')
  const home = el('a', 'crumb', 'animbench-lab')
  home.href = carry(import.meta.env.BASE_URL)
  title.append(home, document.createTextNode(` / ${t.crumb}`))
  const toggles = el('div', 'masthead__toggles')
  toggles.append(langToggle(rerender), themeToggle(rerender, t.theme, readTheme()))
  row.append(title, toggles)
  header.append(row, el('p', 'lead', t.lead))
  page.append(header)

  const section = el('section', 'block')
  const failed = state.rows.filter((r) => !r.equivalent).length
  const status = el('p', state.done ? (failed ? 'status status--fail' : 'status status--pass') : 'status muted')
  status.setAttribute('role', 'status')
  status.textContent = !state.done
    ? t.running(state.current?.technique ?? '…', state.current?.scene ?? '…')
    : failed
      ? t.someFail(failed, state.rows.length)
      : t.allPass(state.rows.length)
  section.append(status)

  if (state.rows.length) section.append(resultsTable(lang))

  if (state.done) {
    section.append(el('p', 'muted block__lead legend', t.legend(decimal(TOLERANCE_PX, 1, lang))))
    const details = el('details', 'raw')
    details.append(el('summary', undefined, t.raw))
    const pre = el('pre')
    pre.append(el('code', undefined, JSON.stringify(state.rows, null, 2)))
    details.append(pre)
    section.append(details)
  }
  page.append(section)
  app.replaceChildren(page)
}

/** Toggles rewrite the URL and call this, so every link is rebuilt from it. */
function rerender(): void {
  const focused = toggleClass(document.activeElement)
  // An open raw report stays open across a language switch.
  const rawOpen = document.querySelector<HTMLDetailsElement>('details.raw')?.open ?? false
  render()
  const raw = document.querySelector<HTMLDetailsElement>('details.raw')
  if (raw) raw.open = rawOpen
  if (focused) document.querySelector<HTMLElement>(`.${focused}`)?.focus()
}

async function run(): Promise<void> {
  const stage = document.getElementById('stage')
  if (!stage) throw new Error('Missing #stage container')

  // Separate-regime techniques have no reference on their scene, so
  // trajectory equivalence is not defined for them.
  const candidates = availableAdapters().filter(
    (id) => id !== REFERENCE_ADAPTER_ID && !SEPARATE_REGIME_IDS.includes(id),
  )
  const scenes = availableScenes()

  for (const technique of candidates) {
    const { meta } = await loadAdapter(technique)
    for (const scene of scenes.filter((s) => meta.scenes.includes(s))) {
      state.current = { technique: techniqueName(meta.id, meta.label), scene: sceneName(scene) }
      render()
      const report = await validateTechnique(stage, technique, { scene })
      state.rows.push({ ...report, scene, label: meta.label })
    }
  }

  state.done = true
  render()
  window.__validation = state.rows
  window.__validationDone = true
}

applyTheme(readTheme())
applyLang(readLang())
render()
void run()
