import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

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
