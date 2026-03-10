import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [
      '@apollo/client',
      '@apollo/client/react',
      'graphql',
    ],
  },
  resolve: {
    dedupe: ['@apollo/client', 'graphql'],
  },
})
