---
"@taskless/loader": patch
---

Improves runtime compatibility - The previous vite build imported lua scripts via `new URL("data:...")` which can cause issues on some versions of node. This changes to a safer `import from...` syntax from `vite`
