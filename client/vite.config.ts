import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      // Proxy all /api requests to the Express backend.
      // This avoids CORS entirely in development — the browser sees one origin.
      '/api': {
        target:      'http://localhost:5000',
        changeOrigin: true,
        // Increase timeout for long-running downloads
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.error('[vite-proxy] error:', err.message);
          });
        },
      },
    },
  },
});
