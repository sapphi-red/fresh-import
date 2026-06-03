import { Module } from 'node:module'
import { MessageChannel } from 'node:worker_threads'
import { fileURLToPath } from 'node:url'
import loaderSource from './loader.ts?inline'

const loaderUrl = `data:text/javascript,${loaderSource.replace(
  /[%#?\t\n\r]/g,
  (c) => `%${c.charCodeAt(0).toString(16).padStart(2, '0').toUpperCase()}`,
)}`

export interface FreshImporterOptions {
  /**
   * Query parameter name used to tag the import graph
   *
   * @example 't'
   */
  queryName: string
}

export interface FreshImporter {
  collect<T>(
    context: string,
    importFn: () => Promise<T>,
  ): Promise<{ result: T; dependencies: string[] }>
}

/**
 * Build the entry query the loader expects. The caller appends this to the
 * entry's file URL before importing, e.g.
 * `import(url + formatTrackingQuery(queryName, Date.now(), context))`.
 */
export function formatTrackingQuery(queryName: string, time: number, context: string): string {
  return `?${queryName}=${time},${context}`
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

  // `register` only exists in Node.js 18.19.0+, 20.6.0+. Bail out otherwise.
  // eslint-disable-next-line n/no-unsupported-features/node-builtins
  const register = Module.register
  if (!register) {
    return undefined
  }

  const { port1, port2 } = new MessageChannel()
  register(loaderUrl, {
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
