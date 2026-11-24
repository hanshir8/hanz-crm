import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const basePath =
  process.env.VITE_BASE_PATH && process.env.VITE_BASE_PATH.trim().length > 0
    ? process.env.VITE_BASE_PATH.trim()
    : '/hanz-crm/';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: basePath,
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
