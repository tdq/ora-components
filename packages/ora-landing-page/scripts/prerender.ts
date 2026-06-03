/**
 * Post-build prerender script.
 * Launches a headless browser against `vite preview`, waits for each route
 * to mount, injects SEO head content, then writes a fully-rendered
 * dist/<route>/index.html. Also emits sitemap.xml.
 *
 * Run via: tsx scripts/prerender.ts
 * Expected to execute after `vite build` (dist/ must exist).
 */

import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { preview } from 'vite';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const DIST = join(ROOT, 'dist');
const SITE_ORIGIN = 'https://ora-components.com';

interface PreRenderRoute {
    path: string;
    metadataKey: string;
    noindex?: boolean;
}

// Extend this list to add future content pages (/docs, /blog, etc.)
const PRERENDER_ROUTES: PreRenderRoute[] = [
    { path: '/', metadataKey: '/' },
];

async function main(): Promise<void> {
    // Start vite preview server
    const server = await preview({
        root: ROOT,
        preview: { port: 4174, strictPort: false },
    });

    const address = server.resolvedUrls?.local?.[0] ?? 'http://localhost:4174';
    const origin = address.replace(/\/$/, '');

    console.log(`Prerender: serving from ${origin}`);

    const browser = await chromium.launch();

    try {
        for (const route of PRERENDER_ROUTES) {
            await prerenderRoute(browser, origin, route);
        }

        writeSitemap(PRERENDER_ROUTES.filter((r) => !r.noindex));
        console.log('Prerender: complete');
    } finally {
        await browser.close();
        await server.close();
    }
}

async function prerenderRoute(
    browser: import('playwright').Browser,
    origin: string,
    route: PreRenderRoute
): Promise<void> {
    const url = `${origin}${route.path}`;
    console.log(`Prerender: ${url}`);

    const page = await browser.newPage();
    try {
        await page.goto(url, { waitUntil: 'networkidle' });

        // Wait for the app to signal it is ready
        await page.waitForFunction(() => (window as any).__APP_READY__ === true, {
            timeout: 15_000,
        });

        // Inject SEO head tags from our metadata registry
        // We import the metadata directly so the prerender script is the
        // single source of truth — no runtime fetch needed.
        const { ROUTE_METADATA } = await import('../src/seo/route-metadata.js');
        const { renderHead } = await import('../src/seo/inject-head.js');

        const meta = ROUTE_METADATA[route.metadataKey];
        if (!meta) {
            throw new Error(`No metadata found for key: ${route.metadataKey}`);
        }

        const headHtml = renderHead(meta, SITE_ORIGIN);

        // Remove the placeholder SEO tags from the shell index.html (they will
        // be replaced by the freshly rendered ones below)
        await page.evaluate((html: string) => {
            // Strip existing title/meta/link/ld+json injected by the shell
            const selectors = [
                'title',
                'meta[name="description"]',
                'meta[name="robots"]',
                'meta[name="keywords"]',
                'link[rel="canonical"]',
                'meta[property^="og:"]',
                'meta[name^="twitter:"]',
                'meta[name^="og:"]',
                'script[type="application/ld+json"]',
            ];
            selectors.forEach((sel) => {
                document.querySelectorAll(sel).forEach((el) => el.remove());
            });

            // Inject the fresh SEO block
            const tmp = document.createElement('div');
            tmp.innerHTML = html;
            Array.from(tmp.children).forEach((child) => {
                document.head.appendChild(child);
            });
        }, headHtml);

        const html = await page.content();

        // Write to dist
        const outPath =
            route.path === '/'
                ? join(DIST, 'index.html')
                : join(DIST, route.path.replace(/^\//, ''), 'index.html');

        mkdirSync(dirname(outPath), { recursive: true });
        writeFileSync(outPath, html, 'utf-8');
        console.log(`Prerender: wrote ${outPath}`);
    } finally {
        await page.close();
    }
}

function writeSitemap(routes: PreRenderRoute[]): void {
    const today = new Date().toISOString().split('T')[0];
    const urls = routes
        .map(
            (r) => `  <url>
    <loc>${SITE_ORIGIN}${r.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${r.path === '/' ? '1.0' : '0.8'}</priority>
  </url>`
        )
        .join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

    writeFileSync(join(DIST, 'sitemap.xml'), xml, 'utf-8');
    console.log('Prerender: wrote dist/sitemap.xml');
}

main().catch((err) => {
    console.error('Prerender failed:', err);
    process.exit(1);
});
