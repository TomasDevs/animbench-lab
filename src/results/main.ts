import '../style.css'
import './results.css'
import { applyTheme, readTheme, themeToggle, withTheme } from '../theme.ts'
// The dataset is chosen here, in one place. Switching to the final measurement
// means pointing this import at analysis/output/final/summary.json.
import summary from '../../analysis/output/pilot/summary.json'

/**
 * Results page. Never measured: it reads the summary the analysis script writes
 * and draws it.
 *
 * The data tell one story: one technique falls away at high load while the
 * rest stay on the display ceiling. The charts therefore use emphasis rather
 * than six categorical hues: CSS transitions in the accent, the other five in a
 * recessive gray. Every value is also in the table, so nothing depends on
 * hover or on telling colors apart.
 */

type Combination = {
  scene: string
  complexity: number
  technique: string
  runs: number
  refreshRatio: number
  refreshRatioMin: number
  refreshRatioMax: number
  overBudget: number
  p1Fps: number
  meanFps: number
  maxIntervalMs: number
  runRefreshRatios: number[]
  buckets: number[]
  differsFrom: number
  equivalentTo: number
  compared: number
}

type Summary = {
  dataset: string
  devices: string[]
  displays: string[]
  browsers: string[]
  firstDay: string
  lastDay: string
  validRuns: number
  equivalenceMargin: number | null
  combinations: Combination[]
}

// Typed against the shape analyze.py writes; a mismatch fails the type check.
const data: Summary = summary

const FOCUS = 'css-transition'
const REFERENCE = 'raf'
const SCENES = ['grid', 'composite'] as const
const LABELS: Record<string, string> = {
  raf: 'requestAnimationFrame',
  'css-transition': 'CSS transitions',
  'css-keyframes': 'CSS keyframes',
  waapi: 'Web Animations API',
  gsap: 'GSAP',
  motion: 'Motion',
  'scroll-driven': 'Scroll-driven',
}
const BUCKET_LABELS = ['1', '2', '3', '4', '5+']
const SVG = 'http://www.w3.org/2000/svg'

const label = (id: string): string => LABELS[id] ?? id
/** Scene ids are lowercase identifiers; technique names keep their own case. */
const sceneName = (id: string): string => id.charAt(0).toUpperCase() + id.slice(1)
const SCENE_ORDER = ['grid', 'composite', 'parallax']
const percent = (v: number, digits = 0): string => `${(v * 100).toFixed(digits)} %`
const ratio = (v: number): string => v.toFixed(3)

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

function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number> = {},
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG, tag)
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value))
  return node
}

function combos(scene: string, complexity?: number): Combination[] {
  return data.combinations.filter(
    (c) => c.scene === scene && (complexity === undefined || c.complexity === complexity),
  )
}

// Tooltip ------------------------------------------------------------------

const tooltip = el('div', 'viz-tooltip')
tooltip.setAttribute('role', 'status')
tooltip.hidden = true

/** Rows are [value, label, emphasised]; the value leads, as the reader wants it. */
function showTooltip(anchor: Element, title: string, rows: [string, string, boolean][]): void {
  tooltip.replaceChildren(el('div', 'viz-tooltip__title', title))
  for (const [value, name, emphasised] of rows) {
    const row = el('div', 'viz-tooltip__row')
    const key = el('span', emphasised ? 'viz-key viz-key--focus' : 'viz-key viz-key--muted')
    row.append(key, el('strong', undefined, value), el('span', 'muted', name))
    tooltip.append(row)
  }
  tooltip.hidden = false
  const box = anchor.getBoundingClientRect()
  const tip = tooltip.getBoundingClientRect()
  const left = Math.min(window.innerWidth - tip.width - 8, Math.max(8, box.left + box.width / 2 - tip.width / 2))
  tooltip.style.left = `${left + window.scrollX}px`
  tooltip.style.top = `${box.top + window.scrollY - tip.height - 8}px`
}

function hideTooltip(): void {
  tooltip.hidden = true
}

// Chart 1: refresh ratio by complexity ---------------------------------------

const RATIO_W = 320
const RATIO_H = 210
const PAD = { top: 16, right: 74, bottom: 30, left: 38 }

function ratioChart(scene: string): HTMLElement {
  const figure = el('figure', 'viz')
  const caption = el('figcaption', 'viz__title')
  caption.append(el('span', undefined, sceneName(scene)))
  figure.append(caption)

  const rows = combos(scene)
  const complexities = [...new Set(rows.map((c) => c.complexity))].sort((a, b) => a - b)
  const techniques = [...new Set(rows.map((c) => c.technique))]
  // The focus series is drawn last so it sits on top of the gray ones.
  techniques.sort((a, b) => Number(a === FOCUS) - Number(b === FOCUS))

  const plotW = RATIO_W - PAD.left - PAD.right
  const plotH = RATIO_H - PAD.top - PAD.bottom
  // Ordinal positions: the three levels are a design choice, not a continuum.
  const x = (i: number): number => PAD.left + (complexities.length === 1 ? plotW / 2 : (i / (complexities.length - 1)) * plotW)
  const y = (v: number): number => PAD.top + (1 - v) * plotH

  const root = svg('svg', { viewBox: `0 0 ${RATIO_W} ${RATIO_H}`, class: 'viz__svg', role: 'img' })
  root.setAttribute('aria-label', `Refresh ratio by complexity on the ${scene} scene`)

  for (const tick of [0, 0.25, 0.5, 0.75, 1]) {
    root.append(svg('line', { x1: PAD.left, x2: PAD.left + plotW, y1: y(tick), y2: y(tick), class: tick === 0 ? 'viz-axis' : 'viz-grid' }))
    const text = svg('text', { x: PAD.left - 6, y: y(tick), class: 'viz-tick', 'text-anchor': 'end', 'dominant-baseline': 'middle' })
    text.textContent = tick.toFixed(2)
    root.append(text)
  }
  complexities.forEach((c, i) => {
    const text = svg('text', { x: x(i), y: RATIO_H - 10, class: 'viz-tick', 'text-anchor': 'middle' })
    text.textContent = String(c)
    root.append(text)
  })

  for (const technique of techniques) {
    const focus = technique === FOCUS
    const points = complexities.map((c, i) => {
      const combo = rows.find((r) => r.technique === technique && r.complexity === c)
      return combo ? ([x(i), y(combo.refreshRatio)] as [number, number]) : null
    }).filter((p): p is [number, number] => p !== null)
    root.append(svg('polyline', {
      points: points.map((p) => p.join(',')).join(' '),
      class: focus ? 'viz-line viz-line--focus' : 'viz-line viz-line--muted',
    }))
    for (const [px, py] of points) {
      root.append(svg('circle', { cx: px, cy: py, r: 4, class: focus ? 'viz-dot viz-dot--focus' : 'viz-dot viz-dot--muted' }))
    }
  }

  // Direct labels at the right edge: the focus series and the group.
  const last = complexities.at(-1)
  const lastFocus = rows.find((r) => r.technique === FOCUS && r.complexity === last)
  const others = rows.filter((r) => r.technique !== FOCUS && r.complexity === last)
  const endX = x(complexities.length - 1) + 9
  if (lastFocus) {
    const t = svg('text', { x: endX, y: y(lastFocus.refreshRatio), class: 'viz-label', 'dominant-baseline': 'middle' })
    t.textContent = ratio(lastFocus.refreshRatio)
    root.append(t)
  }
  if (others.length) {
    const low = Math.min(...others.map((o) => o.refreshRatio))
    const t = svg('text', { x: endX, y: y(1), class: 'viz-label viz-label--muted', 'dominant-baseline': 'middle' })
    t.textContent = `≥ ${ratio(low)}`
    root.append(t)
  }

  // Crosshair and one hit band per complexity, keyboard reachable.
  const crosshair = svg('line', { y1: PAD.top, y2: PAD.top + plotH, class: 'viz-crosshair', visibility: 'hidden' })
  root.append(crosshair)
  complexities.forEach((c, i) => {
    const half = complexities.length > 1 ? plotW / (complexities.length - 1) / 2 : plotW / 2
    const band = svg('rect', {
      x: x(i) - half, y: PAD.top, width: half * 2, height: plotH,
      class: 'viz-hit', tabindex: 0,
    })
    band.setAttribute('aria-label', `${c} elements`)
    const show = (): void => {
      crosshair.setAttribute('x1', String(x(i)))
      crosshair.setAttribute('x2', String(x(i)))
      crosshair.setAttribute('visibility', 'visible')
      const list = rows.filter((r) => r.complexity === c).sort((a, b) => a.refreshRatio - b.refreshRatio)
      showTooltip(band, `${sceneName(scene)}, ${c} elements`,
        list.map((r) => [ratio(r.refreshRatio), label(r.technique), r.technique === FOCUS]))
    }
    const hide = (): void => {
      crosshair.setAttribute('visibility', 'hidden')
      hideTooltip()
    }
    band.addEventListener('pointerenter', show)
    band.addEventListener('pointerleave', hide)
    band.addEventListener('focus', show)
    band.addEventListener('blur', hide)
    root.append(band)
  })

  figure.append(root)
  return figure
}

// Chart 2: frame length distribution ------------------------------------------

const BUCKET_W = 160
const BUCKET_H = 150
const BPAD = { top: 18, right: 8, bottom: 30, left: 34 }

function bucketChart(scene: string, technique: string, complexity: number): HTMLElement {
  const figure = el('figure', 'viz viz--small')
  const caption = el('figcaption', 'viz__title')
  caption.append(el('span', undefined, label(technique)), el('span', undefined, sceneName(scene)))
  figure.append(caption)
  const combo = combos(scene, complexity).find((c) => c.technique === technique)
  if (!combo) return figure

  const focus = technique === FOCUS
  const plotW = BUCKET_W - BPAD.left - BPAD.right
  const plotH = BUCKET_H - BPAD.top - BPAD.bottom
  const slot = plotW / BUCKET_LABELS.length
  const barW = Math.min(18, slot - 6)
  const y = (v: number): number => BPAD.top + (1 - v) * plotH

  const root = svg('svg', { viewBox: `0 0 ${BUCKET_W} ${BUCKET_H}`, class: 'viz__svg', role: 'img' })
  root.setAttribute('aria-label', `Share of frames by length in frame budgets, ${label(technique)} on ${scene}`)

  for (const tick of [0, 0.5, 1]) {
    root.append(svg('line', { x1: BPAD.left, x2: BPAD.left + plotW, y1: y(tick), y2: y(tick), class: tick === 0 ? 'viz-axis' : 'viz-grid' }))
    const text = svg('text', { x: BPAD.left - 5, y: y(tick), class: 'viz-tick', 'text-anchor': 'end', 'dominant-baseline': 'middle' })
    text.textContent = percent(tick)
    root.append(text)
  }

  combo.buckets.forEach((share, i) => {
    const cx = BPAD.left + slot * i + slot / 2
    const h = share * plotH
    const label_ = svg('text', { x: cx, y: BUCKET_H - 10, class: 'viz-tick', 'text-anchor': 'middle' })
    label_.textContent = BUCKET_LABELS[i] ?? ''
    root.append(label_)
    if (h > 0.5) {
      // Rounded data end, square at the baseline.
      const r = Math.min(4, h, barW / 2)
      const left = cx - barW / 2
      const top = y(share)
      const base = y(0)
      root.append(svg('path', {
        d: `M${left},${base} V${top + r} Q${left},${top} ${left + r},${top} H${left + barW - r} Q${left + barW},${top} ${left + barW},${top + r} V${base} Z`,
        class: focus ? 'viz-bar viz-bar--focus' : 'viz-bar viz-bar--muted',
      }))
    }
    // Value on the cap only where it matters: the buckets that hold frames.
    if (share >= 0.05) {
      const t = svg('text', { x: cx, y: y(share) - 4, class: 'viz-label viz-label--small', 'text-anchor': 'middle' })
      t.textContent = percent(share)
      root.append(t)
    }
    const hit = svg('rect', { x: cx - slot / 2, y: BPAD.top, width: slot, height: plotH, class: 'viz-hit', tabindex: 0 })
    hit.setAttribute('aria-label', `${BUCKET_LABELS[i]} frame budgets: ${percent(share, 1)}`)
    const show = (): void => showTooltip(hit, `${BUCKET_LABELS[i]} × frame budget`,
      [[percent(share, 1), `of frames, ${label(technique)}`, focus]])
    hit.addEventListener('pointerenter', show)
    hit.addEventListener('pointerleave', hideTooltip)
    hit.addEventListener('focus', show)
    hit.addEventListener('blur', hideTooltip)
    root.append(hit)
  })

  figure.append(root)
  return figure
}

// Table ------------------------------------------------------------------------

function verdict(c: Combination): string {
  if (c.compared === 0) return '–'
  const parts = []
  if (c.differsFrom) parts.push(`differs from ${c.differsFrom} of ${c.compared}`)
  if (c.equivalentTo) parts.push(`equivalent to ${c.equivalentTo} of ${c.compared}`)
  return parts.length ? parts.join(', ') : 'undecided'
}

function resultsTable(): HTMLElement {
  const wrap = el('div', 'table-wrap')
  const table = el('table', 'results-table')
  const head = el('tr')
  const columns: [string, boolean][] = [
    ['Technique', false], ['Refresh ratio', true], ['Range', true],
    ['Over budget', true], ['1st pct', true], ['Against the others', false],
  ]
  for (const [h, numeric] of columns) head.append(el('th', numeric ? 'num' : undefined, h))
  table.append(el('thead'))
  table.tHead?.append(head)
  const body = el('tbody')

  const scenes = [...new Set(data.combinations.map((c) => c.scene))]
    .sort((a, b) => SCENE_ORDER.indexOf(a) - SCENE_ORDER.indexOf(b))
  for (const scene of scenes) {
    const complexities = [...new Set(combos(scene).map((c) => c.complexity))].sort((a, b) => a - b)
    for (const complexity of complexities) {
      const group = el('tr', 'results-table__group')
      const cell = el('th', undefined, `${sceneName(scene)} · ${complexity} elements`)
      cell.colSpan = 6
      cell.scope = 'colgroup'
      group.append(cell)
      body.append(group)

      for (const c of combos(scene, complexity).sort((a, b) => a.refreshRatio - b.refreshRatio)) {
        const row = el('tr', c.technique === FOCUS ? 'is-focus' : undefined)
        row.append(
          el('td', undefined, label(c.technique)),
          el('td', 'num', ratio(c.refreshRatio)),
          el('td', 'num muted', `${ratio(c.refreshRatioMin)}–${ratio(c.refreshRatioMax)}`),
          el('td', 'num', percent(c.overBudget, 1)),
          el('td', 'num', `${c.p1Fps.toFixed(1)} fps`),
          el('td', 'muted', verdict(c)),
        )
        body.append(row)
      }
    }
  }
  table.append(body)
  wrap.append(table)
  return wrap
}

// Page -------------------------------------------------------------------------

function legend(): HTMLElement {
  const list = el('div', 'viz-legend')
  const item = (cls: string, text: string): HTMLElement => {
    const span = el('span', 'viz-legend__item')
    span.append(el('span', `viz-key ${cls}`), document.createTextNode(text))
    return span
  }
  list.append(item('viz-key--focus', label(FOCUS)), item('viz-key--muted', 'Other techniques'))
  return list
}

function render(): void {
  const app = document.querySelector<HTMLDivElement>('#app')
  if (!app) return
  const base = import.meta.env.BASE_URL

  const header = el('header', 'masthead')
  const row = el('div', 'masthead__row')
  const title = el('h1')
  const home = el('a', 'crumb', 'animbench-lab')
  home.href = withTheme(base)
  title.append(home, document.createTextNode(' / Results'))
  row.append(title, themeToggle(readTheme()))
  header.append(row)

  if (data.dataset !== 'final') {
    const notice = el('p', 'notice')
    notice.append(
      el('strong', undefined, 'Pilot data. '),
      document.createTextNode('A verification run used to tune the method, not the thesis results. It has no CPU sampling and a 10 s window at every complexity.'),
    )
    header.append(notice)
  }

  const facts = el('p', 'lead')
  const day = data.firstDay === data.lastDay ? data.firstDay : `${data.firstDay} – ${data.lastDay}`
  facts.textContent = `${data.validRuns} valid runs · ${data.devices.join(', ')} · ${data.displays.join(', ')} · ${data.browsers.join(', ')} · ${day}`
  header.append(facts)
  app.append(header)

  const s1 = el('section', 'block')
  s1.append(
    el('h2', undefined, 'Achieved share of the achievable frame rate'),
    el('p', 'muted block__lead', 'Median of ten runs, measured in the steady-state window. 1.00 means every frame met the display’s budget.'),
    legend(),
  )
  const pair = el('div', 'viz-row')
  for (const scene of SCENES) pair.append(ratioChart(scene))
  s1.append(pair)
  app.append(s1)

  const top = Math.max(...data.combinations.map((c) => c.complexity))
  const s2 = el('section', 'block')
  s2.append(
    el('h2', undefined, `How long frames took at ${top} elements`),
    el('p', 'muted block__lead', 'Share of frames lasting one, two or more frame budgets. A pile at 2 is regular frame dropping: the display shows every other frame.'),
  )
  const grid = el('div', 'viz-row viz-row--four')
  for (const scene of SCENES) {
    grid.append(bucketChart(scene, FOCUS, top), bucketChart(scene, REFERENCE, top))
  }
  s2.append(grid)
  app.append(s2)

  const s3 = el('section', 'block')
  const margin = data.equivalenceMargin === null ? '' : ` Equivalent means the 90 % interval of the difference lies within ±${data.equivalenceMargin}.`
  s3.append(
    el('h2', undefined, 'All values'),
    el('p', 'muted block__lead', `Pairwise Mann–Whitney tests with Holm correction against the other techniques of the same scene and complexity.${margin}`),
    resultsTable(),
  )
  app.append(s3)

  const footer = el('footer', 'footnote')
  footer.append(el('p', undefined, 'Computed from the raw frame timestamps by analysis/analyze.py. The method and its reasoning are in docs/measurement-protocol.md and docs/final-measurement-plan.md.'))
  app.append(footer)
  document.body.append(tooltip)
}

applyTheme(readTheme())
render()
