/**
 * Shared dark/light theme for the human-facing pages.
 *
 * The theme comes from the URL, not from storage, which the project rules
 * forbid. A link carries the choice with it and a reload keeps it. Dark is the
 * default, so only ?theme=light is ever written.
 */

export type Theme = 'dark' | 'light'

export function readTheme(): Theme {
  return new URLSearchParams(window.location.search).get('theme') === 'light'
    ? 'light'
    : 'dark'
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme
}

/** Sun for switching to light, moon for switching to dark. */
const THEME_ICON: Record<Theme, string> = {
  light:
    '<circle cx="8" cy="8" r="3.25"/>' +
    '<path d="M8 1v1.5M8 13.5V15M15 8h-1.5M2.5 8H1M12.95 3.05l-1.06 1.06M4.11 11.89l-1.06 1.06M12.95 12.95l-1.06-1.06M4.11 4.11L3.05 3.05"/>',
  dark: '<path d="M13.5 9.6A5.8 5.8 0 0 1 6.4 2.5a5.8 5.8 0 1 0 7.1 7.1z"/>',
}

/** A link that swaps the theme in place; the href keeps it working without JS. */
export function themeToggle(current: Theme = readTheme()): HTMLAnchorElement {
  const next: Theme = current === 'dark' ? 'light' : 'dark'
  const params = new URLSearchParams(window.location.search)
  if (next === 'light') params.set('theme', 'light')
  else params.delete('theme')

  const query = params.toString()
  const toggle = document.createElement('a')
  toggle.className = 'theme-toggle'
  toggle.href = query ? `${window.location.pathname}?${query}` : window.location.pathname
  toggle.innerHTML =
    `<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" ` +
    `fill="none" stroke="currentColor" stroke-width="1.25" ` +
    `stroke-linecap="round" stroke-linejoin="round">${THEME_ICON[next]}</svg>`
  toggle.title = `Switch to ${next} theme`
  toggle.setAttribute('aria-label', `Switch to ${next} theme`)
  toggle.addEventListener('click', (event) => {
    event.preventDefault()
    window.history.replaceState(null, '', toggle.href)
    applyTheme(next)
    toggle.replaceWith(themeToggle(next))
  })
  return toggle
}

/**
 * Carries the current theme onto a link to another page, so moving between
 * pages does not flip it back to the default.
 */
export function withTheme(href: string): string {
  if (readTheme() !== 'light') return href
  return href + (href.includes('?') ? '&' : '?') + 'theme=light'
}
