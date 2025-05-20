/* eslint-disable n/no-process-env */
import { readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import { TASKLESS_HOST } from "@~/constants.js";
import { compile, type JSONSchema } from "json-schema-to-typescript";
import { mkdirp } from "mkdirp";
import { packageDirectory } from "pkg-dir";
import prettier from "prettier";
import { rimraf } from "rimraf";

const base = process.env.TASKLESS_HOST ?? `${TASKLESS_HOST}`;
const ROOT = (await packageDirectory())!;
const GENERATED = resolve(ROOT, "src/__generated__");
const WASM = resolve(ROOT, "wasm");

await rimraf(GENERATED);
await rimraf(WASM);

await mkdirp(GENERATED);
await mkdirp(WASM);

const prettierOptions = {
  ...(JSON.parse(
    readFileSync(resolve(ROOT, ".prettierrc")).toString()
  ) as Record<string, unknown>),
  parser: "typescript",
};

type Formatter = (data: string) => Promise<string> | string;

const downloadFile =
  (url: URL, destination: string, formatter: Formatter) => async () => {
    console.log(`Downloading ${url.toString()}\n  to: ${destination}...`);
    const file = await fetch(url.toString());
    const contents = await file.text();
    const formatted = await Promise.resolve(formatter(contents));
    await writeFile(resolve(GENERATED, destination), formatted);
  };

console.log("Downloading Taskless configuration files...");
await Promise.all(
  [
    downloadFile(
      new URL(`${base}/.well-known/openapi.json`),
      "openapi.ts",
      async (contents) => {
        return prettier.format(
          `
            export default ${JSON.parse(JSON.stringify(contents, null, 2))} as const;
          `,
          prettierOptions
        );
      }
    ),
    downloadFile(
      new URL(`${base}/.well-known/schema/pre2/pack.json`),
      "pack.ts",
      async (contents) => {
        const ts = await compile(JSON.parse(contents) as JSONSchema, "Pack");
        return prettier.format(ts, prettierOptions);
      }
    ),
    downloadFile(
      new URL(`${base}/.well-known/schema/pre2/schema.json`),
      "schema.ts",
      async (contents) => {
        const ts = await compile(JSON.parse(contents) as JSONSchema, "Schema");
        return prettier.format(ts, prettierOptions);
      }
    ),
    downloadFile(
      new URL(`${base}/.well-known/schema/pre2/manifest.json`),
      "manifest.ts",
      async (contents) => {
        const ts = await compile(
          JSON.parse(contents) as JSONSchema,
          "Manifest"
        );
        return prettier.format(ts, prettierOptions);
      }
    ),
  ].map(async (exec) => exec())
);
