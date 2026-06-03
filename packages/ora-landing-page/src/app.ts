import '@tdq/ora-components/style.css'
import { ThemeManager } from '@tdq/ora-components';
import { router } from './routes';
import { controlAnimations } from './utils/animation-control';

declare global {
    interface Window {
        __APP_READY__: boolean;
    }
}

const app = document.getElementById('app')!;
ThemeManager.getInstance();

app.replaceChildren(router.build());

controlAnimations(['.cursor-sweep', '.marquee-track', '.js-pulse-badge']);

// Signal to the prerender script that the initial route is mounted
router.currentRoute$.subscribe((match) => {
    if (match && !window.__APP_READY__) {
        window.__APP_READY__ = true;
    }
});
