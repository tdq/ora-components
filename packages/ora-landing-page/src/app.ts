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

// Defer the initial build to allow the shell to paint first.
// setTimeout(..., 1) yields the main thread more effectively than requestAnimationFrame
// for the very first paint of the HTML/CSS shell.
setTimeout(() => {
    app.replaceChildren(router.build());
}, 1);

controlAnimations(['.cursor-sweep', '.marquee-track', '.js-pulse-badge']);

// Signal to the prerender script that the initial route is mounted
router.currentRoute$.subscribe((match) => {
    if (match && !window.__APP_READY__) {
        window.__APP_READY__ = true;
    }
});
