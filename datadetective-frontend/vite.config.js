import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const proxy = {
  "/api": { target: "http://127.0.0.1:8000", changeOrigin: true },
  "/health": { target: "http://127.0.0.1:8000", changeOrigin: true },
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // `preview` serves the production build, so it needs the same proxy as `dev`
  // - otherwise `npm run preview` looks broken even though the build is fine.
  preview: { port: 4173, proxy },
  server: {
    port: 5173,
    // The API runs separately on 8000. Proxying means the browser only ever
    // talks to one origin, so there are no CORS surprises in development.
    proxy,
  },
});
