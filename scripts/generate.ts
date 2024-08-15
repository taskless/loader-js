import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { TASKLESS_HOST } from "@~/constants.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const base = process.env.TASKLESS_HOST ?? `${TASKLESS_HOST}`;
const oapi = new URL(`${base}/.well-known/openapi.json`);

const file = await fetch(oapi.toString());
const contents = (await file.json()) as unknown;
const out = `
export default ${JSON.stringify(contents, null, 2)} as const;
`;

await writeFile(resolve(__dirname, "../src/__generated__/openapi.ts"), out);
