import { RouterBuilder } from '@tdq/ora-components';
import { createLandingPage } from './sections/landing-page';
import { applyHeadToDocument } from './seo/inject-head';
import { ROUTE_METADATA } from './seo/route-metadata';

const siteOrigin = typeof window !== 'undefined' ? window.location.origin : '';

export const router = new RouterBuilder()
    .withBase('/')
    .withFallback('/');

router.addRoute()
    .withPattern('/')
    .withContent(() => ({ build: () => createLandingPage() }))
    .withOnEnter(() => applyHeadToDocument(ROUTE_METADATA['/'], siteOrigin));

import { isMobileViewport } from './utils/viewport';

const dashboardFactory = async () => {
    if (isMobileViewport()) {
        const { createDashboardMobileFallback } = await import('./sections/dashboard-mobile-fallback');
        return { build: () => createDashboardMobileFallback() };
    }
    const { createDashboardDemo } = await import('./demo/dashboard');
    return { build: () => createDashboardDemo() };
};

router.addRoute()
    .withPattern('/dashboard')
    .withContent(dashboardFactory)
    .withOnEnter(() => applyHeadToDocument(ROUTE_METADATA['/dashboard'], siteOrigin));

router.addRoute()
    .withPattern('/dashboard/{page}')
    .withContent(dashboardFactory)
    .withOnEnter(() => applyHeadToDocument(ROUTE_METADATA['/dashboard/{page}'], siteOrigin));
