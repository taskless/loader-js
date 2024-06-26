# @taskless/shim

Interceptor library for L7 Observability in node.js

# Installation

```bash
npm install @taskless/shim
```

# Setup

Taskless shims are meant to be included in your application as early as possible, before your code runs. The easiest way to achieve this is with node's `--import` or `-r` (legacy) flags. If you're using next.js or another framework that doesn't expose the node flags, they can also be set via the `NODE_OPTIONS` environment variable.

```bash
node --import=./taskless.config.js your_file.js

# or for example, in next.js

NODE_OPTIONS='--import=./taskless.config.js' next start
```

Your `taskless.config.js` contains, at a minimum:

```ts
import { taskless } from "@taskless/shim/node";

const t = taskless(undefined, {
  local: true,
  log: (jsonString) => {
    console.log(jsonString);
  },
});
```

- `undefined` as the first parameter tells Taskless not to use a Taskless API key for sending events to Taskless Cloud
- `local: true` tells the shim to not make any network calls to Taskless and is a required-opt in for local logging
- `log: () => {}` sets our local logging function, in this case, `console.log`

# Capturing Network Requests

Network requests are captured through the `t.capture` interface

```ts
t.capture(stringOrMatcher, [configOrGenerator]);
```

- `stringOrMatcher` is a string with wildcards, or a matcher function in the form of `(request) => boolean`. Returning a truthy value from the matcher means that the request will be captured.
- `configOrGenerator` is a the configuration for a given URL. If a function is passed, it will be called with the request object and should return a configuration object. The configuration consits of:
  - `exclude` - a boolean that tells the shim to exclude the request from capture. Because captures are ran in-order, this allows you to exempt specific URL paths or conditions that would otherwise be caught by `t.capture` later in the list.
  - `payloads` - a boolean that tells the shim to capture the request body (Taskless Cloud Only)
  - `metadata` - an object that will be attached to the capture event as key-value pairs. Useful for adding additional context, capturing OpenTelemetry trace IDs, etc.

# Testing

Tests are written one-per-file to take advantage of AVA's automatic creation of child process. This allows us to set globals via `globalThis` and simulate the `node -r taskless.config.js` import using a dynamic import. Our config file checks for global values, adopting those in the configuration. This also ensures a fresh capture is available on every test to minimize confounding.

# License

Apache 2.0
