import { createHeader } from '../components/header';
import { createHero } from './hero';
import { createProblem } from './problem';
import { createFeatures } from './features';
import { createGetStarted } from './get-started';
import { createPlayground } from './playground';
import { createLogo } from '../components/logo';
import { router } from '../routes';

export function createLandingPage(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'flex flex-col w-full';

    container.appendChild(createHeader());

    const main = document.createElement('main');
    main.className = 'flex flex-col w-full';

    main.appendChild(createHero());
    main.appendChild(createProblem());
    main.appendChild(createFeatures());
    main.appendChild(createPlayground());
    main.appendChild(createGetStarted());

    container.appendChild(main);
    container.appendChild(createFooter());

    return container;
}

function createFooter(): HTMLElement {
    const footer = document.createElement('footer');
    footer.className = 'relative overflow-hidden';
    footer.style.cssText = 'background: var(--md-sys-color-surface-container-low);';

    // Gradient top border
    const topBorder = document.createElement('div');
    topBorder.className = 'w-full h-px';
    topBorder.style.cssText = 'background: linear-gradient(90deg, transparent 0%, rgba(79,70,229,0.4) 30%, rgba(99,102,241,0.4) 70%, transparent 100%);';
    footer.appendChild(topBorder);

    const inner = document.createElement('div');
    inner.className = 'max-w-7xl mx-auto px-px-24 py-px-64';

    // Footer grid
    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-1 md:grid-cols-3 gap-px-48 mb-px-48';

    // Brand column
    const brand = document.createElement('div');
    brand.appendChild(createLogo({ text: 'Ora Components', onClick: () => router.navigate('/') }));
    const desc = document.createElement('p');
    desc.className = 'text-body-medium text-on-surface-variant max-w-xs leading-relaxed mt-px-16';
    desc.style.cssText = 'opacity: 0.65;';
    desc.textContent = 'Modern, reactive UI components for the web. Built on TypeScript, RxJS, and Material 3 principles.';
    brand.appendChild(desc);

    // Links column
    const linksCol = document.createElement('div');
    linksCol.innerHTML = `
        <h4 class="text-label-large font-semibold text-on-surface mb-px-24">Explore</h4>
        <ul class="flex flex-col gap-px-12">
            <li><a href="#features" class="text-body-medium text-on-surface-variant hover:text-primary transition-colors duration-200" style="opacity: 0.7;">Features</a></li>
            <li><a href="#playground" class="text-body-medium text-on-surface-variant hover:text-primary transition-colors duration-200" style="opacity: 0.7;">Playground</a></li>
            <li><a href="#get-started" class="text-body-medium text-on-surface-variant hover:text-primary transition-colors duration-200" style="opacity: 0.7;">Getting Started</a></li>
        </ul>
    `;

    // Social column
    const socialCol = document.createElement('div');
    socialCol.innerHTML = `
        <h4 class="text-label-large font-semibold text-on-surface mb-px-24">Connect</h4>
        <div class="flex flex-col gap-px-12">
            <a href="https://github.com" target="_blank" rel="noopener" class="flex items-center gap-px-12 text-body-medium text-on-surface-variant hover:text-primary transition-colors duration-200 group" style="opacity: 0.7;">
                <div class="w-8 h-8 rounded-medium flex items-center justify-center border" style="border-color: rgba(121,116,126,0.15); background: var(--md-sys-color-surface);">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                    </svg>
                </div>
                GitHub
            </a>
            <a href="https://npmjs.com" target="_blank" rel="noopener" class="flex items-center gap-px-12 text-body-medium text-on-surface-variant hover:text-primary transition-colors duration-200" style="opacity: 0.7;">
                <div class="w-8 h-8 rounded-medium flex items-center justify-center border" style="border-color: rgba(121,116,126,0.15); background: var(--md-sys-color-surface);">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M0 7.334v8h6.666v1.332H12v-1.332h12v-8H0zm6.666 6.664H5.334v-4H3.999v4H1.335V8.667h5.331v5.331zm4 0v1.336H8.001V8.667h5.334v5.332h-2.669v-.001zm12.001 0h-1.33v-4h-1.336v4h-1.335v-4h-1.33v4h-2.671V8.667h8.002v5.331z"/></svg>
                </div>
                npm
            </a>
            <a href="https://storybook.${window.location.hostname}" target="_blank" rel="noopener" class="flex items-center gap-px-12 text-body-medium text-on-surface-variant hover:text-primary transition-colors duration-200" style="opacity: 0.7;">
                <div class="w-8 h-8 rounded-medium flex items-center justify-center border" style="border-color: rgba(121,116,126,0.15); background: var(--md-sys-color-surface);">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z"/>
                    </svg>
                </div>
                Storybook
            </a>
        </div>
    `;

    grid.appendChild(brand);
    grid.appendChild(linksCol);
    grid.appendChild(socialCol);
    inner.appendChild(grid);

    // Bottom bar
    const bottomBar = document.createElement('div');
    bottomBar.className = 'flex flex-col md:flex-row items-center justify-between pt-px-32 border-t gap-px-16';
    bottomBar.style.cssText = 'border-color: rgba(121,116,126,0.1);';
    bottomBar.innerHTML = `
        <p class="text-label-medium text-on-surface-variant" style="opacity: 0.5;">© 2026 Ora Design System. All rights reserved.</p>
        <p class="text-label-medium text-on-surface-variant flex items-center gap-px-8" style="opacity: 0.5;">
            Built with
            <span style="background: linear-gradient(135deg, #4f46e5, #6366f1); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; font-weight: 600;">Ora Components</span>
            &amp; RxJS
        </p>
    `;
    inner.appendChild(bottomBar);

    footer.appendChild(inner);
    return footer;
}
