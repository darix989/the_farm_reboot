/**
 * Writes solid-color PNGs into public/ for the web app manifest and touch icons.
 * Run: node scripts/gen-pwa-icons.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

/** Matches --ui-color-bg in src/react/uiColors.scss */
const BG = { r: 0, g: 0, b: 0 };

function solidPng(width, height) {
    const png = new PNG({ width, height });
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (width * y + x) * 4;
            png.data[idx] = BG.r;
            png.data[idx + 1] = BG.g;
            png.data[idx + 2] = BG.b;
            png.data[idx + 3] = 255;
        }
    }
    return PNG.sync.write(png);
}

mkdirSync(publicDir, { recursive: true });
writeFileSync(join(publicDir, 'pwa-192.png'), solidPng(192, 192));
writeFileSync(join(publicDir, 'pwa-512.png'), solidPng(512, 512));
writeFileSync(join(publicDir, 'apple-touch-icon.png'), solidPng(180, 180));
writeFileSync(join(publicDir, 'favicon.png'), solidPng(32, 32));
console.log('Wrote PWA icons to public/');
