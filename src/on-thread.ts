import { Module } from 'node:module'
import { fileURLToPath } from 'node:url'
import type { ResolveHookSync } from 'node:module'
import { buildQueryRE, formatTrackingQuery, trackResolved } from './hook-core.ts'
import type { FreshImporter } from './index.ts'

let nextId = 0

/**
 * On-thread importer: registers synchronous resolution hooks via
 * `Module.registerHooks` (Node 22.15+/23.5+).
 */
export function createOnThreadImporter(queryName: string): FreshImporter {
  const queryRE = buildQueryRE(queryName)
  // Active collects, keyed by context id. The resolve hook writes into these.
  const registry = new Map<string, Set<string>>()

  const resolve: ResolveHookSync = (specifier, context, nextResolve) => {
    const result = nextResolve(specifier, context)
    return trackResolved(specifier, context, result, queryName, queryRE, (ctx, url) => {
      registry.get(ctx)?.add(url)
    })
  }

  // eslint-disable-next-line n/no-unsupported-features/node-builtins
  Module.registerHooks({ resolve })

  return {
    async collect(specifier: string) {
      const id = nextId++
      const depsList = new Set<string>()
      registry.set(specifier, depsList)
      try {
        const result = await import(specifier + formatTrackingQuery(queryName, id, specifier))
        // Static deps are resolved synchronously while the entry evaluates, so
        // they are already in `depsList` by the time the import settles.
        const dependencies = [...depsList]
          .filter((url) => url.startsWith('file:'))
          .map((url) => fileURLToPath(url))
        return { result, dependencies }
      } finally {
        registry.delete(specifier)
      }
    },
  }
}
