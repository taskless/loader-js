// a file that exits on load, used for testing the autoloader
import { exit } from "node:process";

const allRuns = [];

const run = (name, asyncFunction) => {
  allRuns.push(
    Promise.resolve(asyncFunction())
      .then(() => {
        console.log(`✅ ${name}`);
      })
      .catch((error) => {
        console.error(error);
      })
  );
};

run("example.com", async () => {
  await fetch("https://example.com");
});

// wait for all requests to conclude
await Promise.all(allRuns);

console.log("Done");

// exit
exit(0);
