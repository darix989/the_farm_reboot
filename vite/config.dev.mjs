import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'


// https://vitejs.dev/config/
export default defineConfig({
    base: './',
    plugins: [
        react(),
    ],
    server: {
        // 0.0.0.0 is more reliable than host: true on some Windows setups (LAN IPv4).
        host: '0.0.0.0',
        port: 8080,
        strictPort: true,
    }
})
