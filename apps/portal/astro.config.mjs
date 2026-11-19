import { defineConfig } from "astro/config";

// @ts-check
export default defineConfig({
  server: { port: 4321, host: true },
});
