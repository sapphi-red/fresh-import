import { Module } from 'node:module'
import { createOffThreadImporter } from './off-thread/off-thread.ts'
import { createOnThreadImporter } from './on-thread.ts'
import type { FreshImportResult } from './index.ts'

export interface FreshImporter {
  collect(specifier: string): Promise<FreshImportResult>
}

/**
 * Create the importer best suited to the current runtime, or `undefined` if it
 * provides neither module-hook API.
 */
export function createImporter(): FreshImporter | undefined {
  // Prefer the synchronous on-thread hooks (Node 22.15+/23.5+): they run on the
  // main thread, avoiding the worker-thread MessagePort round-trip.
  // eslint-disable-next-line n/no-unsupported-features/node-builtins
  const registerHooks = Module.registerHooks as typeof Module.registerHooks | undefined
  if (registerHooks) {
    return createOnThreadImporter()
  }
  // Fall back to the off-thread loader (`Module.register`, Node 18.19+/20.6+).
  // eslint-disable-next-line n/no-unsupported-features/node-builtins
  const register = Module.register as typeof Module.register | undefined
  if (register) {
    return createOffThreadImporter()
  }
  return undefined
}
