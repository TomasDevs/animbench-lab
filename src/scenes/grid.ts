import type { Scene, SceneGenerator, SceneOptions } from '../types/scene-generator.ts'
import { createRandom } from './random.ts'

/**
 * Grid scene: elements in a grid, translate and opacity, staggered by position.
 *
 * The same seed and complexity always produce the same grid. Geometry is a
 * function of the element count and viewport; only the per element hue comes
 * from the seeded generator.
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
    // One insertion, so the element count does not change how many layout
    // passes the scene costs to build.
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
