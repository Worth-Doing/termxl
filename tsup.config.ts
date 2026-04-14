import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs"],
  sourcemap: true,
  minify: false,
  clean: true,
  banner: {
    js: "#!/usr/bin/env node",
  },
});
