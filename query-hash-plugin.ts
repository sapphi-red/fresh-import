import { createHash } from 'node:crypto'
import type { OutputBundle, OutputChunk } from 'rolldown'

/**
 * Placeholder emitted by `buildQueryName` in the source; the plugin below swaps
 * it for a hash of the built output so the `fresh-import-<hash>` tracking query
 * name reflects the actual implementation. Left untouched when running the
 * source unbundled (e.g. tests).
 */
export const QUERY_HASH_PLACEHOLDER = '__FRESH_IMPORT_QUERY_HASH__'

/**
 * Derives a single hash from every emitted chunk and stamps it into whichever
 * chunks carry `QUERY_HASH_PLACEHOLDER`. Hashing the whole bundle means a change
 * anywhere in the output yields a new query name, so two different builds loaded
 * into the same process don't collide.
 */
export function queryHashPlugin() {
  return {
    name: 'query-hash',
    generateBundle(_options: unknown, bundle: OutputBundle): void {
      const chunks = Object.values(bundle)
        .filter((output): output is OutputChunk => output.type === 'chunk')
        .sort((a, b) => (a.fileName < b.fileName ? -1 : a.fileName > b.fileName ? 1 : 0))

      // Hash every chunk with the placeholder still in place (a fixed-length
      // token), so the digest is deterministic and depends only on the rest of
      // the code.
      const digest = createHash('sha256')
      for (const chunk of chunks) {
        digest.update(chunk.code)
      }
      const hash = digest.digest('hex').slice(0, 8)

      for (const chunk of chunks) {
        chunk.code = chunk.code.replaceAll(QUERY_HASH_PLACEHOLDER, hash)
      }
    },
  }
}
