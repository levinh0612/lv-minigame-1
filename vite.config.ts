import { defineConfig } from "vitest/config";
import { VitePWA } from "vite-plugin-pwa";
import pkg from "./package.json" with { type: "json" };

export default defineConfig({
  build: { rollupOptions: { input: { main: "index.html", storybook: "storybook.html" } } },
  define: { __APP_VERSION__: JSON.stringify(pkg.version.split(".").slice(0, 2).join(".")) },
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
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
        navigateFallbackDenylist: [/storybook/],
        navigateFallback: "/index.html",
        runtimeCaching: [
          { urlPattern: /^https:\/\/fonts\.googleapis\.com\//, handler: "StaleWhileRevalidate", options: { cacheName: "google-fonts-css" } },
          { urlPattern: /^https:\/\/fonts\.gstatic\.com\//, handler: "CacheFirst",
            options: { cacheName: "google-fonts", expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 }, cacheableResponse: { statuses: [0, 200] } } }
        ]
      }
    })
  ],
  test: { environment: "node" }
});
