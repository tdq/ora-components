import { LabelBuilder, LabelSize, ButtonBuilder, ButtonStyle, PanelBuilder, PanelGap, LayoutBuilder, LayoutGap, SlotSize, Alignment } from '@tdq/ora-components';
import { of } from 'rxjs';
import { map } from 'rxjs/operators';
import { router } from '../../routes';

export function createDashboardHeader(): HTMLElement {
    // Left: title + live badge
    const leftSide = document.createElement('div');
    leftSide.className = 'flex items-center gap-px-12 min-w-0';

    const PAGE_TITLES: Record<string, string> = {
        'pl': 'P&L',
        'balance-sheet': 'Balance Sheet',
        'trading': 'Trading terminal',
    };

    const title$ = router.currentRoute$.pipe(
        map(route => {
            const page = route?.params?.page;
            if (!page) return 'Overview';
            return PAGE_TITLES[page] ?? page.charAt(0).toUpperCase() + page.slice(1);
        })
    );

    const titleEl = new LabelBuilder()
        .withCaption(title$)
        .withSize(LabelSize.LARGE)
        .build();

    const liveBadge = document.createElement('div');
    liveBadge.className = 'flex items-center gap-px-8 px-px-12 py-px-4 rounded-full text-label-small';
    liveBadge.style.cssText = 'background: var(--kpi-green-soft); color: var(--kpi-green-text); border: 1px solid color-mix(in srgb, var(--kpi-green) 22%, transparent);';
    liveBadge.innerHTML = `<span class="js-pulse-badge w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>Live data`;

    leftSide.appendChild(titleEl);
    leftSide.appendChild(liveBadge);

    // Right: search + avatar
    const rightSide = document.createElement('div');
    rightSide.className = 'flex items-center gap-px-8';

    const searchWrapper = document.createElement('div');
    searchWrapper.className = 'relative';
    searchWrapper.innerHTML = `<svg class="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant opacity-40" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg><input type="text" placeholder="Search..." class="bg-surface-variant-alpha-30 border border-outline-alpha-10 rounded-full pl-px-32 pr-px-16 text-body-medium focus:outline-none focus:border-primary-alpha-40 transition-colors" style="width: 220px; height: 36px;">`;

    const avatarBtn = new ButtonBuilder()
        .withStyle(of(ButtonStyle.TONAL))
        .withCaption(of('N'))
        .build();
    avatarBtn.style.cssText = 'min-width: 36px; width: 36px; height: 36px; border-radius: 50%; padding: 0;';

    rightSide.appendChild(searchWrapper);
    rightSide.appendChild(avatarBtn);

    // The bar is a PanelBuilder — the same surface the rail's panel uses — holding a
    // horizontal LayoutBuilder: title cluster left, search + avatar right. 52px tall so the
    // title sits on the rail's brand row; the panel's own SMALL gap (4px) plus the layout's
    // side classes give the 20px/8px inner insets.
    const row = new LayoutBuilder()
        .asHorizontal()
        .withGap(LayoutGap.NONE)
        .withClass(of('items-center h-full pl-px-16 pr-px-4'));
    row.addSlot().withSize(SlotSize.GROW).withContent({ build: () => leftSide });
    row.addSlot().withSize(SlotSize.FIT).withAlignment(of(Alignment.RIGHT)).withContent({ build: () => rightSide });

    return new PanelBuilder()
        .withGap(PanelGap.SMALL)
        .withClass(of('rounded-extra-large flex-shrink-0 h-[52px] bg-surface-container-low shadow-level-2 border-outline-alpha-20'))
        .withContent(row)
        .build();
}
