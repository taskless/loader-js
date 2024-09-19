---
"@taskless/loader": patch
---

Enables synchronous flushing - No more dropped telemetry on a `^C`! Worker threads and Atomics are fully within LTS support for node, meaning we can just block the the main thread if you explicitly call `flushSync()` or are handling a `SIGINT` / `SIGTERM` event. To get here, we went through just about every "deasync" library out there, finally finding the simplest answer from the [synchronous-worker README](https://www.npmjs.com/package/synchronous-worker). The synchronous flush isn't supposed to be regularly used, so making a single throwaway worker for the purpose of making sure that last request goes out is very minimal overhead.
