import type { Scene, SceneGenerator, SceneOptions } from '../types/scene-generator.ts'
import { createRandom } from './random.ts'

/**
 * Composite scene: a grid whose elements translate, scale, rotate and fade at
 * once. Serves VO2 at higher load.
 *
 * Cells leave room around each element because the spec scales up to 1.4 and
 * rotates a full turn. Without that margin neighbours would overlap mid-run and
 * the measurement would include compositing work the grid scene never does,
 * making the two scenes incomparable.
 */

const HUE_MIN = 200
const HUE_MAX = 280

/** Largest scale in the composite spec, plus the diagonal a square sweeps. */
const CLEARANCE = 0.55

function buildStyles(): HTMLStyleElement {
  const style = document.createElement('style')
  style.textContent = `
.scene-composite {
  display: grid;
  width: 100%;
  height: 100%;
  gap: var(--gap);
  grid-template-columns: repeat(var(--cols), 1fr);
  grid-template-rows: repeat(var(--rows), 1fr);
  padding: var(--gap);
  box-sizing: border-box;
  place-items: center;
}
.scene-composite__item {
  width: ${Math.round(CLEARANCE * 100)}%;
  height: ${Math.round(CLEARANCE * 100)}%;
  background: var(--fill);
  border-radius: 2px;
  will-change: transform, opacity;
  transform: translate(0px, 0px) scale(1) rotate(0deg);
  opacity: 1;
}
`
  return style
}

function columnsFor(count: number, width: number, height: number): number {
  if (count <= 1) return 1
  const aspect = width / Math.max(height, 1)
  const cols = Math.round(Math.sqrt(count * aspect))
  return Math.min(count, Math.max(1, cols))
}

export const compositeScene: SceneGenerator = {
  id: 'composite',

  build(container: HTMLElement, options: SceneOptions): Scene {
    const { complexity, seed } = options
    const random = createRandom(seed)

    const style = buildStyles()
    document.head.append(style)

    const root = document.createElement('div')
    root.className = 'scene-composite'

    const cols = columnsFor(complexity, container.clientWidth, container.clientHeight)
    const rows = Math.ceil(complexity / cols)
    root.style.setProperty('--cols', String(cols))
    root.style.setProperty('--rows', String(rows))
    root.style.setProperty('--gap', complexity > 500 ? '2px' : '6px')

    const elements: HTMLElement[] = []
    const fragment = document.createDocumentFragment()

    for (let i = 0; i < complexity; i++) {
      const item = document.createElement('div')
      item.className = 'scene-composite__item'

      const hue = random.range(HUE_MIN, HUE_MAX)
      const lightness = random.range(45, 65)
      item.style.setProperty('--fill', `hsl(${hue.toFixed(1)} 70% ${lightness.toFixed(1)}%)`)

      fragment.append(item)
      elements.push(item)
    }

    root.append(fragment)
    container.append(root)

    return {
      id: 'composite',
      root,
      elements,
      dispose() {
        root.remove()
        style.remove()
      },
    }
  },
}
