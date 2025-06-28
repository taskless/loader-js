---
"@taskless/loader": patch
---

- **Load a directory** - If you specify `TASKLESS_DIRECTORY` (autoloader), or use `directory` in the programatic API, the loader will attempt to load any installed packs from disk in addition to any network packs. This can be used to load packs without interacting with Taskless Cloud.

- **Deprecation** of `TASKLESS_OPTIONS` - The taskless options environment variable has been deprecated in favor of using individual `TASKLESS_*` flags.
  - `network` and `logging` are now expressed as `TASKLESS_OUTPUT` and can be expressed as a comma separated list. For example `TASKLESS_OUTPUT=network,console`. The default with an API key is `network`, and the default without an API key is `console`. If this value is set, it will override the default behavior. `network` and `logging` will be removed in the next release.
