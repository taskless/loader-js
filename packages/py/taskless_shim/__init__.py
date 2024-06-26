import requests, time, os, re, json
import responses
from urlmatch import urlmatch
from snowflake import SnowflakeGenerator

# A regex that matches anything
ANY = re.compile(".*")

# env disable flag
TASKLESS_DISABLE = os.environ.get("TASKLESS_DISABLE", False)


def taskless(api_key, options={}):
    """Returns the taskless shim and starts the interceptors"""
    shim = Shim(api_key, options)
    return shim


class Shim:
    _instance = None

    def __new__(cls, api_key, options={}):
        if cls._instance is None:
            cls._instance = super(Shim, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self, api_key, options={}):
        if self._initialized:
            return
        self.api_key = api_key
        self.options = options
        self.snowflake = SnowflakeGenerator(os.getpid() % 1024)
        self.callbacks = []
        methods = [
            responses.DELETE,
            responses.GET,
            responses.HEAD,
            responses.OPTIONS,
            responses.PATCH,
            responses.POST,
            responses.PUT,
        ]
        adapter = requests.adapters.HTTPAdapter()
        self.send = adapter.send
        self.m = responses.RequestsMock()

        if TASKLESS_DISABLE != "1":
            self.m.start()  # shim the http adapter

        for method in methods:
            self.m.add_callback(method, ANY, callback=self._intercept_request)

    def _intercept_request(self, request):
        for item in self.callbacks:
            pattern = item.get("pattern")
            callback = item.get("callback")

            if urlmatch(pattern, request.url, path_required=False):
                config = callback(request)
                if config.get("exclude", False):
                    response = self.send(request)
                    return (response.status_code, response.headers, response.raw.data)

                response = self._make_request(request, config)
                return (response.status_code, response.headers, response.raw.data)

        response = self.send(request)
        return (response.status_code, response.headers, response.raw.data)

    def _make_request(self, request, config):
        start_time = time.time_ns()
        response = self.send(request)
        end_time = time.time_ns()

        duration_ms = (end_time - start_time) / 1000000

        info = {
            "level": "ERROR" if response.status_code >= 400 else "INFO",
            "id": str(next(self.snowflake)),
            "url": request.url,
            "statusCode": response.status_code,
            "durationMs": duration_ms,
            "metadata": config.get("metadata", {}),
            "error": response.reason if response.status_code >= 400 else None,
            # TODO: Payload processing
        }

        if self.options.get("log"):
            self.options.get("log")(json.dumps(info))

        return response

    def capture(self, url_pattern, callback):
        self.callbacks.append({"pattern": url_pattern, "callback": callback})

    def stop(self):
        self.m.stop()
