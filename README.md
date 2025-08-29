# @taskless/loader

Take control of your third-party API dependencies with deep, context-aware observability. The Taskless loader provides comprehensive monitoring and telemetry for your external service calls, capturing everything from basic HTTP metrics to service-specific error details that traditional APM tools miss.

Out of the box, you get:

- Zero-config request & response monitoring
- Service-aware error detection beyond HTTP status codes
- Automatic correlation of API failures and root causes
- Local NDJSON logging that works with your existing tools

# Getting Started

```bash
npm install @taskless/loader
# or
yarn add @taskless/loader
# or
pnpm add @taskless/loader
```

Once you've installed the Taskless loader into your node dependencies, it's as easy as:

```bash
node --import="@taskless/loader" start.js
```

# Advanced Features

## Autoloading Options

| ENV value                 | type     | default       | description                                                                                  |
| :------------------------ | :------- | :------------ | :------------------------------------------------------------------------------------------- |
| `TASKLESS_FLUSH_INTERVAL` | `number` | `2000`        | Interval in milliseconds to check for pending logs and flush them to the output destinations |
| `TASKLESS_LOG_LEVEL`      | `string` | `info`        | A console log level to allow through. One of: `error`, `warn`, `log`, `info`, `debug`        |
| `TASKLESS_OUTPUT`         | `string` | `console`     | A comma separated list of output destinations                                                |
| `TASKLESS_DIRECTORY`      | `string` | `./.taskless` | Directory that contains your local Taskless packs                                            |

## Programatic API

A programatic API is available by importing `taskless` from `@taskless/loader/core`. It's signature is `taskless(secret: string, options: Options):API`. We encourage you to explore the TypeScript types to see what's available.

# Writing Taskless Plugins

(coming soon)

# Building

```bash
# Build the project
pnpm install
pnpm build

# to retrieve the latest artifacts from Taskless
# calls scripts/generate.ts
pnpm codegen
```

# License

Apache 2.0
