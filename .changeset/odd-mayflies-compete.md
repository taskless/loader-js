---
"@taskless/loader": patch
---

- BREAKING - Upgrades schema to pre2 - This change enables the new `pre2` schema which uses user configuration and pushes responsibility of capture to the individual wasm modules. This loader can run `pre1` wasm files and manifests without issue, but makes new endpoint requests for configuration. Modules requested with this version of the loader will automaticallt receivee `pre2` manifests upgraded through the web. Local manifests will need to be updated manually. Types are available in `src/__generated__` for inspection
