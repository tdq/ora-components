import { Observable, BehaviorSubject, of } from 'rxjs';
import { ComponentBuilder } from '../../core/component-builder';
import { StepBuilder } from './step-builder';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { registerDestroy } from '../../core/destroyable-element';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export class StepsBuilder implements ComponentBuilder {
    private steps: StepBuilder[] = [];
    private externalActiveStep$?: Observable<number>;
    private stepClickHandler?: (index: number) => void;
    private isGlass: boolean = false;
    private isVertical: boolean = false;
    private className$?: Observable<string>;

    addStep(): StepBuilder {
        const step = new StepBuilder();
        this.steps.push(step);
        return step;
    }

    withActiveStep(activeStep$: Observable<number>): this {
        this.externalActiveStep$ = activeStep$;
        return this;
    }

    withStepClick(handler: (index: number) => void): this {
        this.stepClickHandler = handler;
        return this;
    }

    asGlass(): this {
        this.isGlass = true;
        return this;
    }

    asVertical(): this {
        this.isVertical = true;
        return this;
    }

    withClass(className: Observable<string>): this {
        this.className$ = className;
        return this;
    }

    build(): HTMLElement {
        const container = document.createElement('div');

        // Determine active step observable and internal subject (if in internal mode)
        const internalSubject = this.externalActiveStep$
            ? null
            : new BehaviorSubject<number>(0);
        const activeStep$: Observable<number> = this.externalActiveStep$
            ?? internalSubject!;

        // Container class subscription
        const baseClasses$ = this.className$ || of('');
        const classSub = baseClasses$.subscribe(cls => {
            container.className = cn(
                'flex w-full',
                this.isVertical ? 'flex-col items-start' : 'items-start',
                cls
            );
        });
        registerDestroy(container, () => classSub.unsubscribe());

        // Build step elements first (circles, captions, descriptions)
        const stepElements: {
            wrapper: HTMLElement;
            circle: HTMLElement;
            caption: HTMLElement;
            description?: HTMLElement;
        }[] = [];

        // Build connector elements (one between each pair of adjacent steps)
        const connectorElements: HTMLElement[] = [];

        const isClickable = !!this.stepClickHandler;

        this.steps.forEach((step, index) => {
            // Step wrapper — button if clickable, div otherwise
            const wrapper = document.createElement(isClickable ? 'button' : 'div');
            if (isClickable) {
                (wrapper as HTMLButtonElement).type = 'button';
            }
            wrapper.className = cn(
                isClickable && 'cursor-pointer',
                this.isVertical
                    ? 'flex flex-row items-center gap-2'
                    : 'flex flex-col items-center gap-1.5'
            );

            // Circle
            const circle = document.createElement('div');
            circle.className = cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200'
            );

            // Caption
            const caption = document.createElement('span');
            caption.className = 'text-xs font-medium transition-colors duration-200 whitespace-nowrap';

            // Description (conditionally rendered)
            let description: HTMLElement | undefined;
            if (step.description$) {
                description = document.createElement('span');
                description.style.display = 'none';
            }

            // Caption text subscription
            if (step.caption$) {
                const capSub = step.caption$.subscribe(text => {
                    caption.textContent = text;
                });
                registerDestroy(container, () => capSub.unsubscribe());
            }

            // Description text subscription
            if (description && step.description$) {
                const descSub = step.description$.subscribe(text => {
                    description!.textContent = text;
                });
                registerDestroy(container, () => descSub.unsubscribe());
            }

            if (this.isVertical) {
                wrapper.appendChild(circle);
                const textCol = document.createElement('div');
                textCol.className = 'flex flex-col';
                textCol.appendChild(caption);
                if (description) {
                    textCol.appendChild(description);
                }
                wrapper.appendChild(textCol);
            } else {
                wrapper.appendChild(circle);
                wrapper.appendChild(caption);
                if (description) {
                    wrapper.appendChild(description);
                }
            }

            // Click handler — reads currentActiveIndex from the closure variable
            // updated by stateSub, avoiding an unsafe synchronous peek.
            if (isClickable) {
                wrapper.addEventListener('click', () => {
                    if (index === currentActiveIndex) return;
                    this.stepClickHandler!(index);
                    if (internalSubject) {
                        internalSubject.next(index);
                    }
                });
            }

            // Step visibility
            if (step.visible$) {
                const visSub = step.visible$.subscribe(visible => {
                    wrapper.style.display = visible ? '' : 'none';
                    // In internal mode only: if this step was active and now hidden, fall back to 0
                    if (!visible && internalSubject && internalSubject.value === index) {
                        internalSubject.next(0);
                    }
                });
                registerDestroy(container, () => visSub.unsubscribe());
            }

            stepElements.push({ wrapper, circle, caption, description });

            // Add connector after each step except the last
            if (index < this.steps.length - 1) {
                const connector = document.createElement('div');
                connector.className = cn(
                    'flex-1 transition-colors duration-200',
                    this.isVertical
                        ? 'w-px my-1 ml-4'
                        : 'h-px mx-2 mt-4'
                );
                connectorElements.push(connector);
            }
        });

        // Closure variable tracking the latest emitted active index.
        // Updated by stateSub; read by click handlers to avoid unsafe synchronous peek.
        let currentActiveIndex = 0;

        // Single subscription that drives all state-dependent visual updates
        const stateSub = activeStep$.subscribe(activeIndex => {
            currentActiveIndex = activeIndex;
            stepElements.forEach(({ circle, caption, description }, i) => {
                const isCompleted = i < activeIndex;
                const isActive = i === activeIndex;

                // Circle classes
                const circleBase = 'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-200';
                if (isCompleted) {
                    circle.className = cn(
                        circleBase,
                        !this.isGlass && 'bg-secondary text-on-secondary',
                        this.isGlass && 'bg-white/30 text-gray-900 dark:text-white/90'
                    );
                    circle.textContent = '✓';
                } else if (isActive) {
                    circle.className = cn(
                        circleBase,
                        !this.isGlass && 'bg-primary text-on-primary',
                        this.isGlass && 'bg-white/80 text-gray-900'
                    );
                    circle.textContent = String(i + 1);
                } else {
                    circle.className = cn(
                        circleBase,
                        !this.isGlass && 'border-2 border-outline/30 text-on-surface-variant/60',
                        this.isGlass && 'border-2 border-gray-900/30 text-gray-600 dark:border-white/30 dark:text-white/50'
                    );
                    circle.textContent = String(i + 1);
                }

                // Caption classes
                const captionBase = 'text-xs font-medium transition-colors duration-200 whitespace-nowrap';
                if (isCompleted) {
                    caption.className = cn(
                        captionBase,
                        !this.isGlass && 'text-secondary',
                        this.isGlass && 'text-gray-700 dark:text-white/80'
                    );
                } else if (isActive) {
                    caption.className = cn(
                        captionBase,
                        !this.isGlass && 'text-primary',
                        this.isGlass && 'text-gray-900 dark:text-white'
                    );
                } else {
                    caption.className = cn(
                        captionBase,
                        !this.isGlass && 'text-on-surface-variant/40',
                        this.isGlass && 'text-gray-600 dark:text-white/40'
                    );
                }

                // Description visibility and classes
                if (description) {
                    description.style.display = isActive ? '' : 'none';
                    description.className = cn(
                        'text-xs mt-0.5',
                        !this.isGlass && 'text-on-surface-variant',
                        this.isGlass && 'text-gray-700 dark:text-white/70'
                    );
                }
            });

            // Connector states
            connectorElements.forEach((connector, i) => {
                // Connector at index i connects step i to step i+1.
                // It's "completed" when activeIndex > i (i.e., step i+1 or beyond is active/completed).
                const isCompleted = activeIndex > i;
                connector.className = cn(
                    'flex-1 transition-colors duration-200',
                    this.isVertical ? 'w-px my-1 ml-4' : 'h-px mx-2 mt-4',
                    isCompleted
                        ? (!this.isGlass ? 'bg-secondary/60' : 'bg-gray-900/40 dark:bg-white/50')
                        : (!this.isGlass ? 'bg-outline/30' : 'bg-gray-900/20 dark:bg-white/30')
                );
            });
        });
        registerDestroy(container, () => stateSub.unsubscribe());

        // Assemble the DOM: interleave step wrappers and connectors
        stepElements.forEach(({ wrapper }, i) => {
            container.appendChild(wrapper);
            if (i < connectorElements.length) {
                container.appendChild(connectorElements[i]);
            }
        });

        return container;
    }
}
