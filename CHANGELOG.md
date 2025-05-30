# @taskless/loader

## 0.0.31

### Patch Changes

- 2517af9: Upgrades extism SDK to latest - The Extism SDK must be upgraded in order to provide required host functions for the latest PDK

## 0.0.30

### Patch Changes

- d464263: BREAKING Fixes axios bug & removes default pack configuration

  - Fixes an issue with axios that caused an error when native fetch would decompress a response but leave headers intact
  - Removed the default "core" pack. This caused confusion where users thought they were using the core pack instead of the bundled pack, resulting in no dashboards on taskless.io. The `addDefaultPacks` method was also removed
  - If you were using a default pack, you will need to manually download the manifest from https://data.tskl.es/public/config for use in your application.

## 0.0.29

### Patch Changes

- 900fd65: Fixes header passing to webassembly

## 0.0.28

### Patch Changes

- 87b2b8f: - BREAKING - Upgrades schema to pre2 - This change enables the new `pre2` schema which uses user configuration and pushes responsibility of capture to the individual wasm modules. This loader can run `pre1` wasm files and manifests without issue, but makes new endpoint requests for configuration. Modules requested with this version of the loader will automaticallt receivee `pre2` manifests upgraded through the web. Local manifests will need to be updated manually. Types are available in `src/__generated__` for inspection

## 0.0.27

### Patch Changes

- 5c85623: Introduces namespacing. When recording telemetry, the Pack's name will be included as part of the telemetry item automatically. This allows multiple Packs to use the same name such as "status" without conflicts

## 0.0.26

### Patch Changes

- d5596ef: BREAKING: Removes Packcheck (now @taskless/packcheck)

## 0.0.25

### Patch Changes

- cc8215a: Fixes the bypass logic for remote Wasm modules

## 0.0.24

### Patch Changes

- 3099420: (💥 BREAKING) Adds support for remote wasm files - In order to avoid inlining a ton of WebAssembly in the configuration and manifest files, Taskless now supports remote loading of Wasm files. This both improves the load time of applications and makes it easier to bring your own Wasm files to Taskless.
- fff756f: Fixes the `PluginInput` typings, adding a present but undocumented `headers` collection

## 0.0.23

### Patch Changes

- abd7576: Adds latest wasm (AGFzb)

## 0.0.22

### Patch Changes

- 8ccc266: Moves to wasm plugin system (Breaking Change)

  Previously, Taskless plugins were small Lua scripts that ran within a [wasmoon](https://github.com/ceifa/wasmoon) VM. Unfortunately, Lua VMs are [not](https://github.com/glejeune/ruby-lua) [consistent](https://github.com/Shopify/go-lua) [across](https://github.com/luaj/luaj) [languages](https://github.com/mlua-rs/rlua). This makes it impossible to gaurentee a plugin you (or we) write will work consistently across all platforms.

  Using [Extism](https://extism.org/), we can move the runtime requirement out of the host and into the individual plugins. On a per-plugin basis, this increases the individual sizes significantly, but the tradeoffs are true universal compatibility and compatibility gaurentees via the Extism SDK. This lays the groundwork for much thinner client libraries in Python, PHP, Ruby, and .NET among others.

  We're keeping the YAML format for plugins and configurations, as that's served us well. The biggest change is the module key that's now present, containing the wasm compiled plugin. Because wasm does not have host access, the security sandbox doesn't require any changes in order to support the new style.

  If you'd like to use Lua plugins, please continue to use a previous version of the Taskless loader.

## 0.0.20

### Patch Changes

- 2a864fc: Optimizes local log output to individual requests

## 0.0.19

### Patch Changes

- 7a4a5a3: Fixes issue where types were not available in taskless/core
- 8d3036a: Introduces packCheck, a developer tool for validating your Lua packs confirm to the Taskless specification
- 8d3036a: BREAKING: Default packs must be opted-in via the programatic API. This change was introduced so that in local programatic development (and when running "packCheck") you are not forced to adopt the default packages. In the autoloading path, the call to addDefaultPacks happens automatically.

## 0.0.18

### Patch Changes

- 92d8e00: 💥 (BREAKING) Changes to a non-transformative pipeline
  The pipeline no longer has the ability to edit requests. This is a breaking change for any pipelines that relied on the functionality. The removal of this feature improves pipeline performance, as all steps can be done in parallel and not block the outgoing request. If we do bring hooks back for transformation, we'll likely add them as a specific hook type instead of co-opting the request watching functionality.

  This also significantly decreases the Lua footprint. Most of the lua code was dedicated to a Promises/A+ implementation and co-run scripting sandboxes, which is no longer necessary. Instead, a single pack now receives its own Lua VM (300KB) executed in parallel.

- af64692: Creates the packcheck utility for validating Lua scripting packs. This makes it possible to check your own Taskless packs without having to upload them to the Taskless server. The packcheck commands takes a pack or config (in yaml), and stands up a mock service worker to emulate the full Taskless lifecycle. It then returns the response as a consolidated JSON object you can assert on.
- d9ccbd8: Removes unnecessary modules from the worker thread

## 0.0.17

### Patch Changes

- Ensures workers are ran on the next available tick in-thread

## 0.0.16

### Patch Changes

- d96c997: Makes the draining process more consistent by utilizing try/catch/finally instead of an async then/catch/finally pattern. Added tests that include a remote dev server, emulating the Taskless service as well to ensure network related operations are being properly attempted, at least once, on the shutdown lifecycle

## 0.0.15

### Patch Changes

- 0fac2ea: Enables synchronous flushing - No more dropped telemetry on a `^C`! Worker threads and Atomics are fully within LTS support for node, meaning we can just block the the main thread if you explicitly call `flushSync()` or are handling a `SIGINT` / `SIGTERM` event. To get here, we went through just about every "deasync" library out there, finally finding the simplest answer from the [synchronous-worker README](https://www.npmjs.com/package/synchronous-worker). The synchronous flush isn't supposed to be regularly used, so making a single throwaway worker for the purpose of making sure that last request goes out is very minimal overhead.

## 0.0.14

### Patch Changes

- 4442e69: Improves sandbox security - The previous Lua sandbox did not support permissions on a per-hook basis. Packs now include a `permissions` field that declares what a pack is able to do. This strengthens the sandbox further, giving you the ability to quickly idenitfy what a pack is allowed to (or not allowed to) do. Internally, all bridhed lua functions are updated to include their caller as the first parameter, making it possible for the bridge to enforce the security model in-client.
- 0be58b2: Adds a default configuration when network connections are disabled - Previously, the loader would load a "zero pack" configuration when the network connection was disabled. For just getting started with Taskless, this created a barrier to entry. Now, when no api key is specified a default configuration is loaded (see `/config/default.yaml`). The default confguration captures the duration and status for all requests `https://.+`, making it easy to see how Taskless creates a safe environment for tapping into every request.

## 0.0.13

### Patch Changes

- b7233db: Makes the autoloader workflow fully synchronous - For older node instances, the mock / shimming process needs to be synchronous as part of the loader code. The blocking point was moved to the point of first request. This showed up mostly when using the `--loader` syntax. `--import` was unaffected.
- a2ce1d1: Improves runtime compatibility - The previous vite build imported lua scripts via `new URL("data:...")` which can cause issues on some versions of node. This changes to a safer `import from...` syntax from `vite`

## 0.0.12

### Patch Changes

- 75b9738: Changes intitialization options

  `forceLogging` was changed to `logging` and takes the default of the `network` option. This makes it easier to enable logging for all requests, and automatically logs requests when the API key is not set. As part of this change, the TasklessAPI type was created for type consistency. Finally, errors throw on `load()` instead of configuration, provinding access to the logger object when inside of the autloader.

- 2bdd944: Changes taskless loader options to be a single semicolon separated options string
- d80185b: Ensures all request and response lua calls copy all properties
- a09153d: Fixes issue where lua promise bundle did not include required .lua code
- 3a2c7e4: Improves types for programatic API
- dcb4344: Adds an example for both the autoload and programatic APIs

## 0.0.11

### Patch Changes

- Switched to changesets for version management information
