import { describe, expect, test } from 'vitest'
import { fixture, runHarness, toRelPaths } from './helpers.ts'

describe('deps tracking (native loader)', () => {
  test('tracks a directly-imported relative dependency', async () => {
    const { dependencies } = await runHarness(['single', 't', fixture('basic/entry.js')])
    expect(toRelPaths(dependencies)).toStrictEqual(['basic/a.js'])
  })

  test('tracks dependencies transitively through the graph', async () => {
    const { dependencies } = await runHarness(['single', 't', fixture('transitive/entry.js')])
    expect(toRelPaths(dependencies)).toStrictEqual([
      'transitive/a.js',
      'transitive/b.js',
      'transitive/nested/c.js',
    ])
  })

  test('ignores builtin and bare-package imports, tracks only relative files', async () => {
    const { dependencies } = await runHarness(['single', 't', fixture('ignores/entry.js')])
    expect(toRelPaths(dependencies)).toStrictEqual(['ignores/local.js'])
  })

  test('deduplicates a diamond dependency', async () => {
    const { dependencies } = await runHarness(['single', 't', fixture('diamond/entry.js')])
    // c.js is imported by both a.js and b.js but must appear only once
    expect(toRelPaths(dependencies)).toStrictEqual(['diamond/a.js', 'diamond/b.js', 'diamond/c.js'])
  })

  test('keeps concurrent collects isolated by context', async () => {
    const { a, b } = await runHarness([
      'concurrent',
      't',
      fixture('concurrent/a/entry.js'),
      fixture('concurrent/b/entry.js'),
    ])
    expect(toRelPaths(a)).toStrictEqual(['concurrent/a/x.js', 'concurrent/shared.js'])
    expect(toRelPaths(b)).toStrictEqual(['concurrent/b/y.js', 'concurrent/shared.js'])
  })

  test('re-imports (does not serve a cached module) on a new collect', async () => {
    const { deps1, deps2, evalCount } = await runHarness([
      'cachebust',
      't',
      fixture('cachebust/entry.js'),
    ])
    expect(toRelPaths(deps1)).toStrictEqual(['cachebust/a.js'])
    expect(toRelPaths(deps2)).toStrictEqual(['cachebust/a.js'])
    // distinct time => distinct URL => the entry is evaluated twice
    expect(evalCount).toBe(2)
  })

  test('does not track deps imported after the entry finishes evaluating', async () => {
    const { dependencies } = await runHarness(['lazy', 't', fixture('lazy/entry.js')])
    // eager.js is tracked; the deferred dynamic import of lazy-dep.js is not
    expect(toRelPaths(dependencies)).toStrictEqual(['lazy/eager.js'])
  })

  test('works with a non-default query name', async () => {
    const { dependencies } = await runHarness([
      'single',
      'v', // custom queryName, used by both the tracker and the entry query
      fixture('basic/entry.js'),
    ])
    expect(toRelPaths(dependencies)).toStrictEqual(['basic/a.js'])
  })
})
