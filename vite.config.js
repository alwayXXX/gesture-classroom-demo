import { defineConfig } from 'vite';

export default defineConfig({
  optimizeDeps: { entries: ['index.html'] },
  server: { watch: { ignored: ['**/.build-tools/**', '**/src-tauri/**', '**/release/**'] } }
});
