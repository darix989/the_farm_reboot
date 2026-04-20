import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const phasermsg = () => {
    return {
        name: 'phasermsg',
        buildStart() {
            process.stdout.write(`Building for production...\n`);
        },
        buildEnd() {
            const line = "---------------------------------------------------------";
            const msg = `❤️❤️❤️ Tell us about your game! - games@phaser.io ❤️❤️❤️`;
            process.stdout.write(`${line}\n${msg}\n${line}\n`);

            process.stdout.write(`✨ Done ✨\n`);
        }
    }
}

export default defineConfig(({ command }) => ({
    base: './',
    plugins: [
        react(),
        phasermsg(),
    ],
    // `warning` hides the preview URL (printed at info) so the server looks "stuck".
    logLevel: command === 'build' ? 'warning' : 'info',
    preview: {
        host: '0.0.0.0',
        port: 4173,
        // If 4173 is taken (old preview tab), try the next free port instead of exiting.
        strictPort: false,
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    phaser: ['phaser']
                }
            }
        },
        minify: 'terser',
        terserOptions: {
            compress: {
                passes: 2
            },
            mangle: true,
            format: {
                comments: false
            }
        }
    }
}));
