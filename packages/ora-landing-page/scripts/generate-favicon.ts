/**
 * Generates public/favicon.ico and public/favicon.svg from the brand logo.
 * Uses Playwright to rasterize the SVG at 16, 32, and 48 px,
 * then packs the PNGs into an ICO file (PNG-in-ICO format).
 *
 * Run: tsx scripts/generate-favicon.ts
 */

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, '..', 'public');

const SIZES = [16, 32, 48] as const;

// SVG source — exact replica of the logo component (logo.ts).
// Everything in the 18×18 viewBox coordinate space.
// rounded-large is 12px on a 36px (w-9) container = 6 units in the 18-unit viewBox.
const CORNER_RADIUS = 6; // viewBox units

const svgSource = (size: number) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 18 18">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4f46e5"/>
      <stop offset="100%" stop-color="#6366f1"/>
    </linearGradient>
    <clipPath id="c">
      <rect width="18" height="18" rx="${CORNER_RADIUS}" ry="${CORNER_RADIUS}"/>
    </clipPath>
  </defs>
  <!-- Background -->
  <rect width="18" height="18" rx="${CORNER_RADIUS}" ry="${CORNER_RADIUS}" fill="url(#g)"/>
  <g clip-path="url(#c)">
    <!-- Triangle — same path as logo.ts -->
    <path d="M9 2L15.5 14H2.5L9 2Z" fill="white" fill-opacity="0.9"/>
    <!-- Soft circle accent at triangle base — same as logo.ts -->
    <circle cx="9" cy="10" r="2.5" fill="white" fill-opacity="0.6"/>
  </g>
</svg>`;

async function renderPng(browser: import('playwright').Browser, size: number): Promise<Buffer> {
    const page = await browser.newPage();
    try {
        await page.setViewportSize({ width: size, height: size });
        await page.setContent(`
<!DOCTYPE html>
<html>
<head>
<style>
  * { margin: 0; padding: 0; }
  body { width: ${size}px; height: ${size}px; overflow: hidden; background: transparent; }
</style>
</head>
<body>${svgSource(size)}</body>
</html>`, { waitUntil: 'load' });

        const png = await page.screenshot({
            type: 'png',
            clip: { x: 0, y: 0, width: size, height: size },
            omitBackground: true,
        });
        return Buffer.from(png);
    } finally {
        await page.close();
    }
}

function packIco(pngBuffers: { size: number; data: Buffer }[]): Buffer {
    // ICO format: ICONDIR + N×ICONDIRENTRY + N×PNG data
    const ICONDIR_SIZE = 6;
    const ICONDIRENTRY_SIZE = 16;
    const headerSize = ICONDIR_SIZE + pngBuffers.length * ICONDIRENTRY_SIZE;

    // Calculate offsets
    let offset = headerSize;
    const entries = pngBuffers.map(({ size, data }) => {
        const entry = { size, data, offset };
        offset += data.length;
        return entry;
    });

    const totalSize = offset;
    const buf = Buffer.alloc(totalSize, 0);
    let pos = 0;

    // ICONDIR header
    buf.writeUInt16LE(0, pos); pos += 2;          // idReserved = 0
    buf.writeUInt16LE(1, pos); pos += 2;          // idType = 1 (icon)
    buf.writeUInt16LE(pngBuffers.length, pos); pos += 2; // idCount

    // ICONDIRENTRY for each image
    for (const { size, data, offset: imgOffset } of entries) {
        buf.writeUInt8(size >= 256 ? 0 : size, pos); pos++;  // bWidth
        buf.writeUInt8(size >= 256 ? 0 : size, pos); pos++;  // bHeight
        buf.writeUInt8(0, pos); pos++;             // bColorCount (0 = true-color)
        buf.writeUInt8(0, pos); pos++;             // bReserved
        buf.writeUInt16LE(1, pos); pos += 2;       // wPlanes
        buf.writeUInt16LE(32, pos); pos += 2;      // wBitCount
        buf.writeUInt32LE(data.length, pos); pos += 4; // dwBytesInRes
        buf.writeUInt32LE(imgOffset, pos); pos += 4;   // dwImageOffset
    }

    // PNG data
    for (const { data } of entries) {
        data.copy(buf, pos);
        pos += data.length;
    }

    return buf;
}

async function main(): Promise<void> {
    mkdirSync(PUBLIC, { recursive: true });

    // Write SVG favicon (modern browsers prefer this)
    writeFileSync(join(PUBLIC, 'favicon.svg'), svgSource(32), 'utf-8');
    console.log('Generated: public/favicon.svg');

    const browser = await chromium.launch();
    try {
        const pngBuffers: { size: number; data: Buffer }[] = [];
        for (const size of SIZES) {
            console.log(`Rendering ${size}×${size}…`);
            const data = await renderPng(browser, size);
            pngBuffers.push({ size, data });
        }

        const ico = packIco(pngBuffers);
        writeFileSync(join(PUBLIC, 'favicon.ico'), ico);
        console.log(`Generated: public/favicon.ico (${ico.length} bytes, sizes: ${SIZES.join(', ')} px)`);
    } finally {
        await browser.close();
    }
}

main().catch((err) => {
    console.error('favicon generation failed:', err);
    process.exit(1);
});
