import { hrefWith, withTheme } from './theme.ts'

/**
 * English/Czech switch for the human-facing pages (landing and results only).
 *
 * Same model as the theme: the choice lives in the URL, never in storage.
 * English is the default, so only ?lang=cs is ever written. Each page owns its
 * dictionary; this module holds only what the pages share.
 */

export type Lang = 'en' | 'cs'

export function readLang(): Lang {
  return new URLSearchParams(window.location.search).get('lang') === 'cs' ? 'cs' : 'en'
}

export function applyLang(lang: Lang): void {
  document.documentElement.lang = lang
}

/** Technique names that have an established Czech form, as in the thesis. */
const TECHNIQUE_CS: Record<string, string> = {
  'css-transition': 'CSS přechody',
  'css-keyframes': 'CSS klíčové snímky',
}

export function techniqueName(id: string, fallback: string, lang: Lang = readLang()): string {
  return (lang === 'cs' ? TECHNIQUE_CS[id] : undefined) ?? fallback
}

/** Decimal comma in Czech, matching the thesis figures. */
export function decimal(value: number, digits: number, lang: Lang = readLang()): string {
  const text = value.toFixed(digits)
  return lang === 'cs' ? text.replace('.', ',') : text
}

/** The label names the language it switches to, so it reads as an action. */
export function langToggle(onSwitch: () => void, current: Lang = readLang()): HTMLAnchorElement {
  const next: Lang = current === 'en' ? 'cs' : 'en'
  const toggle = document.createElement('a')
  toggle.className = 'lang-toggle'
  toggle.href = hrefWith('lang', next === 'cs' ? 'cs' : null)
  toggle.textContent = next.toUpperCase()
  toggle.lang = next
  toggle.title = next === 'cs' ? 'Přepnout do češtiny' : 'Switch to English'
  toggle.setAttribute('aria-label', toggle.title)
  toggle.addEventListener('click', (event) => {
    event.preventDefault()
    // Read at click time: the theme toggle may have rewritten the URL since.
    window.history.replaceState(null, '', hrefWith('lang', next === 'cs' ? 'cs' : null))
    applyLang(next)
    onSwitch()
  })
  return toggle
}

/** Carries the current language onto a link to another page. */
export function withLang(href: string): string {
  if (readLang() !== 'cs') return href
  return href + (href.includes('?') ? '&' : '?') + 'lang=cs'
}

/** Carries both theme and language, for every link between the two pages. */
export function carry(href: string): string {
  return withLang(withTheme(href))
}

/** Which toggle holds focus, so a re-render can hand focus back to it. */
export function toggleClass(node: Element | null): string | null {
  if (node?.classList.contains('lang-toggle')) return 'lang-toggle'
  if (node?.classList.contains('theme-toggle')) return 'theme-toggle'
  return null
}
