# fresh-import

Import an ESM entry in its own fresh module graph, separate from Node's module cache and from other concurrent imports, and get back the statically-imported relative dependency files it pulled in.

> Note: this isolates the module graph, not the realm, so imported code still shares process globals. It is not a security sandbox.

## Usage

```ts
import { pathToFileURL } from 'node:url'
import { createFreshImporter, formatTrackingQuery } from 'fresh-import'

const importer = createFreshImporter({ queryName: 't' })
if (!importer) {
  // Node < 18.19.0 / 20.6.0: Module.register is unavailable
}

const entry = '/abs/path/to/entry.js'
const url = pathToFileURL(entry).href
const time = Date.now()

const { result, dependencies } = await importer.collect(
  'main', // context id: any opaque token, used to isolate concurrent imports
  () => import(url + formatTrackingQuery('t', time, 'main')),
)
// result: the imported module namespace
// dependencies: absolute file paths of every statically-imported relative dep
```

## Caller contract

`collect` does not build the import for you. You should append the tracking query to the entry URL yourself, in this exact format:

```
?<queryName>=<time>,<context>
```

`formatTrackingQuery(queryName, time, context)` produces exactly this string. The `queryName` you pass to `createFreshImporter` must match the one in the query.

## Behavior & limitations

- Tracks **relative** imports (`./`, `../`) only; bare packages and Node builtins are ignored.
- Tracks **statically-imported** dependencies that load while the entry is evaluating. Dependencies imported later (e.g. a deferred dynamic `import()`) are not tracked.
- Requires Node >= 18.19.0 (for `Module.register`)
