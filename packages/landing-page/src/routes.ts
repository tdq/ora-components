import { RouterBuilder } from '@tdq/ora-components';
import { createLandingPage } from './sections/landing-page';
import { createDashboardDemo } from './demo/dashboard';
import { createFinanceDemo } from './demo/finance';

export const router = new RouterBuilder()
    .withBase('/')
    .withFallback('/');

router.addRoute()
    .withPattern('/')
    .withContent(() => ({ build: () => createLandingPage() }));

router.addRoute()
    .withPattern('/dashboard')
    .withContent(() => ({ build: () => createDashboardDemo() }));

router.addRoute()
    .withPattern('/dashboard/{page}')
    .withContent(() => ({ build: () => createDashboardDemo() }));

router.addRoute()
    .withPattern('/finance')
    .withContent(() => ({ build: () => createFinanceDemo() }));
