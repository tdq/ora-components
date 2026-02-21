import { DialogBuilder, DialogSize } from '../components/dialog';
import { of, Subject } from 'rxjs';
import { ButtonBuilder } from '../components/button';

export default {
    title: 'Components/Dialog',
};

export const Basic = () => {
    const container = document.createElement('div');
    container.className = 'p-4 flex flex-col gap-4';

    const createDialog = (size: DialogSize = DialogSize.MEDIUM) => {
        const dialog = new DialogBuilder()
            .withCaption(of(`Dialog ${size}`))
            .withDescription(of('This is a demonstration of the Dialog component.'))
            .withSize(size)
            .withContent({
                build: () => {
                    const div = document.createElement('div');
                    div.className = 'flex flex-col gap-2';
                    div.innerHTML = `
                        <p class="text-body-medium">You can drag this dialog by its header.</p>
                        <p class="text-body-medium text-on-surface-variant">The dialog follows Material Design 3 guidelines.</p>
                    `;
                    return div;
                }
            });

        const close$ = new Subject<void>();
        close$.subscribe(() => dialog.close());

        const toolbar = dialog.withToolbar();
        toolbar.withPrimaryButton()
            .withCaption(of('Confirm'))
            .withClick(close$);
        
        toolbar.addSecondaryButton()
            .withCaption(of('Cancel'))
            .withClick(close$);

        return dialog;
    };

    const sizes = Object.values(DialogSize);
    sizes.forEach(size => {
        const btnClick$ = new Subject<void>();
        btnClick$.subscribe(() => createDialog(size).show());

        const btn = new ButtonBuilder()
            .withCaption(of(`Open ${size} Dialog`))
            .withClick(btnClick$)
            .build();
        container.appendChild(btn);
    });

    return container;
};

export const Scrollable = () => {
    const showDialog = () => {
        const dialog = new DialogBuilder()
            .withCaption(of('Scrollable Content'))
            .withDescription(of('This dialog demonstrates scrollable content.'))
            .asScrollable()
            .withHeight(of(400))
            .withContent({
                build: () => {
                    const div = document.createElement('div');
                    div.className = 'flex flex-col gap-4 p-2';
                    for (let i = 1; i <= 20; i++) {
                        const p = document.createElement('p');
                        p.textContent = `Content line ${i}: Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.`;
                        p.className = 'text-body-medium';
                        div.appendChild(p);
                    }
                    return div;
                }
            });

        const close$ = new Subject<void>();
        close$.subscribe(() => dialog.close());

        dialog.withToolbar()
            .withPrimaryButton()
            .withCaption(of('Got it'))
            .withClick(close$);

        dialog.show();
    };

    const container = document.createElement('div');
    container.className = 'p-4';

    const btnClick$ = new Subject<void>();
    btnClick$.subscribe(showDialog);

    const btn = new ButtonBuilder()
        .withCaption(of('Open Scrollable Dialog'))
        .withClick(btnClick$)
        .build();
    
    container.appendChild(btn);
    return container;
};

