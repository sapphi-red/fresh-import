import { describe, expect, test } from 'vitest'
import { relativeImportRE } from './hook-core.ts'

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
