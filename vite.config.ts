import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'pdf-processing': ['pdfjs-dist'],
          'date-utils': ['date-fns'],
          'ui-components': ['lucide-react'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  optimizeDeps: {
    include: ['pdfjs-dist', 'date-fns', 'lucide-react'],
  },
})
