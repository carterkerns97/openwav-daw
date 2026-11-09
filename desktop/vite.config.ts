import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  root: path.resolve(import.meta.dirname, 'renderer'),
  base: './',
  publicDir: path.resolve(import.meta.dirname, '..', 'public'),
  css: { postcss: { plugins: [tailwindcss()] } },
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, '..') },
  },
  build: {
    outDir: path.resolve(import.meta.dirname, '..', 'desktop-dist', 'renderer'),
    emptyOutDir: true,
  },
});
