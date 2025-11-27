import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, PluginOption } from "vite";
import tailwindcss from "@tailwindcss/vite";

// Load env variables and export config
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const apiUrl = env.VITE_API_URL || "http://localhost:8787";

  return {
    plugins: [react(), tailwindcss() as PluginOption],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "~": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      host: true,
      proxy: {
        "/api": {
          target: apiUrl, // Cloudflare Workers dev server
          changeOrigin: true,

          headers: {
            "Content-Type": "application/json",
          },
          secure: false,
        },
        "/logs": {
          target: "http://localhost:4444",
          changeOrigin: true,
          secure: false,
        },
      },
      allowedHosts: [
        "localhost",
        "wiws.pages.dev",
        "wiws-frontend.pages.dev",
        "wiws.harjjotsinghh.workers.dev",
        "wiws-api.harjjotsinghh.workers.dev",
        "wiws-prod.harjjotsinghh.workers.dev",
        "wiws-db.harjjotsinghh.workers.dev",
        "wiws-frontend.harjjotsinghh.workers.dev",
      ],
      watch: {
        ignored: [
          "**/node_modules/**",
          "**/dist/**",
          "**/public/**",
          "**/log/**",
        ],
      },
    },
    preview: {
      host: true,
      proxy: {
        "/api": {
          target: "https://wiws-api.harjjotsinghh.workers.dev", // Production API
          changeOrigin: true,
          secure: true,
        },
      },
      allowedHosts: [
        "localhost",
        "wiws.pages.dev",
        "wiws-frontend.pages.dev",
        "wiws.harjjotsinghh.workers.dev",
        "wiws-api.harjjotsinghh.workers.dev",
        "wiws-prod.harjjotsinghh.workers.dev",
        "wiws-db.harjjotsinghh.workers.dev",
        "wiws-frontend.harjjotsinghh.workers.dev",
      ],
    },
    build: {
      outDir: "dist",
      assetsDir: "assets",
      rollupOptions: {
        output: {
          manualChunks: undefined,
        },
      },
    },
  };
});