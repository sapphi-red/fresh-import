import { Module } from 'node:module'
import { describe, expect, test } from 'vitest'
import { createImporter } from './create-importer.ts'

describe('createImporter', () => {
  test('returns undefined when neither register API is available', () => {
    const originalRegister = Module.register
    const originalRegisterHooks = Module.registerHooks
    // @ts-expect-error simulate a runtime without either API
    Module.register = undefined
    // @ts-expect-error simulate a runtime without either API
    Module.registerHooks = undefined
    try {
      expect(createImporter()).toBeUndefined()
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
      expect(createImporter()).toBeDefined()
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
      expect(createImporter()).toBeDefined()
      expect(calls).toStrictEqual(['register'])
    } finally {
      Module.register = originalRegister
      Module.registerHooks = originalRegisterHooks
    }
  })
})
