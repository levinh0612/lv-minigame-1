import { defineConfig } from "vitest/config";
import { VitePWA } from "vite-plugin-pwa";
import pkg from "./package.json" with { type: "json" };

/* Mỗi lần build có một mã riêng; ghi ra version.json để game biết đã có bản mới (không cache) */
const VERSION = pkg.version.split(".").slice(0, 2).join(".");
const BUILD = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
const versionFile = () => ({
  name: "version-json",
  generateBundle(this: { emitFile(f: { type: "asset"; fileName: string; source: string }): void }) {
    this.emitFile({ type: "asset", fileName: "version.json", source: JSON.stringify({ v: VERSION, build: BUILD }) });
  }
});

export default defineConfig({
  build: { rollupOptions: { input: { main: "index.html", storybook: "storybook.html" } } },
  define: { __APP_VERSION__: JSON.stringify(VERSION), __BUILD__: JSON.stringify(BUILD) },
  plugins: [
    versionFile(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["apple-touch-icon.png", "icon-192.png"],
      manifest: {
        name: "Tiệm Bánh Matcha", short_name: "Tiệm Bánh", lang: "vi", start_url: "/", scope: "/",
        display: "standalone", orientation: "portrait", background_color: "#FFF3F6", theme_color: "#FFD6E0",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,webmanifest}"],
        globIgnores: ["storybook.html", "assets/storybook-*", "splash/**"],
        navigateFallbackDenylist: [/storybook/, /^\/api\//],
        importScripts: ["push-sw.js"],
        navigateFallback: "/index.html",
        runtimeCaching: [
          { urlPattern: /\/models\/.*\.(glb|jpg)$/, handler: "CacheFirst", options: { cacheName: "models-3d", expiration: { maxEntries: 24 }, cacheableResponse: { statuses: [200] } } },
          { urlPattern: /^https:\/\/fonts\.googleapis\.com\//, handler: "StaleWhileRevalidate", options: { cacheName: "google-fonts-css" } },
          { urlPattern: /^https:\/\/fonts\.gstatic\.com\//, handler: "CacheFirst",
            options: { cacheName: "google-fonts", expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 }, cacheableResponse: { statuses: [0, 200] } } }
        ]
      }
    })
  ],
  test: { environment: "node" }
});
