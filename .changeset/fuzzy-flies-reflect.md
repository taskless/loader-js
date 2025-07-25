---
"@taskless/loader": patch
---

Minimizes blocking and improves performance by:

- Renaming `flush` to `shutdown` and removing the sync option (BREAKING CHANGE) - The synchronous flush is an internal implementation detail, and is only needed during shutdown or via interrupt. This reduces the API surface area as there's very few programatic implementations
- Adding a reference counter with a timeout/abort mechanism to track pending processing pipelines. During a shutdown operation, this ref counter ensures all responses are handled by the telemetry system. This is more robust than a `SIGINT`, and ensures we're still as non-blocking as possible, but can block through shutdown for the purposes of testing and situations where we need to ensure all data is processed before exiting.
- Extracting worker management to a separate module for better readability and maintainability - this just makes the code easier to read and maintain, as the worker code looks like JavaScript to the main module
- Extracting common utilities to a separate module for better readability
