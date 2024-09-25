# @taskless/loader

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
