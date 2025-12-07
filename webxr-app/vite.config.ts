import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        app: resolve(__dirname, 'app.html'),
      },
    },
  },
  server: {
    host: true,
    // Use HTTP; localhost is treated as a secure context for WebXR.
    https: false,
    port: 5173
  }
});
