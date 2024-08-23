import { defineConfig } from "vite";
import { externalizeDeps } from "vite-plugin-externalize-deps";
import tsconfigPaths from "vite-tsconfig-paths";
import dts from "vite-plugin-dts";

const ENTRY_POINTS = {
  index: "./src/index.ts",
  core: "./src/core.ts",
};

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    externalizeDeps(),
    dts({
      include: Object.values(ENTRY_POINTS),
    }),
  ],
  build: {
    outDir: "dist",
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
