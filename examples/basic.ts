/**
 * pnpm tsx --import="@taskless/loader" examples/basic.ts
 *
 * Taskless Autoloader Example
 * This example uses Taskless' autoload feature to capture basic telemetry
 * data for fetch requests. If you provide a TASKLESS_API_KEY environment
 * variable, this request will show up in your Taskless console, including
 * any Packs you've configured. Otherwise, basic information is logged to the
 * console, confirming the request was made.
 *
 * The below code is designed to simulate a running application, generating
 * a variety of API calls with different responses.
 */

console.log(
  "Reminder: Taskless drain will hold this script open. Either call process.exit() or use CTRL+C to exit."
);

// set up handlers for sigint and sigkill that process.exit
process.on("SIGINT", () => {
  process.exit();
});

process.on("SIGTERM", () => {
  process.exit();
});

type APICall = () => Promise<void>;

// created simulated data for popular APIs
const APIs: APICall[] = [
  async () => {
    const resp = await fetch("http://colormind.io/api/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: "default" }),
    });
    // console.log(`Colormind.io: Got ${resp.status}`);
  },
  async () => {
    const resp = await fetch(
      "https://poetrydb.org/title/Ozymandias/lines.json",
      {
        method: "GET",
      }
    );
    // console.log(`PoetryDB (Ozymandias): Got ${resp.status}`);
  },
  async () => {
    const resp = await fetch(
      "https://goweather.herokuapp.com/weather/San%20Francisco",
      {
        method: "GET",
      }
    );
    // console.log(`Weather in SF: Got ${resp.status}`);
  },
  async () => {
    const resp = await fetch(
      "http://www.7timer.info/bin/api.pl?lon=113.17&lat=23.09&product=astro&output=xml",
      {
        method: "GET",
      }
    );
    // console.log(`7Timer API to 113.17 23.09: Got ${resp.status}`);
  },
  async () => {
    const resp = await fetch("https://api.github.com/orgs/taskless/repos", {
      headers: {
        accept: "application/vnd.github+json",
        "x-github-api-version": "2022-11-28",
      },
    });
    // console.log(`GitHub API call: Got ${resp.status}`);
  },
  async () => {
    const resp = await fetch("https://slack-status.com/api/v2.0.0/current");
    // console.log(`Slack /current: Got ${resp.status}`);

    const authResp = await fetch("https://slack.com/api/auth.test", {
      method: "POST",
    });
    // console.log(`Slack Auth Test: Got ${authResp.status}`);
  },
  async () => {
    const resp = await fetch("https://example.com");
    // console.log(`Example.com page scrape: Got ${resp.status}`);
  },
];

const run = async () => {
  // select between 30% and 60% of the APIs in the APIs collection to test
  const count = Math.floor(
    Math.random() * (APIs.length * 0.3) + APIs.length * 0.3
  );
  // add those APIs to a set if they're unique
  const selected = new Set<APICall>();
  while (selected.size < count) {
    const intended = APIs[Math.floor(Math.random() * APIs.length)];
    if (!selected.has(intended)) {
      selected.add(intended);
    }
  }

  await Promise.all(Array.from(selected).map((api) => api()));

  // call run() again between 300ms and 2200ms
  setTimeout(run, Math.floor(Math.random() * 1900 + 300));
};

run();
