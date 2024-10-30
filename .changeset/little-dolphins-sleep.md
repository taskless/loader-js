---
"@taskless/loader": patch
---

BREAKING: Default packs must be opted-in via the programatic API. This change was introduced so that in local programatic development (and when running "packCheck") you are not forced to adopt the default packages. In the autoloading path, the call to addDefaultPacks happens automatically.
