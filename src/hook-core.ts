import type { ResolveFnOutput, ResolveHookContext } from 'node:module'

// A random value generated once per loaded module instance. Two copies of this
// package loaded into one process (e.g. Vite bundles `fresh-import` while
// another package uses a separately bundled copy) each register their own
// resolve hook; with an identical query name only the first-registered hook
// would capture the imports. This per-instance value keeps their query names
// distinct, so each hook only matches the imports it tagged itself.
const instanceId = Math.random().toString(36).slice(2)

export const relativeImportRE = /^\.{1,2}(?:\/|\\)/

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * The tracking query name `fresh-import-<instance>`, where `<instance>` is a
 * random value unique to this loaded module instance. Any two instances (even
 * two copies of the same build loaded into the same process) get distinct
 * names, so each hook only recognizes the imports it tagged itself.
 */
export function buildQueryName(): string {
  return `fresh-import-${instanceId}`
}

/**
 * Build the regex that matches the tracking query `?<name>=<id>,<context>`
 * (or the `&<name>=...` form).
 */
export function buildQueryRE(queryName: string): RegExp {
  return new RegExp(`(?:\\?|&)${escapeRegExp(queryName)}=(\\d+),([^&]+)(?:&|$)`)
}

/**
 * Build the tracking query `?<name>=<id>,<context>` that `collect` appends to
 * the entry specifier. `id` cache-busts the import (a distinct URL forces a
 * fresh evaluation) and `context` tags the import graph so the resolve hook can
 * attribute resolved dependencies back to the originating collect.
 */
export function formatTrackingQuery(queryName: string, id: number, context: string): string {
  return `?${queryName}=${id},${context}`
}

/**
 * Shared body of the resolve hook for both the on-thread and off-thread
 * importers. Given an already-resolved `result`, decides whether it is a tracked
 * relative file dependency; if so, reports it via `onDependency` and tags the
 * URL so the query propagates to its own dependencies.
 *
 * The sync/async difference between the two hooks lives entirely in the caller
 * (which awaits `nextResolve` or not); this function performs no I/O. `result`
 * is mutated in place and returned.
 */
export function trackResolved(
  specifier: string,
  context: ResolveHookContext,
  result: ResolveFnOutput,
  queryName: string,
  queryRE: RegExp,
  onDependency: (context: string, url: string) => void,
): ResolveFnOutput {
  const isRelativeImport = relativeImportRE.test(specifier)
  if (result.format === 'builtin' || !isRelativeImport) return result

  if (
    // parent has no URL: this is not a dependency of the tracked entry
    !context.parentURL ||
    // already tagged: nothing to do
    queryRE.test(result.url) ||
    // only file URLs become reported dependencies
    !result.url.startsWith('file:')
  ) {
    return result
  }

  // propagate the tracking query from the parent down to this dependency
  const m = queryRE.exec(context.parentURL)
  if (m) {
    const [, id, contextFile] = m
    onDependency(contextFile, result.url)
    // append the tracking query, preserving any existing query
    result.url = result.url.replace(
      /(\?)|$/,
      (_n, n1) => `?${queryName}=${id},${contextFile}${n1 === '?' ? '&' : ''}`,
    )
  }
  return result
}
