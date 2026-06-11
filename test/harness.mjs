// Runs inside a clean `node` subprocess (no TS runtime, no Vitest transform).
// Usage: node harness.mjs <mode> <queryName> <entry> [entry2]
//   single    <queryName> <entry>            -> { dependencies }
//   concurrent <queryName> <entryA> <entryB> -> { a, b }
//   cachebust <queryName> <entry>            -> { deps1, deps2, evalCount }
//   lazy      <queryName> <entry>            -> { dependencies }
import { pathToFileURL } from 'node:url'
import { createFreshImporter } from '../dist/index.js'

const [mode, queryName, ...entries] = process.argv.slice(2)

const tracker = createFreshImporter({ queryName })
if (!tracker) {
  throw new Error('Module.register unavailable in this Node version')
}

async function collect(entry) {
  const { dependencies } = await tracker.collect(pathToFileURL(entry).href)
  return dependencies
}

let output
if (mode === 'single' || mode === 'lazy') {
  output = { dependencies: await collect(entries[0]) }
} else if (mode === 'concurrent') {
  const [a, b] = await Promise.all([collect(entries[0]), collect(entries[1])])
  output = { a, b }
} else if (mode === 'cachebust') {
  const deps1 = await collect(entries[0])
  const deps2 = await collect(entries[0])
  output = { deps1, deps2, evalCount: globalThis.__depsTrackEvalCount ?? 0 }
} else {
  throw new Error(`unknown harness mode: ${mode}`)
}

process.stdout.write(JSON.stringify(output))
