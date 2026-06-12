---
"fresh-import": minor
---

Remove the `queryName` option. The tracking query name is now derived internally as `fresh-import-<hash>`, where `<hash>` is a hash of the tagging implementation, so distinct implementations (e.g. two versions of this package in one process) don't collide. `createFreshImporter` takes no arguments, and the `FreshImporterOptions` type has been removed.
