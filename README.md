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
import { createFreshImporter } from 'fresh-import'

const importer = createFreshImporter({ queryName: 't' })
if (!importer) {
  // Node < 18.19.0 / 20.6.0: Module.register is unavailable
}

const entry = '/abs/path/to/entry.js'
const url = pathToFileURL(entry).href

const { result, dependencies } = await importer.collect(url)
// result: the imported module namespace
// dependencies: absolute file paths of every statically-imported relative dep
```

Pass a `file:` URL string (use `pathToFileURL` to convert an absolute path). Each `collect` call imports the entry in a fresh module graph; concurrent calls stay isolated from one another, and a later call re-evaluates the entry rather than serving a cached module.

## queryName

`collect` tags the import graph by appending a tracking query to the specifier internally, in this format:

```
?<queryName>=<id>,<context>
```

`queryName` is the query parameter name used for that tag — pick one that won't collide with query params your entry URLs already carry.

## Behavior & limitations

- Tracks **relative** imports (`./`, `../`) only; bare packages and Node builtins are ignored.
- Tracks **statically-imported** dependencies that load while the entry is evaluating. Dependencies imported later (e.g. a deferred dynamic `import()`) are not tracked.
