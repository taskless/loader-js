from taskless_shim import taskless

api_key = False  # Your API key here for cloud functionality
options = {"log": lambda message: print(message)}  # A custom logger for messages

t = taskless(api_key, options)

t.capture(
    "https://example.com/*",
    lambda request: {
        "metadata": {k: v for k, v in request.headers.items() if k.lower().startswith("x-")},
        "exclude": False,  # set to True to bypass interception
    },
)
