import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        appUpdate: resolve(__dirname, 'app-update/index.html'),
        main: resolve(__dirname, 'index.html'),
        maintenance: resolve(__dirname, 'maintenance/index.html'),
      },
    },
  },
  plugins: [react()],
});
