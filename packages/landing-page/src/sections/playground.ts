import { ButtonBuilder, TextFieldBuilder, CheckboxBuilder, ComboBoxBuilder, ButtonStyle } from 'aura-components';
import { BehaviorSubject, of } from 'rxjs';

export function createPlayground(): HTMLElement {
    const section = document.createElement('section');
    section.id = 'playground';
    section.className = 'py-px-96 px-px-24 relative overflow-hidden';
    section.style.cssText = 'background: linear-gradient(180deg, var(--md-sys-color-surface-container-low) 0%, var(--md-sys-color-surface) 100%);';

    // Background decoration
    const bgDec = document.createElement('div');
    bgDec.className = 'absolute inset-0 -z-10 overflow-hidden';
    bgDec.innerHTML = `
        <div class="absolute bottom-0 right-0 w-[600px] h-[600px] rounded-full" style="background: radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%);"></div>
        <div class="absolute top-0 left-0 w-[400px] h-[400px] rounded-full" style="background: radial-gradient(circle, rgba(79,70,229,0.05) 0%, transparent 70%);"></div>
    `;
    section.appendChild(bgDec);

    // Section header
    const header = document.createElement('div');
    header.className = 'max-w-7xl mx-auto text-center mb-px-64';
    header.innerHTML = `
        <div class="inline-flex items-center gap-px-8 px-px-16 py-px-8 rounded-full text-label-medium mb-px-24 badge-accent">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
            Interactive
        </div>
        <h2 class="text-[40px] font-bold text-on-surface leading-tight tracking-tight" style="letter-spacing: -0.025em;">
            See it in <span class="text-gradient-2">action</span>
        </h2>
        <p class="mt-px-16 text-body-large text-on-surface-variant max-w-2xl mx-auto" style="opacity: 0.75;">
            Every component is fully functional right here. No setup required.
        </p>
        <div class="mt-px-24 mx-auto w-24 h-px" style="background: linear-gradient(90deg, transparent, var(--md-sys-color-primary), transparent); opacity: 0.4;"></div>
    `;
    section.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-px-24';

    // Button Demo
    grid.appendChild(createPlaygroundCard(
        'Buttons',
        'All four Material 3 button variants, live and interactive.',
        'buttons',
        () => {
            const container = document.createElement('div');
            container.className = 'flex flex-wrap gap-px-12';
            container.appendChild(new ButtonBuilder().withCaption(of('Filled')).withStyle(of(ButtonStyle.FILLED)).build());
            container.appendChild(new ButtonBuilder().withCaption(of('Outlined')).withStyle(of(ButtonStyle.OUTLINED)).build());
            container.appendChild(new ButtonBuilder().withCaption(of('Tonal')).withStyle(of(ButtonStyle.TONAL)).build());
            container.appendChild(new ButtonBuilder().withCaption(of('Text')).withStyle(of(ButtonStyle.TEXT)).build());
            return container;
        }
    ));

    // TextField Demo
    grid.appendChild(createPlaygroundCard(
        'Text Fields',
        'Reactive inputs with live validation and label animations.',
        'inputs',
        () => {
            const container = document.createElement('div');
            container.className = 'flex flex-col gap-px-16 w-full';
            container.appendChild(
                new TextFieldBuilder()
                    .withPlaceholder(of('Type something...'))
                    .withLabel(of('Reactive Input'))
                    .build()
            );
            return container;
        }
    ));

    // Checkbox Demo
    grid.appendChild(createPlaygroundCard(
        'Checkboxes',
        'State-driven toggles backed by RxJS BehaviorSubjects.',
        'toggles',
        () => {
            const container = document.createElement('div');
            const value$ = new BehaviorSubject<boolean>(true);
            container.className = 'flex flex-col gap-px-12';
            container.appendChild(new CheckboxBuilder().withCaption(of('Feature Alpha')).withValue(value$).build());
            container.appendChild(new CheckboxBuilder().withCaption(of('Feature Beta')).build());
            container.appendChild(new CheckboxBuilder().withCaption(of('Feature Gamma')).build());
            return container;
        }
    ));

    // ComboBox Demo
    grid.appendChild(createPlaygroundCard(
        'ComboBox',
        'Searchable dropdown with observable data streams.',
        'selection',
        () => {
            const container = document.createElement('div');
            container.className = 'w-full';
            const options = of([
                { value: '1', label: 'Option One' },
                { value: '2', label: 'Option Two' },
                { value: '3', label: 'Option Three' },
                { value: '4', label: 'Option Four' },
            ]);
            container.appendChild(
                new ComboBoxBuilder()
                    .withPlaceholder('Select an option...')
                    .withItems(options)
                    .withItemIdProvider((item: any) => item.value)
                    .withItemCaptionProvider((item: any) => item.label)
                    .build()
            );
            return container;
        }
    ));

    section.appendChild(grid);
    return section;
}

function createPlaygroundCard(
    title: string,
    description: string,
    _type: string,
    contentBuilder: () => HTMLElement
): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'rounded-extra-large overflow-hidden border';
    wrapper.style.cssText = 'border-color: rgba(121, 116, 126, 0.12); background: var(--md-sys-color-surface); box-shadow: 0 2px 16px rgba(0,0,0,0.04);';

    // Card header bar
    const cardHeader = document.createElement('div');
    cardHeader.className = 'flex items-center justify-between px-px-24 py-px-16 border-b';
    cardHeader.style.cssText = 'border-color: rgba(121, 116, 126, 0.08); background: var(--md-sys-color-surface-container-low);';
    cardHeader.innerHTML = `
        <div class="flex flex-col gap-px-4">
            <span class="text-title-small font-semibold text-on-surface">${title}</span>
            <span class="text-body-small text-on-surface-variant" style="opacity: 0.65;">${description}</span>
        </div>
        <div class="flex items-center gap-px-8 px-px-12 py-px-4 rounded-full text-label-small badge-accent">
            <span class="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
            Live Preview
        </div>
    `;
    wrapper.appendChild(cardHeader);

    // Card body
    const body = document.createElement('div');
    body.className = 'p-px-24';
    body.appendChild(contentBuilder());
    wrapper.appendChild(body);

    return wrapper;
}
