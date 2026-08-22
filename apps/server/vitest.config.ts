import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Some suites read the real config/env.ts (auth.test.ts), so load `.env`
    // the same way the Node server does before any test module evaluates.
    setupFiles: ["./src/config/load-dotenv.ts"],
  },
});
