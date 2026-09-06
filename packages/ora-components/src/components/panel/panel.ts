import { Observable, of } from 'rxjs';
import { ComponentBuilder } from '../../core/component-builder';
import { registerDestroy } from '../../core/destroyable-element';
import { cn } from '../../utils/cn';
import { applyTestId } from '../../core/test-id';

export enum PanelGap {
    SMALL = 'SMALL',
    MEDIUM = 'MEDIUM',
    LARGE = 'LARGE',
    EXTRA_LARGE = 'EXTRA_LARGE'
}

const GAP_MAP: Record<PanelGap, string> = {
    [PanelGap.SMALL]: 'p-px-4', // 4px
    [PanelGap.MEDIUM]: 'p-px-8', // 8px
    [PanelGap.LARGE]: 'p-px-16', // 16px
    [PanelGap.EXTRA_LARGE]: 'p-px-32', // 32px
};

export class PanelBuilder implements ComponentBuilder {
    private gap: PanelGap = PanelGap.MEDIUM;
    private content?: ComponentBuilder;
    private isGlass: boolean = false;
    private className$?: Observable<string>;
    private testId?: string;

    withGap(gap: PanelGap): this {
        this.gap = gap;
        return this;
    }

    withContent(content: ComponentBuilder): this {
        this.content = content;
        return this;
    }

    asGlass(isGlass: boolean = true): this {
        this.isGlass = isGlass;
        return this;
    }

    withClass(className: Observable<string>): this {
        this.className$ = className;
        return this;
    }

    /** Sets `data-testid` on the rendered host element. */
    withTestId(id: string): this {
        this.testId = id;
        return this;
    }

    build(): HTMLElement {
        const panel = document.createElement('div');
        const className$ = this.className$ || of('');
        
        const sub = className$.subscribe((extraClass) => {
            panel.className = cn(
                'w-full rounded-large [overflow:clip] transition-all',
                !this.isGlass && 'border bg-surface border-outline text-on-surface',
                this.isGlass && 'glass-effect',
                GAP_MAP[this.gap],
                extraClass
            );
        });

        registerDestroy(panel, () => sub.unsubscribe());

        if (this.content) {
            const body = this.content.build();
            if (!body.dataset.slot) {
                body.dataset.slot = 'body';
            }
            panel.appendChild(body);
        }

        applyTestId(panel, this.testId);

        return panel;
    }
}
