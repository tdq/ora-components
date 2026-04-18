import { BehaviorSubject, of } from 'rxjs';
import '@testing-library/jest-dom';
import { ListBoxBuilder } from './listbox';
import { ListBoxStyle } from './types';

const FRUITS = ['Apple', 'Banana', 'Cherry'];

function buildBorderless(error$?: BehaviorSubject<string>) {
    const value$ = new BehaviorSubject<string | null>(null);
    const builder = new ListBoxBuilder<string>()
        .withItems(of(FRUITS))
        .withValue(value$)
        .withStyle(of(ListBoxStyle.BORDERLESS));
    if (error$) builder.withError(error$);
    const el = builder.build();
    return { el, value$ };
}

function getPanel(el: HTMLElement): HTMLDivElement {
    return el.querySelector('div:has(ul[role="listbox"])') as HTMLDivElement;
}

function getLiElements(el: HTMLElement): HTMLLIElement[] {
    return Array.from(el.querySelectorAll('li[role="option"]')) as HTMLLIElement[];
}

describe('ListBoxBuilder', () => {

    // ── withStyle(BORDERLESS) ────────────────────────────────────────────────

    describe('withStyle(BORDERLESS)', () => {

        // Spec 1: panel has no border classes
        it('panel does NOT have rounded-large, border, or border-outline classes', () => {
            const { el } = buildBorderless();
            const panel = getPanel(el);
            expect(panel).not.toHaveClass('rounded-large');
            expect(panel).not.toHaveClass('border');
            expect(panel).not.toHaveClass('border-outline');
        });

        // Spec 2: selected item uses bg-on-secondary-container/20 (tonal background)
        it('selected item uses bg-on-secondary-container/20', () => {
            const value$ = new BehaviorSubject<string | null>('Apple');
            const el = new ListBoxBuilder<string>()
                .withItems(of(FRUITS))
                .withValue(value$)
                .withStyle(of(ListBoxStyle.BORDERLESS))
                .build();

            const lis = getLiElements(el);
            expect(lis[0]).toHaveClass('bg-on-secondary-container/20');
        });

        // Spec 2 continued: unselected items do NOT have selected background
        it('unselected items do NOT have bg-on-secondary-container/20', () => {
            const value$ = new BehaviorSubject<string | null>('Apple');
            const el = new ListBoxBuilder<string>()
                .withItems(of(FRUITS))
                .withValue(value$)
                .withStyle(of(ListBoxStyle.BORDERLESS))
                .build();

            const lis = getLiElements(el);
            expect(lis[1]).not.toHaveClass('bg-on-secondary-container/20');
            expect(lis[2]).not.toHaveClass('bg-on-secondary-container/20');
        });

        // Spec 3: error re-introduces border
        it('panel gets rounded-large border border-error when withError emits a non-empty string', () => {
            const error$ = new BehaviorSubject('required');
            const { el } = buildBorderless(error$);
            const panel = getPanel(el);
            expect(panel).toHaveClass('rounded-large');
            expect(panel).toHaveClass('border');
            expect(panel).toHaveClass('border-error');
        });

        // Spec 4: clearing the error removes the border again
        it('border is removed again when error clears to empty string', () => {
            const error$ = new BehaviorSubject('required');
            const { el } = buildBorderless(error$);
            const panel = getPanel(el);

            // Sanity: border present while error is active
            expect(panel).toHaveClass('border');

            error$.next('');
            expect(panel).not.toHaveClass('rounded-large');
            expect(panel).not.toHaveClass('border');
            expect(panel).not.toHaveClass('border-error');
        });
    });

    // ── Regression: default TONAL style retains border classes ───────────────

    describe('default style (TONAL) regression', () => {
        it('panel still has rounded-large border border-outline with default TONAL style', () => {
            const el = new ListBoxBuilder<string>()
                .withItems(of(FRUITS))
                .build();
            const panel = getPanel(el);
            expect(panel).toHaveClass('rounded-large');
            expect(panel).toHaveClass('border');
            expect(panel).toHaveClass('border-outline');
        });
    });
});
