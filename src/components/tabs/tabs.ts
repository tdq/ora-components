import { Observable, BehaviorSubject, of, combineLatest, Subscription } from 'rxjs';
import { map, switchMap, distinctUntilChanged } from 'rxjs/operators';
import { ComponentBuilder } from '../../core/component-builder';
import { TabBuilder } from './tab-builder';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { registerDestroy } from '../../core/destroyable-element';
import { LabelBuilder, LabelSize } from '../label/label';

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
            'flex flex-col md:flex-row md:items-end gap-4 border-b pb-0',
             this.isGlass ? 'border-white/20' : 'border-outline-variant'
        );
        
        // Caption & Description Container
        if (this.caption$ || this.description$) {
            const textContainer = document.createElement('div');
            textContainer.className = 'flex flex-col mb-2 mr-4 min-w-[200px] shrink-0';

            if (this.caption$) {
                const labelBuilder = new LabelBuilder()
                    .withCaption(this.caption$)
                    .withSize(LabelSize.LARGE)
                    .withClass(of(cn(
                        'font-bold text-headline-small',
                        this.isGlass ? 'text-white' : 'text-on-surface'
                    )));
                
                textContainer.appendChild(labelBuilder.build());
            }

            if (this.description$) {
                const descBuilder = new LabelBuilder()
                    .withCaption(this.description$)
                    .withSize(LabelSize.SMALL)
                    .withClass(of(cn(
                        'text-body-medium mt-1',
                        this.isGlass ? 'text-white/70' : 'text-on-surface-variant'
                    )));
                
                textContainer.appendChild(descBuilder.build());
            }
            headerSection.appendChild(textContainer);
        }

        // Tabs Navigation (Scrollable)
        const tabsNavWrapper = document.createElement('div');
        tabsNavWrapper.className = 'flex-1 overflow-hidden w-full'; // To contain the scrollable area

        const tabsNav = document.createElement('div');
        tabsNav.className = 'flex flex-row overflow-x-auto gap-0 no-scrollbar items-end';
        
        // Render tabs
        this.tabs.forEach((tab, index) => {
            const tabBtn = document.createElement('button');
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
                tabBtn.className = cn(
                    'relative px-4 py-3 min-w-[90px] text-label-large font-medium transition-colors duration-200 whitespace-nowrap outline-none select-none',
                    // Border bottom logic
                    'border-b-2',
                    
                    // Default Theme
                    !this.isGlass && active && 'border-primary text-primary',
                    !this.isGlass && !active && 'border-transparent text-on-surface-variant hover:bg-surface-variant/10 hover:text-on-surface',
                    
                    // Glass Theme
                    this.isGlass && active && 'border-white text-white',
                    this.isGlass && !active && 'border-transparent text-white/70 hover:bg-white/10 hover:text-white'
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

        tabsNavWrapper.appendChild(tabsNav);
        headerSection.appendChild(tabsNavWrapper);
        container.appendChild(headerSection);

        // Content Area
        const contentArea = document.createElement('div');
        contentArea.className = cn(
            'flex-1 p-4',
            this.isGlass && 'bg-white/5 backdrop-blur-md rounded-b-lg text-white' // Glass content background
        );

        // Render content for active tab
        const contentSub = this.activeTabIndex$.subscribe(index => {
            contentArea.innerHTML = '';
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
