import type { ResolveFnOutput, ResolveHookContext } from 'node:module'

export const relativeImportRE = /^\.{1,2}(?:\/|\\)/

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Build the regex that matches the tracking query `?<name>=<time>,<context>`
 * (or the `&<name>=...` form).
 */
export function buildQueryRE(queryName: string): RegExp {
  return new RegExp(`(?:\\?|&)${escapeRegExp(queryName)}=(\\d+),([^&]+)(?:&|$)`)
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
    const [, time, contextFile] = m
    onDependency(contextFile, result.url)
    // append the tracking query, preserving any existing query
    result.url = result.url.replace(
      /(\?)|$/,
      (_n, n1) => `?${queryName}=${time},${contextFile}${n1 === '?' ? '&' : ''}`,
    )
  }
  return result
}
