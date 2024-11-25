---
"@taskless/loader": patch
---

(💥 BREAKING) Adds support for remote wasm files - In order to avoid inlining a ton of WebAssembly in the configuration and manifest files, Taskless now supports remote loading of Wasm files. This both improves the load time of applications and makes it easier to bring your own Wasm files to Taskless.
