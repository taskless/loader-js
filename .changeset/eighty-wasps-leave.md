---
"@taskless/loader": patch
---

Adds a default configuration when network connections are disabled - Previously, the loader would load a "zero pack" configuration when the network connection was disabled. For just getting started with Taskless, this created a barrier to entry. Now, when no api key is specified a default configuration is loaded (see `/config/default.yaml`). The default confguration captures the duration and status for all requests `https://.+`, making it easy to see how Taskless creates a safe environment for tapping into every request.
