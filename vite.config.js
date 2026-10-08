import { resolve } from "node:path";
import { readdirSync } from "node:fs";
import { defineConfig } from "vite";

// Every HTML page is its own entry so `npm run build` outputs the whole site.
const workPages = Object.fromEntries(
  readdirSync(resolve(import.meta.dirname, "work"))
    .filter((file) => file.endsWith(".html"))
    .map((file) => [file.replace(".html", ""), resolve(import.meta.dirname, "work", file)])
);

export default defineConfig({
  server: { open: true },
  build: {
    rollupOptions: {
      input: { main: resolve(import.meta.dirname, "index.html"), ...workPages },
    },
  },
});
