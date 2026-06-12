import { describe, expect, test } from 'vitest'
import { buildQueryName, formatTrackingQuery, relativeImportRE } from './hook-core.ts'

describe('relativeImportRE', () => {
  test('matches ./ and ../ (posix and windows), rejects bare/builtin', () => {
    expect(relativeImportRE.test('./a.js')).toBe(true)
    expect(relativeImportRE.test('../a.js')).toBe(true)
    expect(relativeImportRE.test('.\\a.js')).toBe(true)
    expect(relativeImportRE.test('..\\a.js')).toBe(true)
    expect(relativeImportRE.test('a.js')).toBe(false)
    expect(relativeImportRE.test('node:fs')).toBe(false)
  })
})

describe('buildQueryName', () => {
  // The random instance id is generated once at module load, so the name is
  // stable across calls within a process.
  test('is prefixed with fresh-import- and stable across calls', () => {
    const name = buildQueryName()
    expect(name).toMatch(/^fresh-import-/)
    expect(buildQueryName()).toBe(name)
  })
})

describe('formatTrackingQuery', () => {
  test('builds ?<queryName>=<time>,<context>', () => {
    expect(formatTrackingQuery('fresh-import-abcd1234', 123, 'main')).toBe(
      '?fresh-import-abcd1234=123,main',
    )
  })
})
