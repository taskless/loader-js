---
"@taskless/loader": patch
---

Improves sandbox security - The previous Lua sandbox did not support permissions on a per-hook basis. Packs now include a `permissions` field that declares what a pack is able to do. This strengthens the sandbox further, giving you the ability to quickly idenitfy what a pack is allowed to (or not allowed to) do. Internally, all bridhed lua functions are updated to include their caller as the first parameter, making it possible for the bridge to enforce the security model in-client.
