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
  test('returns undefined when neither register API is available', () => {
    const originalRegister = Module.register
    const originalRegisterHooks = Module.registerHooks
    // @ts-expect-error simulate an older Node without either API
    Module.register = undefined
    // @ts-expect-error simulate an older Node without either API
    Module.registerHooks = undefined
    try {
      expect(createFreshImporter({ queryName: 't' })).toBeUndefined()
    } finally {
      Module.register = originalRegister
      Module.registerHooks = originalRegisterHooks
    }
  })

  test('prefers registerHooks when available', () => {
    const originalRegister = Module.register
    const originalRegisterHooks = Module.registerHooks
    const calls: string[] = []
    Module.registerHooks = () => {
      calls.push('hooks')
      return { deregister() {} }
    }
    Module.register = () => {
      calls.push('register')
    }
    try {
      expect(createFreshImporter({ queryName: 't' })).toBeDefined()
      expect(calls).toStrictEqual(['hooks'])
    } finally {
      Module.register = originalRegister
      Module.registerHooks = originalRegisterHooks
    }
  })

  test('falls back to register when registerHooks is unavailable', () => {
    const originalRegister = Module.register
    const originalRegisterHooks = Module.registerHooks
    const calls: string[] = []
    // @ts-expect-error simulate Node without the on-thread API
    Module.registerHooks = undefined
    Module.register = () => {
      calls.push('register')
    }
    try {
      expect(createFreshImporter({ queryName: 't' })).toBeDefined()
      expect(calls).toStrictEqual(['register'])
    } finally {
      Module.register = originalRegister
      Module.registerHooks = originalRegisterHooks
    }
  })
})
