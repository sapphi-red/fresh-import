// Runs inside a clean `node` subprocess (no TS runtime, no Vitest transform).
// Usage: node harness.mjs <mode> <queryName> <entry> [entry2]
//   single    <queryName> <entry>            -> { dependencies }
//   concurrent <queryName> <entryA> <entryB> -> { a, b }
//   cachebust <queryName> <entry>            -> { deps1, deps2, evalCount }
//   lazy      <queryName> <entry>            -> { dependencies }
import { pathToFileURL } from 'node:url'
import { createFreshImporter, formatTrackingQuery } from '../dist/index.js'

const [mode, queryName, ...entries] = process.argv.slice(2)

const tracker = createFreshImporter({ queryName })
if (!tracker) {
  throw new Error('Module.register unavailable in this Node version')
}

let time = 1 // deterministic, monotonically increasing per import

async function collect(contextId, entry) {
  const url = pathToFileURL(entry).href
  const t = time++
  const { dependencies } = await tracker.collect(
    contextId,
    () => import(url + formatTrackingQuery(queryName, t, contextId)),
  )
  return dependencies
}

let output
if (mode === 'single' || mode === 'lazy') {
  output = { dependencies: await collect('main', entries[0]) }
} else if (mode === 'concurrent') {
  const [a, b] = await Promise.all([collect('a', entries[0]), collect('b', entries[1])])
  output = { a, b }
} else if (mode === 'cachebust') {
  const deps1 = await collect('main', entries[0])
  const deps2 = await collect('main', entries[0])
  output = { deps1, deps2, evalCount: globalThis.__depsTrackEvalCount ?? 0 }
} else {
  throw new Error(`unknown harness mode: ${mode}`)
}

process.stdout.write(JSON.stringify(output))
