---
"@taskless/loader": patch
---

BREAKING Fixes axios bug & removes default pack configuration

- Fixes an issue with axios that caused an error when native fetch would decompress a response but leave headers intact
- Removed the default "core" pack. This caused confusion where users thought they were using the core pack instead of the bundled pack, resulting in no dashboards on taskless.io. The `addDefaultPacks` method was also removed
