import { LabelBuilder, LabelSize, ButtonBuilder, ButtonStyle } from '@tdq/ora-components';
import { of } from 'rxjs';
import { map } from 'rxjs/operators';
import { router } from '../../routes';

export function createDashboardHeader(): HTMLElement {
    const header = document.createElement('header');
    header.className = 'border-b px-px-24 flex items-center justify-between flex-shrink-0';
    header.style.cssText = 'min-height: 64px; background: var(--md-sys-color-surface-container-low); backdrop-filter: blur(12px); border-color: rgba(121,116,126,0.08);';

    // Left: title + live badge
    const leftSide = document.createElement('div');
    leftSide.className = 'flex items-center gap-px-16';

    const title$ = router.currentRoute$.pipe(
        map(route => {
            const page = route?.params?.page;
            if (!page) return 'Overview';
            return page.charAt(0).toUpperCase() + page.slice(1);
        })
    );

    const titleEl = new LabelBuilder()
        .withCaption(title$)
        .withSize(LabelSize.LARGE)
        .build();

    const liveBadge = document.createElement('div');
    liveBadge.className = 'flex items-center gap-px-8 px-px-12 py-px-4 rounded-full text-label-small';
    liveBadge.style.cssText = 'background: rgba(40,200,64,0.08); color: #16a34a; border: 1px solid rgba(40,200,64,0.15);';
    liveBadge.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>Live data`;

    leftSide.appendChild(titleEl);
    leftSide.appendChild(liveBadge);

    // Right: search + avatar
    const rightSide = document.createElement('div');
    rightSide.className = 'flex items-center gap-px-12';

    const searchWrapper = document.createElement('div');
    searchWrapper.className = 'relative';
    searchWrapper.innerHTML = `<svg class="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-40" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg><input type="text" placeholder="Search..." class="bg-surface-variant-alpha-30 border border-outline-alpha-10 rounded-full pl-px-32 pr-px-16 py-px-4 text-body-medium focus:outline-none focus:border-primary-alpha-40 transition-colors" style="width: 220px;">`;

    const avatarBtn = new ButtonBuilder()
        .withStyle(of(ButtonStyle.TONAL))
        .withCaption(of('N'))
        .build();
    avatarBtn.style.cssText = 'min-width: 40px; width: 40px; height: 40px; border-radius: 50%; padding: 0;';

    rightSide.appendChild(searchWrapper);
    rightSide.appendChild(avatarBtn);

    header.appendChild(leftSide);
    header.appendChild(rightSide);

    return header;
}
