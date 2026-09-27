import path from "path"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  // absolute base: the SPA has nested routes (/app/s/:id, /ai-tutor/:slug);
  // relative './' would resolve assets against the route path and 404 on reload
  base: '/',
  plugins: [tailwindcss(), react()],
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
