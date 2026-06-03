import { execFile } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const here = fileURLToPath(new URL('.', import.meta.url))
const harnessPath = path.join(here, 'harness.mjs')
const fixturesDir = path.join(here, 'fixtures')

/** Absolute path to a fixture file. */
export function fixture(...segments: string[]): string {
  return path.join(fixturesDir, ...segments)
}

/** Spawn the harness in a clean `node` subprocess and parse its JSON stdout. */
export async function runHarness(args: string[]): Promise<any> {
  const { stdout } = await execFileAsync(process.execPath, [harnessPath, ...args])
  return JSON.parse(stdout)
}

/** Normalise absolute dep paths to sorted POSIX paths relative to the fixtures dir. */
export function toRelPaths(deps: string[]): string[] {
  return deps.map((dep) => path.relative(fixturesDir, dep).replaceAll(path.sep, '/')).sort()
}
