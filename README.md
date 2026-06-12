# fresh-import

[![npm version](https://badge.fury.io/js/fresh-import.svg)](https://badge.fury.io/js/fresh-import) ![CI](https://github.com/sapphi-red/fresh-import/workflows/CI/badge.svg) [![MIT License](http://img.shields.io/badge/license-MIT-blue.svg?style=flat)](LICENSE)

Import an ESM entry in its own fresh module graph, separate from Node's module cache and from other concurrent imports, and get back the statically-imported relative dependency files it pulled in.

> [!NOTE]
> This isolates the module graph, not the realm, so imported code still shares process globals. It is not a security sandbox.

## Install

```shell
pnpm add fresh-import # npm install fresh-import
```

## Usage

```ts
import { pathToFileURL } from 'node:url'
import { freshImport } from 'fresh-import'

const entry = '/abs/path/to/entry.js'
const url = pathToFileURL(entry).href

const imported = freshImport(url)
if (imported) {
  const { result, dependencies } = await imported
  // result: the imported module namespace
  // dependencies: absolute file paths of every statically-imported relative dep
}
```

Pass a `file:` URL string (use `pathToFileURL` to convert an absolute path). Each `freshImport` call imports the entry in a fresh module graph; concurrent calls stay isolated from one another, and a later call re-evaluates the entry rather than serving a cached module. The underlying importer (and its resolution hook) is created once on first use and reused across calls.

`freshImport` uses `Module.registerHooks` (Node 22.15+/23.5+) when available and otherwise `Module.register` (Node 20.6+). On runtimes that provide neither, it returns `undefined` so you can fall back.

## Behavior & limitations

- Tracks **relative** imports (`./`, `../`) only; bare packages and Node builtins are ignored.
- Tracks **statically-imported** dependencies that load while the entry is evaluating. Dependencies imported later (e.g. a deferred dynamic `import()`) are not tracked.
