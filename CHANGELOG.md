# fresh-import

## 0.2.1

### Patch Changes

- [#8](https://github.com/sapphi-red/fresh-import/pull/8) [`113bdb8`](https://github.com/sapphi-red/fresh-import/commit/113bdb8f871bd9dc898cff27caa4311f70161961) Thanks [@sapphi-red](https://github.com/sapphi-red)! - Derive the tracking query name from a per-instance random value (`fresh-import-<instance>`). Previously two copies of the same build loaded into one process (e.g. Vite bundles `fresh-import` while another package uses a separately bundled copy) registered the same query name, so only the first-registered hook captured the imports. A random value unique to each loaded module instance keeps their hooks distinct. This replaces the build-time hash, which could not disambiguate two instances of the same build.

## 0.2.0

### Minor Changes

- [#6](https://github.com/sapphi-red/fresh-import/pull/6) [`a19d7d9`](https://github.com/sapphi-red/fresh-import/commit/a19d7d9c1ed261929428fc48f641a9afe6ecdfdb) Thanks [@sapphi-red](https://github.com/sapphi-red)! - Replace `createFreshImporter` with a `freshImport(specifier)` function and remove the `queryName` option.
  - `freshImport(specifier)` imports an entry in a fresh module graph and resolves to `{ result, dependencies }`. It lazily creates and reuses a single underlying importer (registering the resolution hook once) instead of one per call. On runtimes that provide neither `Module.registerHooks` nor `Module.register` (e.g. non-Node), it returns `undefined`, mirroring `createFreshImporter`'s old `undefined` return.
  - The tracking query name is now derived internally as `fresh-import-<hash>` (a build-time hash of the output), so the `queryName` option and the `FreshImporterOptions` type are gone.

  ```diff
  -import { createFreshImporter } from 'fresh-import'
  -const importer = createFreshImporter()
  -const { result, dependencies } = await importer.collect(url)
  +import { freshImport } from 'fresh-import'
  +const { result, dependencies } = await freshImport(url)
  ```

## 0.1.0

### Minor Changes

- [#4](https://github.com/sapphi-red/fresh-import/pull/4) [`db48f43`](https://github.com/sapphi-red/fresh-import/commit/db48f43cf693b318dcfe76509088541a826bb1a3) Thanks [@sapphi-red](https://github.com/sapphi-red)! - Simplify interface by running the dynamic import internally.

### Patch Changes

- [`e21d32b`](https://github.com/sapphi-red/fresh-import/commit/e21d32b2b0f01066964b0c19b33fe6df0738dfdd) Thanks [@sapphi-red](https://github.com/sapphi-red)! - use `t` as the default value of `queryName` option

## 0.0.2

### Patch Changes

- 1647ecc: setup trusted publishing
