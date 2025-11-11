import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Allow serving the app under a subpath like /qup in production
  base: '/qup-app/',
  server: {
    // Ensure dev server is reachable when running frontend in isolation
    host: true, // 0.0.0.0
    port: 5173,
    strictPort: true,
    open: false,
    hmr: {
      // Helps when browser connects via localhost or different hostname
      clientPort: 5173,
    },
  },
})
