import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Monorepo + nodeLinker:hoisted can pull multiple React copies; force one.
    dedupe: ['react', 'react-dom'],
    alias: {
      react: path.resolve(rootDir, '../node_modules/react'),
      'react-dom': path.resolve(rootDir, '../node_modules/react-dom'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
})
