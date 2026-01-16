import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],
  server: {
    proxy: {
      "/parties": {
        target: "http://localhost:1999",
        ws: true,
        changeOrigin: true,
      },
    },
  },
})
