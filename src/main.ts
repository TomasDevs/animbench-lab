import './style.css'
import { applyTheme, readTheme, themeToggle } from './theme.ts'
import { applyLang, carry, langToggle, readLang, techniqueName, toggleClass, type Lang } from './i18n.ts'
import { allAdapterMeta, MAX_COMPLEXITY, SEPARATE_REGIME_IDS } from './adapters/index.ts'
import { availableScenes } from './scenes/index.ts'
import { buildUrl } from './bench/params.ts'
import type { AdapterMeta } from './types/adapter.ts'
import type { SceneId } from './types/scene.ts'

/**
 * Landing page. Never measured: it exists so a human can reach the measurement
 * page without hand-writing URL parameters.
 *
 * Every link is built from the adapter registry and filtered by what the
 * technique actually supports, so the page cannot offer a run that fails.
 */

const COMPLEXITY_STEPS = [100, 500, 2000]
const BASE = import.meta.env.BASE_URL

const STRINGS = {
  en: {
    title: 'animbench-lab',
    lead: 'Identical animated scenes driven by different techniques, so frame timing can be compared.',
    scenes: {
      grid: 'Translate and opacity, staggered by position.',
      composite: 'Translate, scale, rotate and opacity at once.',
      parallax: 'Layers at different speeds during scripted scrolling.',
    } satisfies Record<SceneId, string>,
    unavailable: (limit: number) => `Not measurable above ${limit} elements`,
    separate: 'Measured separately',
    tools: 'Tools',
    techniques: 'Techniques',
    techniquesNote: 'What each technique is, in plain language, and how to recognise it.',
    results: 'Results',
    resultsNote: 'Frame rate per technique, scene and complexity, with test outcomes.',
    validate: 'Equivalence check',
    validateNote: 'Every technique against the requestAnimationFrame reference.',
    react: 'React Motion',
    reactNote: 'The same scene through motion/react, to isolate framework overhead.',
    footnote:
      'Links open demo mode, which adds a control panel and a live frame rate. Measurement runs use mode=bench, where the panel does not exist: its own frame counter would pollute the result.',
    theme: { light: 'Switch to light theme', dark: 'Switch to dark theme' },
  },
  cs: {
    title: 'animbench-lab',
    lead: 'Stejné animované scény poháněné různými technikami, aby šlo porovnat časování snímků.',
    scenes: {
      grid: 'Posun a průhlednost, postupně podle polohy.',
      composite: 'Posun, změna velikosti, rotace a průhlednost současně.',
      parallax: 'Vrstvy různou rychlostí při skriptovaném posouvání.',
    } satisfies Record<SceneId, string>,
    unavailable: (limit: number) => `Nad ${limit} prvků neměřitelné`,
    separate: 'Měřeno samostatně',
    tools: 'Nástroje',
    techniques: 'Techniky',
    techniquesNote: 'Co je která technika, srozumitelně, a jak ji poznat.',
    results: 'Výsledky',
    resultsNote: 'Snímková frekvence podle techniky, scény a složitosti, s výsledky testů.',
    validate: 'Kontrola shody',
    validateNote: 'Každá technika proti referenci requestAnimationFrame.',
    react: 'React Motion',
    reactNote: 'Stejná scéna přes motion/react, aby šla oddělit režie frameworku.',
    footnote:
      'Odkazy otevírají demo režim, který přidává ovládací panel a živou snímkovou frekvenci. Měřicí běhy používají mode=bench, kde panel neexistuje: jeho vlastní počítadlo snímků by výsledek zkreslilo.',
    theme: { light: 'Přepnout na světlý motiv', dark: 'Přepnout na tmavý motiv' },
  },
} satisfies Record<Lang, unknown>

let t = STRINGS[readLang()]

function demoUrl(technique: string, scene: SceneId, complexity: number): string {
  return buildUrl(
    {
      technique,
      scene,
      complexity,
      seed: 42,
      duration: 10_000,
      // Links are for humans, so they open demo mode. Measurement runs are
      // started by the CLI with mode=bench.
      mode: 'demo',
      repeat: 0,
    },
    BASE + 'bench.html',
  )
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

/** One technique row: a name and a run link per usable complexity. */
function techniqueRow(meta: AdapterMeta, scene: SceneId): HTMLElement {
  const row = el('div', 'row')
  row.append(el('span', 'row__name', techniqueName(meta.id, meta.label)))

  const runs = el('div', 'row__runs')
  const limit = MAX_COMPLEXITY[meta.id] ?? Infinity

  for (const complexity of COMPLEXITY_STEPS) {
    if (complexity > limit) {
      // Shown rather than hidden: the gap is information about the technique.
      const gap = el('span', 'run run--unavailable', String(complexity))
      gap.title = t.unavailable(limit)
      runs.append(gap)
      continue
    }
    const link = el('a', 'run', String(complexity))
    link.href = demoUrl(meta.id, scene, complexity)
    runs.append(link)
  }

  row.append(runs)
  return row
}

function sceneSection(scene: SceneId, techniques: AdapterMeta[]): HTMLElement | null {
  const supported = techniques.filter((meta) => meta.scenes.includes(scene))
  if (supported.length === 0) return null

  const section = el('section', 'scene')
  const header = el('div', 'scene__header')
  header.append(el('h2', undefined, scene), el('p', 'muted', t.scenes[scene]))
  section.append(header)

  const main = supported.filter((m) => !SEPARATE_REGIME_IDS.includes(m.id))
  const separate = supported.filter((m) => SEPARATE_REGIME_IDS.includes(m.id))

  if (main.length > 0) {
    const group = el('div', 'group')
    for (const meta of main) group.append(techniqueRow(meta, scene))
    section.append(group)
  }

  if (separate.length > 0) {
    const group = el('div', 'group')
    group.append(el('p', 'group__label', t.separate))
    for (const meta of separate) group.append(techniqueRow(meta, scene))
    section.append(group)
  }

  return section
}

async function render(): Promise<void> {
  const app = document.querySelector<HTMLDivElement>('#app')
  if (!app) return
  t = STRINGS[readLang()]
  document.title = t.title
  // Built off-document and swapped in at once, so a re-render never flashes empty.
  const page = document.createDocumentFragment()

  const techniques = (await allAdapterMeta()).sort((a, b) => a.label.localeCompare(b.label))

  const header = el('header', 'masthead')
  const titleRow = el('div', 'masthead__row')
  const toggles = el('div', 'masthead__toggles')
  toggles.append(langToggle(rerender), themeToggle(rerender, t.theme, readTheme()))
  titleRow.append(el('h1', undefined, t.title), toggles)
  header.append(titleRow, el('p', 'lead', t.lead))
  page.append(header)

  for (const scene of availableScenes()) {
    const section = sceneSection(scene, techniques)
    if (section) page.append(section)
  }

  const tools = el('section', 'tools')
  tools.append(el('h2', undefined, t.tools))

  const list = el('div', 'tools__list')

  const techniquesLink = el('a', 'tool')
  techniquesLink.href = carry(BASE + 'techniques.html')
  techniquesLink.append(el('span', 'tool__name', t.techniques), el('span', 'muted', t.techniquesNote))

  const results = el('a', 'tool')
  results.href = carry(BASE + 'results.html')
  results.append(el('span', 'tool__name', t.results), el('span', 'muted', t.resultsNote))

  const validate = el('a', 'tool')
  validate.href = carry(BASE + 'validate.html')
  validate.append(el('span', 'tool__name', t.validate), el('span', 'muted', t.validateNote))

  const react = el('a', 'tool')
  react.href = `${BASE}react.html?complexity=500&seed=42&window=10000&mode=demo`
  react.append(el('span', 'tool__name', t.react), el('span', 'muted', t.reactNote))

  list.append(techniquesLink, results, validate, react)
  tools.append(list)
  page.append(tools)

  const footer = el('footer', 'footnote')
  footer.append(el('p', undefined, t.footnote))
  page.append(footer)
  app.replaceChildren(page)
}

/** Toggles rewrite the URL and call this, so every link is rebuilt from it. */
function rerender(): void {
  const focused = toggleClass(document.activeElement)
  void render().then(() => {
    // Keeps keyboard focus on the toggle that was just used.
    if (focused) document.querySelector<HTMLElement>(`.${focused}`)?.focus()
  })
}

applyTheme(readTheme())
applyLang(readLang())
void render()
