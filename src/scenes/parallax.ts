import type { Scene, SceneGenerator, SceneOptions } from '../types/scene-generator.ts'
import { createRandom } from './random.ts'

/**
 * Parallax scene: layers moving at different speeds during scripted scrolling.
 * Serves VO4.
 *
 * The measurement page forbids page scrolling, so the scene builds its own
 * scroller. An adapter must not create one itself, and a scroll-driven
 * animation has no timeline without it.
 *
 * Elements carry a data-layer index. Adapters that derive per-element speed read
 * it rather than inventing their own layout, so every technique moves the same
 * element by the same distance.
 */

const LAYERS = 4
/** Speed multiplier per layer: far layers move least. */
const LAYER_SPEED = [0.25, 0.5, 0.75, 1]
const HUE_MIN = 200
const HUE_MAX = 280

/** Scroll distance as a multiple of viewport height. */
export const SCROLL_PAGES = 3

function buildStyles(): HTMLStyleElement {
  const style = document.createElement('style')
  style.textContent = `
.scene-parallax {
  width: 100%;
  height: 100%;
  overflow-y: scroll;
  overflow-x: hidden;
  scrollbar-width: none;
  position: relative;
  /* Named timeline the scroll-driven adapter binds to. */
  scroll-timeline: --animbench-scroll block;
}
.scene-parallax::-webkit-scrollbar { display: none; }
.scene-parallax__track {
  position: relative;
  width: 100%;
}
.scene-parallax__viewport {
  position: sticky;
  top: 0;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}
.scene-parallax__item {
  position: absolute;
  width: var(--size);
  height: var(--size);
  left: var(--x);
  top: var(--y);
  background: var(--fill);
  border-radius: 2px;
  will-change: transform, opacity;
  transform: translate(0px, 0px) scale(1) rotate(0deg);
  opacity: 1;
}
`
  return style
}

export const parallaxScene: SceneGenerator = {
  id: 'parallax',

  build(container: HTMLElement, options: SceneOptions): Scene {
    const { complexity, seed } = options
    const random = createRandom(seed)

    const style = buildStyles()
    document.head.append(style)

    const root = document.createElement('div')
    root.className = 'scene-parallax'

    const track = document.createElement('div')
    track.className = 'scene-parallax__track'
    track.style.height = `${SCROLL_PAGES * 100}vh`

    const viewport = document.createElement('div')
    viewport.className = 'scene-parallax__viewport'

    const elements: HTMLElement[] = []
    const fragment = document.createDocumentFragment()

    for (let i = 0; i < complexity; i++) {
      const item = document.createElement('div')
      item.className = 'scene-parallax__item'

      // Layer assignment is round robin, so every layer holds the same count
      // regardless of the seed and the load per layer stays comparable.
      const layer = i % LAYERS
      item.dataset.layer = String(layer)
      item.style.setProperty('--speed', String(LAYER_SPEED[layer] ?? 1))

      const size = random.range(14, 34)
      item.style.setProperty('--size', `${size.toFixed(1)}px`)
      item.style.setProperty('--x', `${random.range(0, 96).toFixed(2)}%`)
      item.style.setProperty('--y', `${random.range(0, 96).toFixed(2)}%`)

      const hue = random.range(HUE_MIN, HUE_MAX)
      // Far layers are lighter, which reads as depth without adding filters.
      const lightness = 40 + layer * 8
      item.style.setProperty('--fill', `hsl(${hue.toFixed(1)} 70% ${lightness}%)`)

      fragment.append(item)
      elements.push(item)
    }

    viewport.append(fragment)
    track.append(viewport)
    root.append(track)
    container.append(root)

    return {
      id: 'parallax',
      root,
      elements,
      dispose() {
        root.remove()
        style.remove()
      },
    }
  },
}

/** Speed multiplier for an element, read from the layer the scene assigned. */
export function layerSpeed(element: HTMLElement): number {
  const layer = Number.parseInt(element.dataset.layer ?? '0', 10)
  return LAYER_SPEED[layer] ?? 1
}
