# @taskless/loader

Take control of your third-party API dependencies with deep, context-aware observability. The Taskless loader provides comprehensive monitoring and telemetry for your external service calls, capturing everything from basic HTTP metrics to service-specific error details that traditional APM tools miss.

Out of the box, you get:

- Zero-config request & response monitoring
- Service-aware error detection beyond HTTP status codes
- Automatic correlation of API failures and root causes
- Local NDJSON logging that works with your existing tools

Running in local mode requires no account or API key - just install and go.

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

## Taskless Cloud

You'll need your API key from taskless.io to use Taskless' dynamic pack loading, remote cofiguration, and dashboard packages. If you don't have an API key, you can request one at [taskless.io](https://taskless.io). With an API key in hand, you can update your node.js start command:

```bash
TASKLESS_API_KEY="your api key" node --import="@taskless/loader" start.js
```

## Autoloading Options

| env                  | values                                    | description                                     |
| :------------------- | :---------------------------------------- | :---------------------------------------------- |
| `TASKLESS_API_KEY`   | `string`                                  | Your Taskless API key                           |
| `TASKLESS_LOG_LEVEL` | `trace`, `debug`, `info`, `warn`, `error` | Sets the log level                              |
| `TASKLESS_OPTIONS`   | `key1=value1;key2=value2...`              | Set key/value pairs for the Taskless Autoloader |

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
