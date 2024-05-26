# @taskless/\_\_shim

Prototype interceptor library for network request logging.

| Platform | info                                                                    |
| :------- | :---------------------------------------------------------------------- |
| node.js  | [docs]("https://github.com/taskless/shim/blob/main/src/node/README.md") |

# Testing

Tests are written one-per-file to take advantage of AVA's automatic creation of child process. This allows us to set globals via `globalThis` and simulate the `node -r taskless.config.js` import using a dynamic import. Our config file checks for global values, adopting those in the configuration. This also ensures a fresh capture is available on every test to minimize confounding.
