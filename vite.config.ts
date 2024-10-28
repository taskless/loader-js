import { defineConfig, Plugin } from "vite";
import { externalizeDeps } from "vite-plugin-externalize-deps";
import tsconfigPaths from "vite-tsconfig-paths";
import dts from "vite-plugin-dts";

const ENTRY_POINTS = {
  index: "./src/index.ts",
  core: "./src/core.ts",
  "dev/packcheck": "./src/dev/packcheck.ts",
};

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    externalizeDeps(),
    dts({
      include: Object.values(ENTRY_POINTS),
    }),
  ],
  test: {
    testTimeout: 5000,
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
    lib: {
      entry: ENTRY_POINTS.index, // overwritten by rollup options
      fileName: "[name]",
      formats: ["cjs", "es"],
    },
    rollupOptions: {
      input: ENTRY_POINTS,
      output: {
        preserveModules: true,
      },
    },
  },
});
