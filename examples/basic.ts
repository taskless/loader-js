/**
 * pnpm tsx --import="@taskless/loader" examples/basic.ts
 *
 * Taskless Autoloader Example
 * This example uses Taskless' autoload feature to capture basic telemetry
 * data for fetch requests. If you provide a TASKLESS_API_KEY environment
 * variable, this request will show up in your Taskless console, including
 * any Packs you've configured. Otherwise, basic information is logged to the
 * console, confirming the request was made.
 */

console.log(
  "Reminder: Taskless drain will hold this script open. Either call process.exit() or use CTRL+C to exit."
);

console.log("Making a fetch to example.com (200)");
const resp = await fetch("https://example.com");

console.log("Example: Got", resp.status);

export {};
