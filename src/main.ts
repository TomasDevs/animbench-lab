import './style.css'
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

const SCENE_NOTES: Record<SceneId, string> = {
  grid: 'Translate and opacity, staggered by position.',
  composite: 'Translate, scale, rotate and opacity at once.',
  parallax: 'Layers at different speeds during scripted scrolling.',
}

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

type Theme = 'dark' | 'light'

/**
 * Theme comes from the URL, not from storage, which the project rules forbid.
 * A link carries the choice with it and a reload keeps it, which is all this
 * page needs.
 */
function readTheme(): Theme {
  return new URLSearchParams(window.location.search).get('theme') === 'light'
    ? 'light'
    : 'dark'
}

function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme
}

/** Sun for switching to light, moon for switching to dark. */
const THEME_ICON: Record<Theme, string> = {
  light:
    '<circle cx="8" cy="8" r="3.25"/>' +
    '<path d="M8 1v1.5M8 13.5V15M15 8h-1.5M2.5 8H1M12.95 3.05l-1.06 1.06M4.11 11.89l-1.06 1.06M12.95 12.95l-1.06-1.06M4.11 4.11L3.05 3.05"/>',
  dark: '<path d="M13.5 9.6A5.8 5.8 0 0 1 6.4 2.5a5.8 5.8 0 1 0 7.1 7.1z"/>',
}

function themeToggle(current: Theme): HTMLAnchorElement {
  const next: Theme = current === 'dark' ? 'light' : 'dark'
  const params = new URLSearchParams(window.location.search)
  params.set('theme', next)

  const toggle = document.createElement('a')
  toggle.className = 'theme-toggle'
  toggle.href = `${window.location.pathname}?${params.toString()}`
  toggle.innerHTML =
    `<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" ` +
    `fill="none" stroke="currentColor" stroke-width="1.25" ` +
    `stroke-linecap="round" stroke-linejoin="round">${THEME_ICON[next]}</svg>`
  toggle.title = `Switch to ${next} theme`
  toggle.setAttribute('aria-label', `Switch to ${next} theme`)
  // Swap without a reload; the href keeps it shareable and works without JS.
  toggle.addEventListener('click', (event) => {
    event.preventDefault()
    window.history.replaceState(null, '', toggle.href)
    applyTheme(next)
    render.rebuildToggle()
  })
  return toggle
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
  row.append(el('span', 'row__name', meta.label))

  const runs = el('div', 'row__runs')
  const limit = MAX_COMPLEXITY[meta.id] ?? Infinity

  for (const complexity of COMPLEXITY_STEPS) {
    if (complexity > limit) {
      // Shown rather than hidden: the gap is information about the technique.
      const gap = el('span', 'run run--unavailable', String(complexity))
      gap.title = `Not measurable above ${limit} elements`
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
  header.append(el('h2', undefined, scene), el('p', 'muted', SCENE_NOTES[scene]))
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
    group.append(el('p', 'group__label', 'Measured separately'))
    for (const meta of separate) group.append(techniqueRow(meta, scene))
    section.append(group)
  }

  return section
}

async function render(): Promise<void> {
  const app = document.querySelector<HTMLDivElement>('#app')
  if (!app) return

  const techniques = (await allAdapterMeta()).sort((a, b) => a.label.localeCompare(b.label))

  const header = el('header', 'masthead')
  const titleRow = el('div', 'masthead__row')
  titleRow.append(el('h1', undefined, 'animbench-lab'), themeToggle(readTheme()))
  header.append(
    titleRow,
    el(
      'p',
      'lead',
      'Identical animated scenes driven by different techniques, so frame timing can be compared.',
    ),
  )
  app.append(header)

  for (const scene of availableScenes()) {
    const section = sceneSection(scene, techniques)
    if (section) app.append(section)
  }

  const tools = el('section', 'tools')
  tools.append(el('h2', undefined, 'Tools'))

  const list = el('div', 'tools__list')

  const validate = el('a', 'tool')
  validate.href = BASE + 'validate.html'
  validate.append(
    el('span', 'tool__name', 'Equivalence check'),
    el('span', 'muted', 'Every technique against the requestAnimationFrame reference.'),
  )

  const react = el('a', 'tool')
  react.href = `${BASE}react.html?complexity=500&seed=42&window=10000&mode=demo`
  react.append(
    el('span', 'tool__name', 'React Motion'),
    el('span', 'muted', 'The same scene through motion/react, to isolate framework overhead.'),
  )

  list.append(validate, react)
  tools.append(list)
  app.append(tools)

  const footer = el('footer', 'footnote')
  footer.append(
    el(
      'p',
      undefined,
      'Links open demo mode, which adds a control panel and a live frame rate. Measurement runs use mode=bench, where the panel does not exist: its own frame counter would pollute the result.',
    ),
  )
  app.append(footer)
}

/** Replaces the toggle in place after a theme swap. */
render.rebuildToggle = (): void => {
  const existing = document.querySelector('.theme-toggle')
  existing?.replaceWith(themeToggle(readTheme()))
}

applyTheme(readTheme())
void render()
