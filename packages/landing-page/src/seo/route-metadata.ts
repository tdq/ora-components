export interface JsonLdObject {
    '@context': string;
    '@type': string;
    [key: string]: unknown;
}

export interface RouteMetadata {
    title: string;
    description: string;
    canonicalPath: string;
    ogImage?: string;
    keywords?: string[];
    jsonLd?: JsonLdObject[];
    noindex?: boolean;
}

const SITE_NAME = 'Ora Components';
const OG_IMAGE = '/og-default.png';

export const ROUTE_METADATA: Record<string, RouteMetadata> = {
    '/': {
        title: 'Ora Components — Reactive UI Library for Financial Applications',
        description:
            'Enterprise-grade UI components built on RxJS, TypeScript, and Material 3. No Shadow DOM, no framework wrappers — reactive financial dashboards with ~60kb gzipped.',
        canonicalPath: '/',
        ogImage: OG_IMAGE,
        keywords: [
            'financial dashboard components',
            'enterprise fintech UI',
            'RxJS reactive components',
            'TypeScript UI library',
            'Material 3 components',
            'reactive UI library',
            'financial application components',
        ],
        jsonLd: [
            {
                '@context': 'https://schema.org',
                '@type': 'Organization',
                name: SITE_NAME,
                description:
                    'Provides enterprise-grade reactive UI components for financial applications built on RxJS and TypeScript.',
                url: 'https://ora-components.com',
                sameAs: [
                    'https://github.com/tdq/ora-components',
                    'https://www.npmjs.com/package/@tdq/ora-components',
                ],
            },
            {
                '@context': 'https://schema.org',
                '@type': 'SoftwareApplication',
                name: SITE_NAME,
                applicationCategory: 'BusinessApplication',
                operatingSystem: 'Web',
                description:
                    'Reactive UI component library for financial applications. Framework-agnostic, RxJS-native, with Material 3 design system and full TypeScript support.',
                offers: {
                    '@type': 'Offer',
                    price: '0',
                    priceCurrency: 'USD',
                },
                featureList: [
                    'RxJS-native reactive props',
                    'No Shadow DOM encapsulation',
                    'Material 3 design system',
                    'Full TypeScript type safety',
                    'Tree-shakeable exports (~60kb gzipped)',
                    'Tailwind CSS integration',
                    'Financial dashboard components',
                    'Zero runtime framework dependencies',
                ],
                url: 'https://ora-components.com',
                downloadUrl: 'https://www.npmjs.com/package/@tdq/ora-components',
                softwareVersion: '1.0.0',
            },
        ],
    },
    '/dashboard': {
        title: 'Dashboard Demo — Ora Components',
        description: 'Interactive financial dashboard demo built with Ora Components.',
        canonicalPath: '/dashboard',
        noindex: true,
    },
    '/dashboard/{page}': {
        title: 'Dashboard Demo — Ora Components',
        description: 'Interactive financial dashboard demo built with Ora Components.',
        canonicalPath: '/dashboard',
        noindex: true,
    },
};
