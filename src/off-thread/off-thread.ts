import { Module } from 'node:module'
import { fileURLToPath } from 'node:url'
import { MessageChannel } from 'node:worker_threads'
import loaderUrl from './loader.ts?url'
import type { FreshImporter } from '../index.ts'

/**
 * Off-thread importer: registers an ESM loader in a worker thread via
 * `Module.register` and receives tracked dependencies over a `MessagePort`.
 * Used on Node versions without `Module.registerHooks`.
 */
export function createOffThreadImporter(queryName: string): FreshImporter {
  const { port1, port2 } = new MessageChannel()
  // eslint-disable-next-line n/no-unsupported-features/node-builtins
  Module.register(loaderUrl, {
    data: { port: port2, queryName },
    transferList: [port2],
  })
  port1.unref()

  return {
    async collect(context, importFn) {
      const depsList = new Set<string>()
      const onMessage = (e: { context: string; url: string }) => {
        if (e.context === context) {
          depsList.add(e.url)
        }
      }
      port1.on('message', onMessage)
      port1.unref()

      try {
        const result = await importFn()
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
