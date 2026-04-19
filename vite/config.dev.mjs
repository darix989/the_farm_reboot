import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const srcDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src')

// https://vitejs.dev/config/
export default defineConfig({
    base: './',
    resolve: {
        alias: {
            '#': srcDir,
        },
    },
    plugins: [
        react(),
    ],
    server: {
        port: 8080
    }
})
