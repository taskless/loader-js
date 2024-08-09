# @taskless/loader

Take control of your third party APIs

# Getting Started

You'll need your API key from taskless.io to use Taskless' dynamic pack loading, remote cofiguration, and analytic packages. If you don't have an API key, you can sign up for free at [taskless.io](https://taskless.io).

```bash
npm install @taskless/loader
# or
yarn add @taskless/loader
# or
pnpm add @taskless/loader
```

Once you've got access to the Taskless loader, getting telemetry on taskless.io is as easy as:

```bash
TASKLESS_API_KEY="your key" node --import="@taskless/loader" start.js
```

# Advanced Features

## Programatic API

(coming soon)

## Local (No Network) Mode

Have a favorite log drain? Want to test locally? No problem. You can use the `@taskless/loader` package to test locally.

```bash
TASKLESS_LOCAL_MODE=1 node --import="@taskless/loader" start.js
```

# License

Apache 2.0
