import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, onTestFinished, test } from 'vitest'
import { fixture, runHarness, toRelPaths } from './helpers.ts'

describe('deps tracking (native loader)', () => {
  test('tracks a directly-imported relative dependency', async () => {
    const { dependencies } = await runHarness(['single', fixture('basic/entry.js')])
    expect(toRelPaths(dependencies)).toStrictEqual(['basic/a.js'])
  })

  test('tracks dependencies transitively through the graph', async () => {
    const { dependencies } = await runHarness(['single', fixture('transitive/entry.js')])
    expect(toRelPaths(dependencies)).toStrictEqual([
      'transitive/a.js',
      'transitive/b.js',
      'transitive/nested/c.js',
    ])
  })

  test('ignores builtins and installed packages, tracks relative files', async () => {
    const { dependencies } = await runHarness(['single', fixture('ignores/entry.js')])
    expect(toRelPaths(dependencies)).toStrictEqual(['ignores/local.js'])
  })

  test.each(['cachebust', 'cachebust-off-thread'])(
    'tracks and re-evaluates a symlinked local package (%s)',
    async (mode) => {
      const root = fs.realpathSync(
        fs.mkdtempSync(path.join(os.tmpdir(), 'fresh-import-workspace-')),
      )
      onTestFinished(() => fs.rmSync(root, { recursive: true, force: true }))
      const packageDir = path.join(root, 'utils')
      const nodeModules = path.join(root, 'app', 'node_modules')
      fs.mkdirSync(packageDir)
      fs.mkdirSync(nodeModules, { recursive: true })
      fs.writeFileSync(
        path.join(packageDir, 'package.json'),
        JSON.stringify({ name: 'utils', type: 'module', exports: './index.js' }),
      )
      fs.writeFileSync(path.join(packageDir, 'index.js'), "export * from './nested.js'\n")
      fs.writeFileSync(
        path.join(packageDir, 'nested.js'),
        'globalThis.__depsTrackEvalCount = (globalThis.__depsTrackEvalCount ?? 0) + 1\n',
      )
      fs.symlinkSync(packageDir, path.join(nodeModules, 'utils'), 'junction')
      const entry = path.join(root, 'app', 'entry.mjs')
      fs.writeFileSync(entry, "import 'utils'\n")

      const { deps1, deps2, evalCount } = await runHarness([mode, entry])
      const expected = [
        path.join(packageDir, 'index.js'),
        path.join(packageDir, 'nested.js'),
      ].sort()
      expect(deps1.sort()).toEqual(expected)
      expect(deps2.sort()).toEqual(expected)
      expect(evalCount).toBe(2)
    },
  )

  test('deduplicates a diamond dependency', async () => {
    const { dependencies } = await runHarness(['single', fixture('diamond/entry.js')])
    // c.js is imported by both a.js and b.js but must appear only once
    expect(toRelPaths(dependencies)).toStrictEqual(['diamond/a.js', 'diamond/b.js', 'diamond/c.js'])
  })

  test('keeps concurrent collects isolated by context', async () => {
    const { a, b } = await runHarness([
      'concurrent',
      fixture('concurrent/a/entry.js'),
      fixture('concurrent/b/entry.js'),
    ])
    expect(toRelPaths(a)).toStrictEqual(['concurrent/a/x.js', 'concurrent/shared.js'])
    expect(toRelPaths(b)).toStrictEqual(['concurrent/b/y.js', 'concurrent/shared.js'])
  })

  test('re-imports (does not serve a cached module) on a new collect', async () => {
    const { deps1, deps2, evalCount } = await runHarness([
      'cachebust',
      fixture('cachebust/entry.js'),
    ])
    expect(toRelPaths(deps1)).toStrictEqual(['cachebust/a.js'])
    expect(toRelPaths(deps2)).toStrictEqual(['cachebust/a.js'])
    // distinct time => distinct URL => the entry is evaluated twice
    expect(evalCount).toBe(2)
  })

  test('does not track deps imported after the entry finishes evaluating', async () => {
    const { dependencies } = await runHarness(['lazy', fixture('lazy/entry.js')])
    // eager.js is tracked; the deferred dynamic import of lazy-dep.js is not
    expect(toRelPaths(dependencies)).toStrictEqual(['lazy/eager.js'])
  })
})
