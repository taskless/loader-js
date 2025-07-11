---
"@taskless/loader": patch
---

feat: Refactors for support of chunked event-stream

Previously Taskless Loader only knew of "pre" and "post" lifecycle events. This loader change introduces a new "chunk" event that allows for control over readable stream segments such as those used in event-streams. This is useful for Packs that want to process data in chunks rather than waiting for the entire response such as an MCP integration.

This change is backwards compatible with existing Packs and the current `pre2` schema. To enable chunk processing, a new `methods` field is added to the `pre2` manifest. Valid options for "methods" are `pre`, `post`, and `chunk`. If a Pack does not declare `chunk` in its manifest, it will continue to function as before, processing the entire response in one go with the standard `pre` and `post` lifecycle events.
