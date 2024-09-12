---
"@taskless/loader": patch
---

Makes the autoloader workflow fully synchronous - For older node instances, the mock / shimming process needs to be synchronous as part of the loader code. The blocking point was moved to the point of first request. This showed up mostly when using the `--loader` syntax. `--import` was unaffected.
