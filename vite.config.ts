import path from "node:path";
import { createHash } from "node:crypto";
import { defineConfig, type Plugin, type ResolvedConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { visualizer } from "rollup-plugin-visualizer";

function taggerPlugin(): Plugin {
  let config: ResolvedConfig;

  return {
    name: "custom-tagger",
    apply: "build",
    configResolved(resolved) {
      config = resolved;
      console.log(`[tagger] build mode: ${config.mode}`);
    },
    transform(code, id) {
      if (!id.endsWith(".ts") && !id.endsWith(".tsx")) return null;
      const hash = createHash("sha1").update(code).digest("hex").slice(0, 10);
      const tag = [
        "// tagged file:",
        id.replace(config.root + path.sep, ""),
        `| mode=${config.mode}`,
        `| hash=${hash}`,
        `| time=${new Date().toISOString()}`,
      ].join(" ");
      return { code: `${tag}\n${code}`, map: null };
    },
  };
}

const analyze = process.env.ANALYZE === "true";
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  server: { port: 8080, host: true },
  plugins: [react(), taggerPlugin()],
  build: {
    rollupOptions: {
      plugins: analyze
        ? [
            visualizer({
              filename: "dist/stats.html",
              template: "treemap",
              gzipSize: true,
              brotliSize: true,
              open: true,
            }),
          ]
        : [],
    },
  },
});
