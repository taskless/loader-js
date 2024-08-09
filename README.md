# @taskless/loader

Take control of your third party APIs

# Getting Started

You'll need your API key from taskless.io to use Taskless' dynamic pack loading, remote cofiguration, and dashboard packages. If you don't have an API key, you can sign up for free at [taskless.io](https://taskless.io).

```bash
npm install @taskless/loader
# or
yarn add @taskless/loader
# or
pnpm add @taskless/loader
```

Once you've got access to the Taskless loader, it's as easy as:

```bash
TASKLESS_API_KEY="your api key" node --import="@taskless/loader" start.js
```

# Advanced Features

## Programatic API

A programatic API is available by importing `taskless` from `@taskless/loader/core`. It's configured with your API key and allows for features like ndjson logs, local (offline) packs, and more. We encourage you to explore the TypeScript types to see what's available.

## Disabling Network Requests

If you're working offline, building tests around Taskless, or just want to run Taskless in a restricted environment, you can disable network requests in the autoloader by setting the `TASKLESS_LOCAL_MODE` environment variable to `1` or in the programatic API setting `network: false`. When network requests are disabled, any packs that make network calls will result in a noop.

# License

Apache 2.0
