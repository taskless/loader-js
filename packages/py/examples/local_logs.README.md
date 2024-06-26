# Local Logging

Local logging lets you hook the Taskless interceptor up to a local log drain or structured logging tool.

**Great For**

- People with their ELK stack perfected
- Lovers of raw JSON structured logging

**Not Great For**

- People who just want an all-in-one dashboard (we reccommend the Taskless Observability platform, but we're also biased here)
- Triaging the root cause, inspecting request contents, tracing spans, and other things that make outages suck a little less

# How To Run This Example

1. run `poetry install` to initialize the repository
2. call `poetry run python examples/local_logs.py` from the `py` directory

The example makes one intercepted calls with a 400 error and metadata attached.

# Get In Touch

Thoughts? hello [at] taskless.io 💝
