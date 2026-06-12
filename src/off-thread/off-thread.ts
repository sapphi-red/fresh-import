import { Module } from 'node:module'
import { fileURLToPath } from 'node:url'
import { MessageChannel } from 'node:worker_threads'
import { buildQueryName, formatTrackingQuery } from '../hook-core.ts'
import loaderUrl from './loader.ts?url'
import type { FreshImporter } from '../index.ts'

let nextId = 0

/**
 * Off-thread importer: registers an ESM loader in a worker thread via
 * `Module.register` and receives tracked dependencies over a `MessagePort`.
 * Used on Node versions without `Module.registerHooks`.
 */
export function createOffThreadImporter(): FreshImporter {
  const queryName = buildQueryName()
  const { port1, port2 } = new MessageChannel()
  // eslint-disable-next-line n/no-unsupported-features/node-builtins
  Module.register(loaderUrl, {
    data: { port: port2, queryName },
    transferList: [port2],
  })
  port1.unref()

  return {
    async collect(specifier: string) {
      const id = nextId++
      const depsList = new Set<string>()
      const onMessage = (e: { context: string; url: string }) => {
        if (e.context === specifier) {
          depsList.add(e.url)
        }
      }
      port1.on('message', onMessage)
      port1.unref()

      try {
        const result = await import(specifier + formatTrackingQuery(queryName, id, specifier))
        // The loader posts messages from a separate thread; flush the queue so
        // every in-flight dependency message is processed before we read it.
        await new Promise<void>((resolve) => setImmediate(resolve))
        const dependencies = [...depsList]
          .filter((url) => url.startsWith('file:'))
          .map((url) => fileURLToPath(url))
        return { result, dependencies }
      } finally {
        port1.off('message', onMessage)
      }
    },
  }
}
