import { Module } from 'node:module'
import { describe, expect, test } from 'vitest'
import { createFreshImporter, formatTrackingQuery } from './index.ts'

describe('formatTrackingQuery', () => {
  test('builds ?<queryName>=<time>,<context>', () => {
    expect(formatTrackingQuery('t', 123, 'main')).toBe('?t=123,main')
  })

  test('honours a custom query name', () => {
    expect(formatTrackingQuery('v', 999, 'a')).toBe('?v=999,a')
  })
})

describe('createFreshImporter', () => {
  test('returns undefined when Module.register is unavailable', () => {
    const original = Module.register
    // @ts-expect-error simulate an older Node without register
    Module.register = undefined
    try {
      expect(createFreshImporter({ queryName: 't' })).toBeUndefined()
    } finally {
      Module.register = original
    }
  })
})
