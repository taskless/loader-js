---
"@taskless/loader": patch
---

Moves to wasm plugin system (Breaking Change)

Previously, Taskless plugins were small Lua scripts that ran within a [wasmoon](https://github.com/ceifa/wasmoon) VM. Unfortunately, Lua VMs are [not](https://github.com/glejeune/ruby-lua) [consistent](https://github.com/Shopify/go-lua) [across](https://github.com/luaj/luaj) [languages](https://github.com/mlua-rs/rlua). This makes it impossible to gaurentee a plugin you (or we) write will work consistently across all platforms.

Using [Extism](https://extism.org/), we can move the runtime requirement out of the host and into the individual plugins. On a per-plugin basis, this increases the individual sizes significantly, but the tradeoffs are true universal compatibility and compatibility gaurentees via the Extism SDK. This lays the groundwork for much thinner client libraries in Python, PHP, Ruby, and .NET among others.

We're keeping the YAML format for plugins and configurations, as that's served us well. The biggest change is the module key that's now present, containing the wasm compiled plugin. Because wasm does not have host access, the security sandbox doesn't require any changes in order to support the new style.

If you'd like to use Lua plugins, please continue to use a previous version of the Taskless loader.
