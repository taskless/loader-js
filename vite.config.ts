import { defineConfig, Plugin } from "vite";
import { externalizeDeps } from "vite-plugin-externalize-deps";
import tsconfigPaths from "vite-tsconfig-paths";
import dts from "vite-plugin-dts";
import path from "node:path";

import tsconfigJson from "./tsconfig.json";

const entryPoints = [
  "./src/index.ts",
  "./src/core.ts",
  "./src/dev/packcheck.ts",
];

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    externalizeDeps(),
    dts({
      include: "src/**",
    }),
  ],
  test: {
    testTimeout: 5000,
  },
  resolve: { alias: { "@~/": path.resolve("src/") } },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
    target: tsconfigJson.compilerOptions.target,
    lib: {
      entry: entryPoints,
      fileName: "[name]",
      formats: ["cjs", "es"],
    },
    rollupOptions: {
      output: {
        preserveModules: true,
      },
    },
  },
});
