import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],
  server: {
    proxy: {
      "/parties": {
        target: "http://127.0.0.1:1999",
        ws: true,
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on("error", (err, _req, _res) => {
            if ((err as any).code === "ECONNREFUSED") {
              // Suppress connection refused errors (PartyKit not ready/restarting)
              return
            }
            console.log("Proxy error:", err)
          })
        },
      },
    },
  },
})
