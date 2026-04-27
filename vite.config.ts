import { defineConfig } from 'vite';

export default defineConfig({
  base: '/AUTOlingua/',
  root: '.',
  build: {
    outDir: 'dist',
  },
  server: {
    port: 3000,
  }
});
