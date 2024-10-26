import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { TASKLESS_HOST } from "@~/constants.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const base = process.env.TASKLESS_HOST ?? `${TASKLESS_HOST}`;

await Promise.all([
  (async () => {
    // OpenAPI file
    const oapi = new URL(`${base}/.well-known/openapi.json`);

    console.log(`Using OpenAPI at ${oapi.toString()}`);

    const file = await fetch(oapi.toString());
    const contents = (await file.json()) as unknown;
    const out =
      `export default ${JSON.stringify(contents, null, 2)} as const;`.trim();

    await writeFile(resolve(__dirname, "../src/__generated__/openapi.ts"), out);
  })(),
  (async () => {
    // Default YAML (public)
    const dyaml = new URL(`${base}/public/config`);

    console.log(`Using YAML at ${dyaml.toString()}`);

    const file = await fetch(dyaml.toString());
    const contents = await file.text();

    await writeFile(
      resolve(__dirname, "../src/__generated__/config.yaml"),
      contents
    );
  })(),
]);
