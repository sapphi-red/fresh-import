import { build } from 'rolldown'
import type { PluginContext, PluginContextResolveOptions } from 'rolldown'

const URL_QUERY = '?url'
const VIRTUAL_PREFIX = '\0url:'

/**
 * Resolves any `import url from './some-file.ts?url'` to a `data:` URL whose
 * payload is that file bundled with rolldown (so its own imports are inlined).
 */
export function urlLoaderPlugin() {
  return {
    name: 'url-source',
    enforce: 'pre' as const,
    resolveId: {
      filter: { id: /\?url$/ },
      async handler(
        this: PluginContext,
        id: string,
        importer: string | undefined,
        opts: PluginContextResolveOptions | undefined,
      ) {
        const specifier = id.slice(0, -URL_QUERY.length)
        const resolved = await this.resolve(specifier, importer, opts)
        if (!resolved) return null
        return VIRTUAL_PREFIX + resolved.id
      },
    },
    load: {
      // oxlint-disable-next-line no-control-regex
      filter: { id: /^\0url:/ },
      async handler(id: string) {
        const file = id.slice(VIRTUAL_PREFIX.length)
        // Fresh options (no plugins) → the nested build won't see `?url` and recurse.
        const { output } = await build({
          input: file,
          write: false,
          platform: 'node',
          output: { format: 'esm' },
        })
        const { code } = output[0]
        const dataUrl = `data:text/javascript,${code.replace(
          /[%#?\t\n\r]/g,
          (c) => `%${c.charCodeAt(0).toString(16).padStart(2, '0').toUpperCase()}`,
        )}`
        return `export default ${JSON.stringify(dataUrl)}`
      },
    },
  }
}
