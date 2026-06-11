import { describe, expect, test } from 'vitest'
import { formatTrackingQuery, relativeImportRE } from './hook-core.ts'

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

describe('formatTrackingQuery', () => {
  test('builds ?<queryName>=<time>,<context>', () => {
    expect(formatTrackingQuery('t', 123, 'main')).toBe('?t=123,main')
  })

  test('honours a custom query name', () => {
    expect(formatTrackingQuery('v', 999, 'a')).toBe('?v=999,a')
  })
})
