import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, onTestFinished, test } from 'vitest'
import { runHarness } from './helpers.ts'

function createLinkedPackage(format: 'commonjs' | 'module') {
  const root = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), 'fresh-import-cache-boundary-')),
  )
  onTestFinished(() => fs.rmSync(root, { recursive: true, force: true }))
  const packageDir = path.join(root, 'utils')
  const nodeModules = path.join(root, 'app', 'node_modules')
  fs.mkdirSync(packageDir)
  fs.mkdirSync(nodeModules, { recursive: true })
  const filename = format === 'commonjs' ? 'index.cjs' : 'index.js'
  const dependency = path.join(packageDir, filename)
  fs.writeFileSync(
    path.join(packageDir, 'package.json'),
    JSON.stringify({ name: 'utils', type: format, exports: `./${filename}` }),
  )
  fs.writeFileSync(
    dependency,
    'globalThis.__depsTrackEvalCount = (globalThis.__depsTrackEvalCount ?? 0) + 1\n',
  )
  fs.symlinkSync(packageDir, path.join(nodeModules, 'utils'), 'junction')
  const entry = path.join(root, 'app', 'entry.mjs')
  return { dependency, entry, nodeModules }
}

// These tests document existing cache boundaries, not additional freshness guarantees.
describe.each(['cachebust', 'cachebust-off-thread'])('cache boundaries (%s)', (mode) => {
  test.each(['utils', '../utils/index.cjs'])(
    'reports a CommonJS dependency but does not re-evaluate it (%s)',
    async (specifier) => {
      const { dependency, entry } = createLinkedPackage('commonjs')
      fs.writeFileSync(entry, `import '${specifier}'\n`)

      const { deps1, deps2, evalCount } = await runHarness([mode, entry])
      expect(deps1).toEqual([dependency])
      expect(deps2).toEqual([dependency])
      // Tracking queries create fresh ESM URLs, but do not clear require.cache.
      expect(evalCount).toBe(1)
    },
  )

  test('does not track a workspace package reached through an installed parent', async () => {
    const { entry, nodeModules } = createLinkedPackage('module')
    const presetDir = path.join(nodeModules, 'preset')
    fs.mkdirSync(presetDir)
    fs.writeFileSync(
      path.join(presetDir, 'package.json'),
      JSON.stringify({ name: 'preset', type: 'module', exports: './index.js' }),
    )
    fs.writeFileSync(path.join(presetDir, 'index.js'), "import 'utils'\n")
    fs.writeFileSync(entry, "import 'preset'\n")

    const { deps1, deps2, evalCount } = await runHarness([mode, entry])
    expect(deps1).toEqual([])
    expect(deps2).toEqual([])
    // The installed parent is untagged and remains in Node's shared cache,
    // so its local child is outside the fresh graph too.
    expect(evalCount).toBe(1)
  })
})
