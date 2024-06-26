# taskless_shim

Interceptor library for L7 Observability in python

# Installation

```bash
# pip install <not enabled yet>
```

# Setup

Taskless shims are meant to be included in your application as early as possible, before your code runs. In python, this is done by importing your `py` config file as early in the app as possible.

```python
# Import me FIRST
import taskless_config;
```

Your `taskless_config.py` contains, at a minimum:

```python
from taskless_shim import taskless

api_key = False # Your API key here for cloud functionality
options = {
    "log": lambda message: print(message) # A custom logger for messages
}

t = taskless(api_key, options)
```

- `api_key` Our API key enables/disables the Taskless Cloud functionality. If you don't have an API key, set this to `False`
- `options.log` Specify a lambda logger for handling messages. In local mode or when using a logdrain, you probably just want to print the ndjson lines

# Capturing Network Requests

Network requests are captured through the `t.capture` interface

```ts
t.capture(string, config_callback);
```

- `string` is a string with wildcards, which the URL will be matched against.
- `config_callback` is a the configuration for a given URL. If a function is passed, it will be called with the request object and should return a configuration object. The configuration consits of:
  - `exclude` - a boolean that tells the shim to exclude the request from capture. Because captures are ran in-order, this allows you to exempt specific URL paths or conditions that would otherwise be caught by `t.capture` later in the list.
  - `payloads` - a boolean that tells the shim to capture the request body (Taskless Cloud Only)
  - `metadata` - an object that will be attached to the capture event as key-value pairs. Useful for adding additional context, capturing OpenTelemetry trace IDs, etc.

# Testing

TBD
