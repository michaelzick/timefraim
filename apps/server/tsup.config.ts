import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  clean: true,
  // @timefraim/shared resolves to TypeScript source (no runtime build),
  // so it must be bundled for `node dist/index.js` to work.
  noExternal: ["@timefraim/shared"],
});
