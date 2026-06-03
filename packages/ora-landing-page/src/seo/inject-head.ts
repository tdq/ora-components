import { RouteMetadata } from './route-metadata';

const SITE_NAME = 'Ora Components';

export function renderHead(meta: RouteMetadata, siteOrigin: string): string {
    const canonical = `${siteOrigin}${meta.canonicalPath}`;
    const ogImage = meta.ogImage ? `${siteOrigin}${meta.ogImage}` : '';

    const jsonLdBlocks = (meta.jsonLd ?? [])
        .map((obj) => `<script type="application/ld+json">${JSON.stringify(obj)}</script>`)
        .join('\n    ');

    return `
    <title>${meta.title}</title>
    <meta name="description" content="${esc(meta.description)}">
    ${meta.keywords ? `<meta name="keywords" content="${esc(meta.keywords.join(', '))}">` : ''}
    <link rel="canonical" href="${canonical}">
    ${meta.noindex ? '<meta name="robots" content="noindex, nofollow">' : '<meta name="robots" content="index, follow">'}

    <!-- Open Graph -->
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="${esc(SITE_NAME)}">
    <meta property="og:title" content="${esc(meta.title)}">
    <meta property="og:description" content="${esc(meta.description)}">
    <meta property="og:url" content="${canonical}">
    ${ogImage ? `<meta property="og:image" content="${ogImage}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">` : ''}

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${esc(meta.title)}">
    <meta name="twitter:description" content="${esc(meta.description)}">
    ${ogImage ? `<meta name="twitter:image" content="${ogImage}">` : ''}

    ${jsonLdBlocks}`.trim();
}

export function applyHeadToDocument(meta: RouteMetadata, siteOrigin: string): void {
    document.title = meta.title;

    setMeta('name', 'description', meta.description);
    setMeta('name', 'robots', meta.noindex ? 'noindex, nofollow' : 'index, follow');
    if (meta.keywords) setMeta('name', 'keywords', meta.keywords.join(', '));

    setMeta('property', 'og:title', meta.title);
    setMeta('property', 'og:description', meta.description);
    setMeta('property', 'og:url', `${siteOrigin}${meta.canonicalPath}`);

    setMeta('name', 'twitter:title', meta.title);
    setMeta('name', 'twitter:description', meta.description);

    setLink('canonical', `${siteOrigin}${meta.canonicalPath}`);

    // Remove old JSON-LD blocks and inject fresh ones
    document.querySelectorAll('script[type="application/ld+json"][data-seo]').forEach((el) => el.remove());
    (meta.jsonLd ?? []).forEach((obj) => {
        const s = document.createElement('script');
        s.type = 'application/ld+json';
        s.dataset.seo = 'true';
        s.textContent = JSON.stringify(obj);
        document.head.appendChild(s);
    });
}

function setMeta(attrName: string, attrValue: string, content: string): void {
    let el = document.head.querySelector<HTMLMetaElement>(`meta[${attrName}="${attrValue}"]`);
    if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attrName, attrValue);
        document.head.appendChild(el);
    }
    el.content = content;
}

function setLink(rel: string, href: string): void {
    let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
    if (!el) {
        el = document.createElement('link');
        el.rel = rel;
        document.head.appendChild(el);
    }
    el.href = href;
}

function esc(str: string): string {
    return str.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
