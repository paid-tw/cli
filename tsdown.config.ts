import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "es2022",
  platform: "node",
  clean: true,
  treeshake: true,
  // A CLI bin — consumers run the compiled `paid`, they don't import types.
  dts: false,
  sourcemap: false,
  // Keep the `.js` name the `bin` field points at (tsdown defaults ESM to .mjs).
  outExtensions: () => ({ js: ".js" }),
});
