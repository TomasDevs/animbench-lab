import type { AdapterConstructor, AdapterMeta } from '../types/adapter.ts'

/**
 * Adapters are loaded with dynamic import so that a run never downloads a
 * library it does not use. Measuring CSS transitions must not pull in GSAP.
 */
const loaders: Record<string, () => Promise<AdapterConstructor>> = {
  raf: () => import('./raf.ts').then((m) => m.RafAdapter),
  'css-transition': () => import('./css-transition.ts').then((m) => m.CssTransitionAdapter),
  'css-keyframes': () => import('./css-keyframes.ts').then((m) => m.CssKeyframesAdapter),
  gsap: () => import('./gsap.ts').then((m) => m.GsapAdapter),
  lottie: () => import('./lottie.ts').then((m) => m.LottieAdapter),
  motion: () => import('./motion.ts').then((m) => m.MotionAdapter),
  'scroll-driven': () => import('./scroll-driven.ts').then((m) => m.ScrollDrivenAdapter),
  'view-transition': () => import('./view-transition.ts').then((m) => m.ViewTransitionAdapter),
  waapi: () => import('./waapi.ts').then((m) => m.WaapiAdapter),
}

/** The reference implementation every other technique is validated against. */
export const REFERENCE_ADAPTER_ID = 'raf'

/**
 * Techniques measured outside the main matrix, with their own procedure.
 *
 * Scroll-driven animations are driven by scroller position rather than by time,
 * so the reference cannot produce the same trajectory on the same scene and
 * trajectory equivalence is not defined for them.
 */
/**
 * Highest element count a technique produces usable data at.
 *
 * View Transitions needs one snapshot per element, so beyond a couple hundred
 * the page effectively stalls: measured 482 ms per frame at 500 elements.
 */
export const MAX_COMPLEXITY: Readonly<Record<string, number>> = {
  'view-transition': 200,
}

export const SEPARATE_REGIME_IDS: readonly string[] = [
  'scroll-driven',
  'view-transition',
  'lottie',
]

export async function loadAdapter(id: string): Promise<AdapterConstructor> {
  const loader = loaders[id]
  if (!loader) {
    throw new Error(`Adapter "${id}" is not implemented yet`)
  }
  return loader()
}

export function availableAdapters(): string[] {
  return Object.keys(loaders)
}

/**
 * Loads every adapter's static meta. Used by the demo panel to label the
 * technique selector; never called in bench mode, since it would download every
 * adapter and its library.
 */
export async function allAdapterMeta(): Promise<AdapterMeta[]> {
  return Promise.all(Object.keys(loaders).map(async (id) => (await loadAdapter(id)).meta))
}
