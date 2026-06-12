---
"fresh-import": minor
---

Replace `createFreshImporter` with a `freshImport(specifier)` function and remove the `queryName` option.

- `freshImport(specifier)` imports an entry in a fresh module graph and resolves to `{ result, dependencies }`. It lazily creates and reuses a single underlying importer (registering the resolution hook once) instead of one per call. On runtimes that provide neither `Module.registerHooks` nor `Module.register` (e.g. non-Node), it returns `undefined`, mirroring `createFreshImporter`'s old `undefined` return.
- The tracking query name is now derived internally as `fresh-import-<hash>` (a build-time hash of the output), so the `queryName` option and the `FreshImporterOptions` type are gone.

```diff
-import { createFreshImporter } from 'fresh-import'
-const importer = createFreshImporter()
-const { result, dependencies } = await importer.collect(url)
+import { freshImport } from 'fresh-import'
+const { result, dependencies } = await freshImport(url)
```
