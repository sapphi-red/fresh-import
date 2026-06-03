import { readFileSync } from 'node:fs'
import type { PluginContext, PluginContextResolveOptions } from 'rolldown'
import { transformSync } from 'rolldown/utils'

const INLINE_QUERY = '?inline'
const VIRTUAL_PREFIX = '\0inline:'

/**
 * Resolves any `import source from './some-file.ts?inline'` to that file's
 * compiled source as a default-exported string.
 */
export function inlineLoaderPlugin() {
  return {
    name: 'inline-source',
    enforce: 'pre' as const,
    resolveId: {
      filter: { id: /\?inline$/ },
      async handler(
        this: PluginContext,
        id: string,
        importer: string | undefined,
        opts: PluginContextResolveOptions | undefined,
      ) {
        const specifier = id.slice(0, -INLINE_QUERY.length)
        const resolved = await this.resolve(specifier, importer, opts)
        if (!resolved) return null
        return VIRTUAL_PREFIX + resolved.id
      },
    },
    load: {
      // oxlint-disable-next-line no-control-regex
      filter: { id: /^\0inline:/ },
      handler(id: string) {
        const file = id.slice(VIRTUAL_PREFIX.length)
        const source = readFileSync(file, 'utf8')
        const { code } = transformSync(file, source)
        return `export default ${JSON.stringify(code)}`
      },
    },
  }
}
