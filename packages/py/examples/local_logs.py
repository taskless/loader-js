# Import me FIRST
import local_logs_config

# Then other imports
import requests


# Example usage
if __name__ == "__main__":
    # Responses are now shimmed and log
    # In our example, the x-sample header will be passed through
    response = requests.get("https://example.com/test", headers={"x-sample": "sample"})
    print("\n---\nFrom user code\nResponse: " + str(len(response.text)) + " characters\n---\n")

###
### How to test local logging
### This example is set up to perform local logging of a request to example.com/test
###
### This example uses poetry to manage dependencies as for packaging. From the root
### `py` directory, you can run
### 1. poetry install
### 2. poetry run python examples/local_logs.py
