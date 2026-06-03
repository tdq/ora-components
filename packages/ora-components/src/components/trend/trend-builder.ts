import { Observable, Subscription } from 'rxjs';
import { ComponentBuilder } from '../../core/component-builder';
import { registerDestroy } from '../../core/destroyable-element';
import { Trend } from '../../types/trend';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const DIRECTION_CLASS: Record<string, string> = {
    up: 'trend-up',
    down: 'trend-down',
    flat: 'trend-flat',
};

const BASE_CLASSES = 'inline-flex items-center gap-px-4 text-label-small font-semibold px-px-8 py-px-4 rounded-full tabular-nums';

export class TrendBuilder implements ComponentBuilder {
    private trend$?: Observable<Trend>;
    private className$?: Observable<string>;

    withTrend(trend$: Observable<Trend>): this {
        this.trend$ = trend$;
        return this;
    }

    withClass(className$: Observable<string>): this {
        this.className$ = className$;
        return this;
    }

    build(): HTMLElement {
        if (!this.trend$) {
            throw new Error('TrendBuilder: withTrend() is required before build()');
        }

        const root = document.createElement('span');
        const sub = new Subscription();

        let currentTrend: Trend | null = null;
        let currentClass: string | undefined;

        const render = () => {
            if (!currentTrend) return;

            const trend = currentTrend;
            const direction: 'up' | 'down' | 'flat' =
                trend.value > 0 ? 'up' : trend.value < 0 ? 'down' : 'flat';

            const sign = direction === 'down' ? '-' : '+';
            const arrow = direction === 'up' ? '▲' : direction === 'down' ? '▼' : '';

            root.className = cn(BASE_CLASSES, DIRECTION_CLASS[direction], currentClass);

            root.innerHTML = '';
            if (arrow) {
                const arrowSpan = document.createElement('span');
                arrowSpan.textContent = arrow;
                arrowSpan.setAttribute('aria-hidden', 'true');
                root.appendChild(arrowSpan);
            }
            root.appendChild(document.createTextNode(`${sign}${Math.abs(trend.value).toFixed(1)}% `));
            root.appendChild(document.createTextNode(trend.period));
        };

        sub.add(this.trend$.subscribe(trend => {
            currentTrend = trend;
            render();
        }));

        if (this.className$) {
            sub.add(this.className$.subscribe(cls => {
                currentClass = cls;
                render();
            }));
        }

        sub.add(this.trend$.subscribe(trend => {
            const direction: 'up' | 'down' | 'flat' =
                trend.value > 0 ? 'up' : trend.value < 0 ? 'down' : 'flat';

            const sign = direction === 'down' ? '-' : '+';
            const arrow = direction === 'up' ? '▲' : direction === 'down' ? '▼' : '';

            root.className = cn(BASE_CLASSES, DIRECTION_CLASS[direction], currentClass);

            root.innerHTML = '';
            if (arrow) {
                const arrowSpan = document.createElement('span');
                arrowSpan.textContent = arrow;
                arrowSpan.setAttribute('aria-hidden', 'true');
                root.appendChild(arrowSpan);
            }
            root.appendChild(document.createTextNode(`${sign}${Math.abs(trend.value).toFixed(1)}% `));
            root.appendChild(document.createTextNode(trend.period));
        }));

        registerDestroy(root, () => sub.unsubscribe());

        return root;
    }
}
