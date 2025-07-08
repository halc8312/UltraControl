import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import UnoCSS from '@unocss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), UnoCSS()],
  server: { // Added for COOP/COEP headers
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  },
  optimizeDeps: { // Added for WebContainer
    include: ['@webcontainer/api'],
    // esbuildOptions: {
    //   target: 'esnext', // Ensure esbuild target is esnext for top-level await
    // },
  },
  resolve: {
    alias: {
      '~': path.resolve(__dirname, './src'),
    },
  },
  define: {
    global: 'globalThis',
  },
  esbuild: {
    target: 'esnext',
  },
})
