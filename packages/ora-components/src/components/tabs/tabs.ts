import { Observable, BehaviorSubject, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { ComponentBuilder } from '../../core/component-builder';
import { TabBuilder } from './tab-builder';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { registerDestroy } from '../../core/destroyable-element';
import { LabelBuilder, LabelSize } from '../label/label';
import { generateFieldId } from '../component-parts';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export class TabsBuilder implements ComponentBuilder {
    private caption$?: Observable<string>;
    private description$?: Observable<string>;
    private className$?: Observable<string>;
    private isGlass: boolean = false;
    private tabs: TabBuilder[] = [];
    private activeTabIndex$ = new BehaviorSubject<number>(0);

    withCaption(caption: Observable<string>): this {
        this.caption$ = caption;
        return this;
    }

    withDescription(description: Observable<string>): this {
        this.description$ = description;
        return this;
    }

    asGlass(): this {
        this.isGlass = true;
        return this;
    }

    addTab(): TabBuilder {
        const tab = new TabBuilder();
        this.tabs.push(tab);
        return tab;
    }

    withClass(className: Observable<string>): this {
        this.className$ = className;
        return this;
    }

    build(): HTMLElement {
        const tabsId = generateFieldId('tabs');
        const container = document.createElement('div');
        
        // Base classes
        const baseClasses$ = this.className$ || of('');

        const sub = baseClasses$.subscribe(cls => {
            container.className = cn(
                'flex flex-col w-full text-left', // Ensure full width
                cls
            );
        });
        registerDestroy(container, () => sub.unsubscribe());

        // Header Section (Caption + Description + Tabs)
        const headerSection = document.createElement('div');
        headerSection.className = cn(
            'flex flex-col border-b pb-0',
            !this.isGlass && 'border-outline-variant',
            this.isGlass && 'border-transparent'
        );

        // Caption & Description Container
        if (this.caption$ || this.description$) {
            const textContainer = document.createElement('div');
            textContainer.className = 'flex flex-col mb-3';

            if (this.caption$) {
                const labelBuilder = new LabelBuilder()
                    .withCaption(this.caption$)
                    .withSize(LabelSize.LARGE)
                    .withClass(of(cn(
                        'font-bold text-headline-small',
                        this.isGlass ? 'text-gray-700 dark:text-white/80' : 'text-on-surface'
                    )));
                
                textContainer.appendChild(labelBuilder.build());
            }

            if (this.description$) {
                const descBuilder = new LabelBuilder()
                    .withCaption(this.description$)
                    .withSize(LabelSize.SMALL)
                    .withClass(of(cn(
                        'text-body-medium mt-1',
                        this.isGlass ? 'text-gray-600 dark:text-white/60' : 'text-on-surface-variant'
                    )));
                
                textContainer.appendChild(descBuilder.build());
            }
            headerSection.appendChild(textContainer);
        }

        // Tabs Navigation (Scrollable)
        const tabsNavWrapper = document.createElement('div');
        tabsNavWrapper.className = 'flex-1 overflow-hidden w-full'; // To contain the scrollable area

        const tabsNav = document.createElement('div');
        tabsNav.role = 'tablist';
        tabsNav.className = 'flex flex-row overflow-x-auto gap-0 no-scrollbar items-end';
        
        // Render tabs
        this.tabs.forEach((tab, index) => {
            const tabBtn = document.createElement('button');
            tabBtn.role = 'tab';
            tabBtn.id = `${tabsId}-tab-${index}`;
            tabBtn.setAttribute('aria-controls', `${tabsId}-panel-${index}`);
            tabBtn.dataset.index = index.toString();

            const isActive$ = this.activeTabIndex$.pipe(map(i => i === index));
            
            // Tab visibility
            if (tab.visible$) {
                const visSub = tab.visible$.subscribe(visible => {
                    tabBtn.style.display = visible ? 'block' : 'none';
                    
                    if (!visible && this.activeTabIndex$.value === index) {
                         // Switch to first visible tab if current becomes hidden
                         // Simple logic: go to 0. 
                         this.activeTabIndex$.next(0);
                    }
                });
                registerDestroy(container, () => visSub.unsubscribe());
            }

            // Styling subscriptions
            const styleSub = isActive$.subscribe(active => {
                tabBtn.setAttribute('aria-selected', String(active));
                tabBtn.tabIndex = active ? 0 : -1;
                tabBtn.className = cn(
                    'relative px-4 py-3 min-w-[90px] text-label-large font-medium transition-colors duration-200 whitespace-nowrap select-none',
                    // Focus state
                    'focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-[-2px]',
                    
                    // Border bottom logic
                    'border-b-2',
                    
                    // Default Theme
                    !this.isGlass && active && 'border-primary text-primary',
                    !this.isGlass && !active && 'border-transparent text-on-surface-variant hover:bg-surface-variant/10 hover:text-on-surface',
                    
                    // Glass Theme
                    this.isGlass && active && 'border-gray-900 text-gray-900 dark:border-white/80 dark:text-white/80',
                    this.isGlass && !active && 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-black/5 dark:text-white/60 dark:hover:text-white/80 dark:hover:bg-white/10'
                );
            });
            registerDestroy(container, () => styleSub.unsubscribe());

            if (tab.caption$) {
                const capSub = tab.caption$.subscribe(text => {
                    tabBtn.textContent = text;
                });
                registerDestroy(container, () => capSub.unsubscribe());
            }

            tabBtn.onclick = () => this.activeTabIndex$.next(index);
            tabsNav.appendChild(tabBtn);
        });

        // Keyboard navigation
        tabsNav.onkeydown = (e: KeyboardEvent) => {
            const buttons = Array.from(tabsNav.querySelectorAll('button[role="tab"]')) as HTMLButtonElement[];
            const visibleButtons = buttons.filter(btn => btn.style.display !== 'none');
            const currentBtn = document.activeElement as HTMLButtonElement;
            const currentIndex = visibleButtons.indexOf(currentBtn);
            
            if (currentIndex === -1) return;

            let nextIndex = -1;
            if (e.key === 'ArrowRight') {
                nextIndex = (currentIndex + 1) % visibleButtons.length;
            } else if (e.key === 'ArrowLeft') {
                nextIndex = (currentIndex - 1 + visibleButtons.length) % visibleButtons.length;
            } else if (e.key === 'Home') {
                nextIndex = 0;
            } else if (e.key === 'End') {
                nextIndex = visibleButtons.length - 1;
            }

            if (nextIndex !== -1) {
                e.preventDefault();
                const nextBtn = visibleButtons[nextIndex];
                const originalIndex = parseInt(nextBtn.dataset.index!);
                this.activeTabIndex$.next(originalIndex);
                nextBtn.focus();
            }
        };

        tabsNavWrapper.appendChild(tabsNav);
        headerSection.appendChild(tabsNavWrapper);
        container.appendChild(headerSection);

        // Content Area
        const contentArea = document.createElement('div');
        contentArea.role = 'tabpanel';
        contentArea.className = cn(
            'flex-1 p-4'
        );

        // Render content for active tab
        const contentSub = this.activeTabIndex$.subscribe(index => {
            contentArea.innerHTML = '';
            contentArea.id = `${tabsId}-panel-${index}`;
            contentArea.setAttribute('aria-labelledby', `${tabsId}-tab-${index}`);
            
            const tab = this.tabs[index];
            if (tab && tab.content) {
                // If the tab is visible (we should check visibility too but let's assume active implies visible or at least intended)
                contentArea.appendChild(tab.content.build());
            }
        });
        registerDestroy(container, () => contentSub.unsubscribe());

        container.appendChild(contentArea);

        return container;
    }
}
