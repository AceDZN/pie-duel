import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { host: '0.0.0.0', port: 5216, strictPort: true },
  preview: { host: '0.0.0.0', port: 4216, strictPort: true },
});
