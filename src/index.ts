import { Module } from 'node:module'
import { createOffThreadImporter } from './off-thread/off-thread.ts'
import { createOnThreadImporter } from './on-thread.ts'

export interface FreshImporterOptions {
  /**
   * Query parameter name used to tag the import graph
   *
   * @example 't'
   */
  queryName: string
}

export interface FreshImporter {
  collect(
    specifier: string,
  ): Promise<{ result: { [Symbol.toStringTag]: 'Module' }; dependencies: string[] }>
}

/**
 * Create a fresh importer that imports an ESM entry in its own module graph
 * (separate from Node's module cache and from other concurrent imports) and
 * reports the dependency files it pulled in.
 *
 * Note that this only tracks ESM dependencies that are statically imported (not dynamic imports)
 */
export function createFreshImporter(options: FreshImporterOptions): FreshImporter | undefined {
  const { queryName } = options

  // Prefer the synchronous on-thread hooks (Node 22.15+/23.5+): they run on the
  // main thread, avoiding the worker-thread MessagePort round-trip.
  // eslint-disable-next-line n/no-unsupported-features/node-builtins
  const registerHooks = Module.registerHooks as typeof Module.registerHooks | undefined
  if (registerHooks) {
    return createOnThreadImporter(queryName)
  }
  // Fall back to the off-thread loader (`Module.register`, Node 18.19+/20.6+).
  // eslint-disable-next-line n/no-unsupported-features/node-builtins
  const register = Module.register as typeof Module.register | undefined
  if (register) {
    return createOffThreadImporter(queryName)
  }
  return undefined
}
