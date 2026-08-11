import type { AdapterConstructor } from '../types/adapter.ts'

/**
 * Adapters are loaded with dynamic import so that a run never downloads a
 * library it does not use. Measuring CSS transitions must not pull in GSAP.
 */
const loaders: Record<string, () => Promise<AdapterConstructor>> = {
  raf: () => import('./raf.ts').then((m) => m.RafAdapter),
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
