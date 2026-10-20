import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { '/api': 'http://localhost:3000' },
    // Telegram opens the Mini App only over HTTPS, so development goes through a tunnel.
    allowedHosts: ['.trycloudflare.com'],
  },
});
