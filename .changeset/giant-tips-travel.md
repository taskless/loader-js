---
"@taskless/loader": patch
---

Changes intitialization options

`forceLogging` was changed to `logging` and takes the default of the `network` option. This makes it easier to enable logging for all requests, and automatically logs requests when the API key is not set. As part of this change, the TasklessAPI type was created for type consistency. Finally, errors throw on `load()` instead of configuration, provinding access to the logger object when inside of the autloader.
