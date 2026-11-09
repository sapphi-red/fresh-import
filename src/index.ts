import { createImporter, type FreshImporter } from './create-importer.ts'

export interface FreshImportResult {
  /** The imported module namespace. */
  result: { [Symbol.toStringTag]: 'Module' }
  /** Absolute file paths of statically-imported relative and local package dependencies. */
  dependencies: string[]
}

// Creating the importer registers a resolution hook, so create it once on first
// use and reuse it across calls. `initialized` lets us memoize even an
// `undefined` (unsupported-runtime) result instead of re-probing every call.
let importer: FreshImporter | undefined
let initialized = false

/**
 * Import an ESM entry in its own fresh module graph (separate from Node's module
 * cache and from other concurrent imports) and report the dependency files it
 * pulled in.
 *
 * Each call re-evaluates the entry in a fresh graph; concurrent calls stay
 * isolated from one another. Statically-imported relative dependencies and local
 * packages resolving outside node_modules are tracked, not dynamic imports.
 * CommonJS dependencies are not re-evaluated, and tracking does not continue
 * through untracked packages in node_modules.
 *
 * Returns `undefined` on runtimes that provide neither `Module.registerHooks`
 * nor `Module.register`.
 */
export function freshImport(specifier: string): Promise<FreshImportResult> | undefined {
  if (!initialized) {
    importer = createImporter()
    initialized = true
  }
  return importer?.collect(specifier)
}
