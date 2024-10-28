---
"@taskless/loader": patch
---

Creates the packcheck utility for validating Lua scripting packs. This makes it possible to check your own Taskless packs without having to upload them to the Taskless server. The packcheck commands takes a pack or config (in yaml), and stands up a mock service worker to emulate the full Taskless lifecycle. It then returns the response as a consolidated JSON object you can assert on.
