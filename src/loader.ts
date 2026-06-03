import type { MessagePort } from 'node:worker_threads'
import type { InitializeHook, ResolveHook } from 'node:module'

interface InitializeData {
  port: MessagePort
  queryName: string
}

const relativeImportRE = /^\.{1,2}(?:\/|\\)/

let port: MessagePort
let queryName: string
let queryRE: RegExp

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export const initialize: InitializeHook = async (data: InitializeData) => {
  port = data.port
  queryName = data.queryName
  // matches `?<name>=<time>,<context>` or `&<name>=<time>,<context>`
  queryRE = new RegExp(`(?:\\?|&)${escapeRegExp(queryName)}=(\\d+),([^&]+)(?:&|$)`)
}

export const resolve: ResolveHook = async (specifier, context, nextResolve) => {
  const isRelativeImport = relativeImportRE.test(specifier)
  const result = await nextResolve(specifier, context)
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
    port.postMessage({ context: contextFile, url: result.url })

    result.url = result.url.replace(
      /(\?)|$/,
      (_n, n1) => `?${queryName}=${time},${contextFile}${n1 === '?' ? '&' : ''}`,
    )
  }
  return result
}
