---
"fresh-import": patch
---

Derive the tracking query name from a per-instance random value (`fresh-import-<instance>`). Previously two copies of the same build loaded into one process (e.g. Vite bundles `fresh-import` while another package uses a separately bundled copy) registered the same query name, so only the first-registered hook captured the imports. A random value unique to each loaded module instance keeps their hooks distinct. This replaces the build-time hash, which could not disambiguate two instances of the same build.
