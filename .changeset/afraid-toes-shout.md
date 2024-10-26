---
"@taskless/loader": patch
---

💥 (BREAKING) Changes to a non-transformative pipeline
The pipeline no longer has the ability to edit requests. This is a breaking change for any pipelines that relied on the functionality. The removal of this feature improves pipeline performance, as all steps can be done in parallel and not block the outgoing request. If we do bring hooks back for transformation, we'll likely add them as a specific hook type instead of co-opting the request watching functionality.

This also significantly decreases the Lua footprint. Most of the lua code was dedicated to a Promises/A+ implementation and co-run scripting sandboxes, which is no longer necessary. Instead, a single pack now receives its own Lua VM (300KB) executed in parallel.
