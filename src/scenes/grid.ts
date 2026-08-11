import type { Scene, SceneGenerator, SceneOptions } from '../types/scene-generator.ts'
import { createRandom } from './random.ts'

/**
 * Grid scene: elements laid out in a grid, animated with translate and opacity,
 * staggered by position. Serves VO1, VO2 and VO3.
 *
 * The layout is derived from the seed, so the same seed and complexity always
 * produce the same grid. Only the per element hue and size jitter are random;
 * the grid geometry itself is a deterministic function of the element count.
 */

/** Hue range kept narrow so elements stay visually uniform across seeds. */
const HUE_MIN = 200
const HUE_MAX = 280

function buildStyles(): HTMLStyleElement {
  const style = document.createElement('style')
  // No shadows, filters or blur: they would add paint cost unrelated to the
  // technique being measured.
  style.textContent = `
.scene-grid {
  display: grid;
  width: 100%;
  height: 100%;
  gap: var(--gap);
  grid-template-columns: repeat(var(--cols), 1fr);
  grid-template-rows: repeat(var(--rows), 1fr);
  padding: var(--gap);
  box-sizing: border-box;
}
.scene-grid__item {
  background: var(--fill);
  border-radius: 2px;
  will-change: transform, opacity;
  transform: translate(0px, 0px) scale(1) rotate(0deg);
  opacity: 1;
}
`
  return style
}

/**
 * Chooses a column count that keeps cells close to square for the current
 * viewport. Deterministic: depends only on count and viewport, not on the seed.
 */
function columnsFor(count: number, width: number, height: number): number {
  if (count <= 1) return 1
  const aspect = width / Math.max(height, 1)
  const cols = Math.round(Math.sqrt(count * aspect))
  return Math.min(count, Math.max(1, cols))
}

export const gridScene: SceneGenerator = {
  id: 'grid',

  build(container: HTMLElement, options: SceneOptions): Scene {
    const { complexity, seed } = options
    const random = createRandom(seed)

    const style = buildStyles()
    document.head.append(style)

    const root = document.createElement('div')
    root.className = 'scene-grid'

    const cols = columnsFor(complexity, container.clientWidth, container.clientHeight)
    const rows = Math.ceil(complexity / cols)
    root.style.setProperty('--cols', String(cols))
    root.style.setProperty('--rows', String(rows))
    root.style.setProperty('--gap', complexity > 500 ? '2px' : '6px')

    const elements: HTMLElement[] = []
    // Build into a fragment so the scene reaches the document in one insertion
    // and the element count does not change the number of layout passes.
    const fragment = document.createDocumentFragment()

    for (let i = 0; i < complexity; i++) {
      const item = document.createElement('div')
      item.className = 'scene-grid__item'

      const hue = random.range(HUE_MIN, HUE_MAX)
      const lightness = random.range(45, 65)
      item.style.setProperty('--fill', `hsl(${hue.toFixed(1)} 70% ${lightness.toFixed(1)}%)`)

      fragment.append(item)
      elements.push(item)
    }

    root.append(fragment)
    container.append(root)

    return {
      id: 'grid',
      root,
      elements,
      dispose() {
        root.remove()
        style.remove()
      },
    }
  },
}
