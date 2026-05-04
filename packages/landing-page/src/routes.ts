import { RouterBuilder } from '@tdq/ora-components';
import { createLandingPage } from './sections/landing-page';

export const router = new RouterBuilder()
    .withBase('/')
    .withFallback('/');

router.addRoute()
    .withPattern('/')
    .withContent(() => ({ build: () => createLandingPage() }));

router.addRoute()
    .withPattern('/dashboard')
    .withContent(async () => {
        const { createDashboardDemo } = await import('./demo/dashboard');

        return { build: () => createDashboardDemo() }
    });

router.addRoute()
    .withPattern('/dashboard/{page}')
    .withContent(async () => {
        const { createDashboardDemo } = await import('./demo/dashboard');

        return { build: () => createDashboardDemo() }
    });
