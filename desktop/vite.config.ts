import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  root: path.resolve(__dirname, 'renderer'),
  base: './',
  publicDir: path.resolve(__dirname, '..', 'public'),
  css: { postcss: { plugins: [tailwindcss()] } },
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, '..') },
  },
  build: {
    outDir: path.resolve(__dirname, '..', 'desktop-dist', 'renderer'),
    emptyOutDir: true,
  },
});
