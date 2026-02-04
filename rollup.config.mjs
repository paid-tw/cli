import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pkg = require("./package.json");
const external = Object.keys(pkg.dependencies || {});

export default {
  input: "src/index.ts",
  external,
  output: {
    file: "dist/index.js",
    format: "esm",
    banner: "#!/usr/bin/env node"
  },
  plugins: [
    resolve({ preferBuiltins: true }),
    commonjs(),
    typescript({ tsconfig: "./tsconfig.json" })
  ]
};
