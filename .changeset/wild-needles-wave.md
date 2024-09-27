---
"@taskless/loader": patch
---

Makes the draining process more consistent by utilizing try/catch/finally instead of an async then/catch/finally pattern. Added tests that include a remote dev server, emulating the Taskless service as well to ensure network related operations are being properly attempted, at least once, on the shutdown lifecycle
