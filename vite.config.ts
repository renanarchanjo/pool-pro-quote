import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "images/pools/*"],
      workbox: {
        navigateFallbackDenylist: [/^\/~oauth/],
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        // Skip waiting so the new SW activates immediately
        skipWaiting: true,
        clientsClaim: true,
        // Don't cache-bust URLs with hashes (Vite already hashes filenames)
        dontCacheBustURLsMatching: /\.[0-9a-f]{8}\./,
        runtimeCaching: [
          {
            // Cache Google Fonts with stale-while-revalidate
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "google-fonts",
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            // API calls: always network-first
            urlPattern: /\/functions\/v1\//,
            handler: "NetworkOnly",
          },
          {
            // Supabase REST: always network-first
            urlPattern: /\/rest\/v1\//,
            handler: "NetworkOnly",
          },
        ],
      },
      manifest: {
        name: "SIMULAPOOL - Orçamentos de Piscinas",
        short_name: "SIMULAPOOL",
        description: "O jeito moderno de orçar piscinas. Simule, orce e feche negócios.",
        theme_color: "#0EA5E9",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        icons: [
          {
            src: "/favicon.ico",
            sizes: "64x64",
            type: "image/x-icon",
          },
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
