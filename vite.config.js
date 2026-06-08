import { defineConfig } from 'vite'

export default defineConfig({
  // Base path for GitHub Pages: /REPO_NAME/
  base: '/maison-dittar/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Increase chunk size warning limit (Three.js is large)
    chunkSizeWarningLimit: 1000,
  }
})
