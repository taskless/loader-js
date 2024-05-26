# Local Logging
![image](https://github.com/taskless/shim/assets/1795/2c333778-3952-4252-a525-1a75568c6d89)

Local logging lets you hook the Taskless interceptor up to a local log drain or structured logging tool.

**Great For**
* People with their ELK stack perfected
* Lovers of raw JSON structured logging
* Fans of `pino-pretty`

**Not Great For**
* People who just want an all-in-one dashboard (we reccommend the Taskless Observability platform, but we're also biased here)
* Triaging the root cause, inspecting request contents, tracing spans, and other things that make outages suck a little less

# How To Run This Example

1. run `pnpm build` to create the current artifacts
2. cd into this directory (examples)
3. run `node --import=./localLogs.config.js localLogs.js`

The example makes two intercepted calls, one that succeeds with a `200` and one that fails with a `500`.

# Do This Yourself
1. `npm i @taskless/__shim`
2. Make your `taskless.config.js` or just copy ours
3. Add the config via the `--import` (node 18+) or `-r` (legacy) syntax

Thoughts? hello [at] taskless.io 💝
