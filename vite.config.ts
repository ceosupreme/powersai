import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // The local Vite preview does not serve Lovable CDN pointer URLs itself.
    // Proxy only asset requests so registered project media renders in preview.
    proxy: {
      "/__l5e/assets-v1": {
        target: "https://id-preview--dc01aa48-8dd7-400a-b397-110a5d357bc1.lovable.app",
        changeOrigin: true,
      },
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));

