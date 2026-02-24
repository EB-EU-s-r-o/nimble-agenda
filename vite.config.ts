import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

const stripBom = (s: string | undefined) => (s ?? "").replace(/^\uFEFF/, "").trim();

// https://vitejs.dev/config/ – cache bust
export default defineConfig(({ mode }) => {
  // Ensure envs are loaded in all environments (dev/preview/build)
  const env = loadEnv(mode, process.cwd(), "");

  // Fallbacks are safe to ship (URL + anon/public key are not secrets)
  const projectId = stripBom(env.VITE_SUPABASE_PROJECT_ID) || "eudwjgdijylsgcnncxeg";
  const supabaseUrl = stripBom(env.VITE_SUPABASE_URL) || `https://${projectId}.supabase.co`;
  const publishableKey =
    stripBom(env.VITE_SUPABASE_PUBLISHABLE_KEY) ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1ZHdqZ2Rpanlsc2djbm5jeGVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MTI5OTAsImV4cCI6MjA4NzA4ODk5MH0.9BknkyJShiVQgTBuO-Ulx9eTgrERxxzLth0-E0_Y8IU";

  return {
    // Force Vite to inline these values even if the runtime env injection is missing.
    define: {
      "import.meta.env.VITE_SUPABASE_PROJECT_ID": JSON.stringify(projectId),
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(supabaseUrl),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(publishableKey),
    },
    build: {
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks: {
            "vendor-react": ["react", "react-dom", "react-router-dom"],
            "vendor-supabase": ["@supabase/supabase-js"],
            "vendor-query": ["@tanstack/react-query"],
            "vendor-ui": ["sonner", "recharts", "lucide-react"],
          },
        },
      },
    },
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    plugins: [
      react(),
      mode === "development" && componentTagger(),
      VitePWA({
        registerType: "prompt",
        includeAssets: ["favicon.ico", "placeholder.svg", "pwa-icon-192.png", "pwa-icon-512.png"],
        workbox: {
          navigateFallbackDenylist: [/^\/~oauth/],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/eudwjgdijylsgcnncxeg\.supabase\.co\/rest\/v1\/.*/i,
              handler: "NetworkFirst",
              options: {
                cacheName: "supabase-api-cache",
                expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 },
              },
            },
            {
              urlPattern: /\.(js|css|png|jpg|jpeg|svg|gif|woff2?)$/i,
              handler: "CacheFirst",
              options: {
                cacheName: "static-assets",
                expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
          ],
        },
        manifest: {
          name: "PAPI HAIR DESIGN – Booking",
          short_name: "PHD Booking",
          description: "Prémiový rezervačný systém – PAPI HAIR DESIGN",
          start_url: "/booking",
          display: "standalone",
          orientation: "portrait",
          background_color: "#0b0b0b",
          theme_color: "#0b0b0b",
          categories: ["business", "lifestyle"],
          icons: [
            { src: "/pwa-icon-192.png", sizes: "192x192", type: "image/png" },
            { src: "/pwa-icon-512.png", sizes: "512x512", type: "image/png" },
            { src: "/pwa-icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          ],
          screenshots: [],
        },
      }),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});

