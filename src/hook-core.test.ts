import type { ResolveFnOutput } from 'node:module'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { describe, expect, test } from 'vitest'
import {
  buildQueryName,
  buildQueryRE,
  formatTrackingQuery,
  relativeImportRE,
  trackResolved,
} from './hook-core.ts'

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

describe('trackResolved', () => {
  const queryName = 'fresh-import-test'
  const queryRE = buildQueryRE(queryName)
  const fileURL = (file: string) => pathToFileURL(path.resolve(file)).href
  const parentURL =
    fileURL('/workspace/app/config.js') + formatTrackingQuery(queryName, 1, 'config')

  test.each([
    ['@org/utils/plugin.js', fileURL('/workspace/utils/plugin.js')],
    ['@org/utils', 'file:///C:/workspace/utils/index.js'],
    ['@org/utils', fileURL('/workspace/my_node_modules/utils/index.js')],
    ['@org/utils', fileURL('/workspace/utils/index.js') + '?dir=/node_modules/'],
    ['./local.js', fileURL('/workspace/app/local.js')],
    ['./local.js', fileURL('/workspace/app/node_modules/pkg/local.js')],
  ])('tracks %s resolved to %s', (specifier, url) => {
    const dependencies: string[] = []
    const result = trackResolved(
      specifier,
      { parentURL, conditions: [], importAttributes: {} },
      { url, format: 'module' },
      queryName,
      queryRE,
      (_context, dependency) => dependencies.push(dependency),
    )
    expect(dependencies).toEqual([url])
    expect(result.url).toContain(`${queryName}=1,config`)
  })

  test.each([
    ['pkg', fileURL('/workspace/app/node_modules/pkg/index.js'), 'module'],
    ['pkg', fileURL('/workspace/node_modules/.pnpm/pkg@1.0.0/node_modules/pkg/index.js'), 'module'],
    ['pkg', 'file:///C:/workspace/node_modules/pkg/index.js', 'module'],
    [
      'pkg',
      fileURL('/workspace/node_modules/pkg/index.js').replace('/node_modules/', '/%6eode_modules/'),
      'module',
    ],
    ['fs', 'node:fs', 'builtin'],
    ['node:fs', 'node:fs', 'builtin'],
    ['data:text/javascript,export default 1', 'data:text/javascript,export default 1', 'module'],
  ])('does not track %s resolved to %s', (specifier, url, format) => {
    const dependencies: string[] = []
    const result = trackResolved(
      specifier,
      { parentURL, conditions: [], importAttributes: {} },
      { url, format } as ResolveFnOutput,
      queryName,
      queryRE,
      (_context, dependency) => dependencies.push(dependency),
    )
    expect(dependencies).toEqual([])
    expect(result.url).toBe(url)
  })

  test('does not track packages imported by an untracked parent', () => {
    const url = fileURL('/workspace/utils/index.js')
    const dependencies: string[] = []
    const result = trackResolved(
      '@org/utils',
      { parentURL: fileURL('/workspace/app/untracked.js'), conditions: [], importAttributes: {} },
      { url, format: 'module' },
      queryName,
      queryRE,
      (_context, dependency) => dependencies.push(dependency),
    )
    expect(dependencies).toEqual([])
    expect(result.url).toBe(url)
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
