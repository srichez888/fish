import { defineConfig } from 'vite';

// relative base so the built game works under the /fish/ subpath on GitHub Pages
export default defineConfig({
  base: './',
});
