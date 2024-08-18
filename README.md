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

Once you've installed the Taskless loader into your node dependencies, it's as easy as:

```bash
TASKLESS_API_KEY="your api key" node --import="@taskless/loader" start.js
```

# Advanced Features

## Autoloading Options

| env                   | values                           | description                                         |
| :-------------------- | :------------------------------- | :-------------------------------------------------- |
| `TASKLESS_API_KEY`    | `string`                         | Your Taskless API key                               |
| `TASKLESS_LOCAL_MODE` | `1`                              | Disables network requests and enables local logging |
| `TASKLESS_LOG_LEVEL`  | `debug`, `info`, `warn`, `error` | Sets the log level                                  |

## Programatic API

A programatic API is available by importing `taskless` from `@taskless/loader/core`. It's signature is `taskless(secret: string, options: Options):API`. We encourage you to explore the TypeScript types to see what's available.

# License

Apache 2.0
