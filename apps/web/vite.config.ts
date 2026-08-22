import { defineConfig } from "vitest/config";
import { cloudflare } from "@cloudflare/vite-plugin";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  // cloudflare() turns the build into a static-assets Worker (SPA fallback
  // from wrangler.jsonc); there is no server-side Worker code.
  plugins: [react(), cloudflare()],
  envDir: resolve(__dirname, "../.."),
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 6173,
    host: "127.0.0.1",
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
  },
});
