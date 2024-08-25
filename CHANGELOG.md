# @taskless/loader

## 0.0.12

### Patch Changes

- 75b9738: Changes intitialization options

  `forceLogging` was changed to `logging` and takes the default of the `network` option. This makes it easier to enable logging for all requests, and automatically logs requests when the API key is not set. As part of this change, the TasklessAPI type was created for type consistency. Finally, errors throw on `load()` instead of configuration, provinding access to the logger object when inside of the autloader.

- 2bdd944: Changes taskless loader options to be a single semicolon separated options string
- d80185b: Ensures all request and response lua calls copy all properties
- a09153d: Fixes issue where lua promise bundle did not include required .lua code
- 3a2c7e4: Improves types for programatic API
- dcb4344: Adds an example for both the autoload and programatic APIs

## 0.0.11

### Patch Changes

- Switched to changesets for version management information
