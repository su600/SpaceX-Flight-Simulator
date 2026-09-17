import { defineConfig } from 'vite';
export default defineConfig({ base: './', server: { port: 4173, strictPort: true }, build: { chunkSizeWarningLimit: 750, rollupOptions:{input:{main:'index.html',models:'model-review.html'}} } });
