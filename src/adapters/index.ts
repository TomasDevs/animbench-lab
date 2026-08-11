import type { AdapterConstructor } from '../types/adapter.ts'

/**
 * Adapters are loaded with dynamic import so that a run never downloads a
 * library it does not use. Measuring CSS transitions must not pull in GSAP.
 */
const loaders: Record<string, () => Promise<AdapterConstructor>> = {
  raf: () => import('./raf.ts').then((m) => m.RafAdapter),
  'css-transition': () => import('./css-transition.ts').then((m) => m.CssTransitionAdapter),
}

/** The reference implementation every other technique is validated against. */
export const REFERENCE_ADAPTER_ID = 'raf'

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
export async function allAdapterMeta(): Promise<{ id: string; label: string }[]> {
  const entries = await Promise.all(
    Object.keys(loaders).map(async (id) => {
      const ctor = await loadAdapter(id)
      return { id, label: ctor.meta.label }
    }),
  )
  return entries
}
