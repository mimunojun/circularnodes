import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages では https://<user>.github.io/<repo>/ の下に置かれる
  base: '/circularnodes/',
  server: { port: 5173 },
});
