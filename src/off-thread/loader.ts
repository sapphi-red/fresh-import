import type { MessagePort } from 'node:worker_threads'
import type { InitializeHook, ResolveHook } from 'node:module'
import { buildQueryRE, trackResolved } from '../hook-core.ts'

interface InitializeData {
  port: MessagePort
  queryName: string
}

let port: MessagePort
let queryName: string
let queryRE: RegExp

export const initialize: InitializeHook = async (data: InitializeData) => {
  port = data.port
  queryName = data.queryName
  queryRE = buildQueryRE(queryName)
}

export const resolve: ResolveHook = async (specifier, context, nextResolve) => {
  const result = await nextResolve(specifier, context)
  return trackResolved(specifier, context, result, queryName, queryRE, (ctx, url) => {
    port.postMessage({ context: ctx, url })
  })
}
