import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, '..', 'public');

const svg = (size, padding = 0) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#b7102a"/>
  <text x="50%" y="${size / 2 + size * 0.12}" font-family="Helvetica, Arial, sans-serif" font-size="${(size - padding * 2) * 0.6}" font-weight="900" text-anchor="middle" fill="#ffffff" letter-spacing="-${size * 0.02}">K</text>
</svg>
`;

async function makePng(size, filename, padding = 0) {
  const buf = await sharp(Buffer.from(svg(size, padding))).png().toBuffer();
  await writeFile(resolve(publicDir, filename), buf);
  console.log(`wrote ${filename} (${size}x${size})`);
}

await makePng(192, 'pwa-192x192.png');
await makePng(512, 'pwa-512x512.png');
await makePng(180, 'apple-touch-icon.png');
