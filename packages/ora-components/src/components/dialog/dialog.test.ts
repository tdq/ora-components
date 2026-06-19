import { DialogBuilder, DialogSize } from './dialog';
import { BehaviorSubject, of } from 'rxjs';
import '@testing-library/jest-dom';

describe('DialogBuilder', () => {
    beforeAll(() => {
        // Mock HTMLDialogElement methods that JSDOM doesn't support
        HTMLDialogElement.prototype.showModal = jest.fn(function (this: HTMLDialogElement) {
            this.setAttribute('open', '');
        });
        HTMLDialogElement.prototype.close = jest.fn(function (this: HTMLDialogElement) {
            this.removeAttribute('open');
            this.dispatchEvent(new Event('close'));
        });
    });

    it('should create a dialog with caption and description', () => {
        const caption$ = new BehaviorSubject('My Dialog');
        const description$ = new BehaviorSubject('This is a description');
        const dialog = new DialogBuilder()
            .withCaption(caption$)
            .withDescription(description$)
            .build();

        expect(dialog).toBeInstanceOf(HTMLDialogElement);
        const header = dialog.querySelector('.flex-none');
        expect(header).not.toBeNull();
        
        const labels = header?.querySelectorAll('span');
        expect(labels?.length).toBe(2);
        
        expect(labels?.[0].textContent).toBe('My Dialog');
        expect(labels?.[1].textContent).toBe('This is a description');

        caption$.next('New Title');
        expect(dialog.querySelector('.text-headline-small')?.textContent).toBe('New Title');
    });

    it('should apply size classes', () => {
        const dialog = new DialogBuilder()
            .withSize(DialogSize.LARGE)
            .build();

        expect(dialog).toHaveClass('w-[75vw]');
    });

    it('should apply base classes including border radius and white backdrop', () => {
        const dialog = new DialogBuilder().build();
        expect(dialog).toHaveClass('rounded-large');
        expect(dialog).toHaveClass('backdrop:bg-transparent');
    });

    it('should apply constant gap classes to content container', () => {
        const dialog = new DialogBuilder().build();

        const content = dialog.querySelector('.flex-1');
        expect(content).toHaveClass('px-6');
        expect(content).toHaveClass('pb-6');
    });

    it('should handle scrollable content', () => {
        const dialog = new DialogBuilder()
            .asScrollable()
            .build();

        const content = dialog.querySelector('.flex-1');
        expect(content).toHaveClass('overflow-y-auto');
    });

    it('should apply glass classes when asGlass is called', () => {
        const dialog = new DialogBuilder()
            .asGlass()
            .build();

        expect(dialog).toHaveClass('glass-effect');
        expect(dialog).not.toHaveClass('bg-surface');
        expect(dialog).not.toHaveClass('border-none');
    });

    it('should apply height reactively', () => {
        const height$ = new BehaviorSubject(500);
        const dialog = new DialogBuilder()
            .withHeight(height$)
            .build();

        expect(dialog.style.maxHeight).toBe('500px');
        height$.next(600);
        expect(dialog.style.maxHeight).toBe('600px');
    });

    it('should include toolbar when configured', () => {
        const dialogBuilder = new DialogBuilder();
        const toolbar = dialogBuilder.withToolbar();
        toolbar.withPrimaryButton().withCaption(of('OK'));
        
        const dialog = dialogBuilder.build();
        expect(dialog.querySelector('button')?.textContent).toBe('OK');
    });

    it('should apply glass classes to toolbar when asGlass is called', () => {
        const dialogBuilder = new DialogBuilder().asGlass();
        dialogBuilder.withToolbar().withPrimaryButton().withCaption(of('OK'));
        
        const dialog = dialogBuilder.build();
        const toolbarWrapper = dialog.querySelector('.flex-none.px-6.py-4:last-child');
        expect(toolbarWrapper).toHaveClass('bg-white/5');
        expect(toolbarWrapper).toHaveClass('border-t');
        expect(toolbarWrapper).toHaveClass('border-white/10');

        const button = toolbarWrapper?.querySelector('button');
        // Button glass effect adds bg-white/10
        expect(button).toHaveClass('glass-effect');
    });

    it('should apply custom class reactively', () => {
        const class$ = new BehaviorSubject('custom-dialog');
        const dialog = new DialogBuilder()
            .withClass(class$)
            .build();

        expect(dialog).toHaveClass('custom-dialog');
        class$.next('another-dialog');
        expect(dialog).not.toHaveClass('custom-dialog');
        expect(dialog).toHaveClass('another-dialog');
    });

    it('should show and close the dialog', () => {
        const dialogBuilder = new DialogBuilder()
            .withCaption(of('Popup Test'));

        dialogBuilder.show();
        const element = dialogBuilder.build() as HTMLDialogElement;
        expect(document.body.contains(element)).toBe(true);
        expect(element.open).toBe(true);

        dialogBuilder.close();
        expect(document.body.contains(element)).toBe(false);
        expect(element.open).toBe(false);
    });

    it('should be centered (no inline positioning styles) on reopen after drag', () => {
        const dialogBuilder = new DialogBuilder().withCaption(of('Centered Test'));
        dialogBuilder.show();

        // Simulate drag positioning
        const elementBeforeClose = dialogBuilder.build() as HTMLDialogElement;
        elementBeforeClose.style.transform = 'none';
        elementBeforeClose.style.margin = '0';
        elementBeforeClose.style.left = '200px';
        elementBeforeClose.style.top = '100px';

        // Close and reopen
        dialogBuilder.close();
        dialogBuilder.show();

        // Get element reference after reopen to avoid stale reference issues
        const element = dialogBuilder.build() as HTMLDialogElement;

        // Inline positioning styles should be cleared so native centering applies
        expect(element.style.transform).toBe('');
        expect(element.style.margin).toBe('');
        expect(element.style.left).toBe('');
        expect(element.style.top).toBe('');
    });

    // ── Tests covering the payables dialog refactor patterns ──

    it('should accept inline ComponentBuilder content', () => {
        const content = document.createElement('div');
        content.textContent = 'Form content';
        content.className = 'form-content';

        const dialog = new DialogBuilder()
            .withCaption(of('Test Dialog'))
            .withContent({ build: () => content })
            .build();

        const contentContainer = dialog.querySelector('.flex-1');
        expect(contentContainer?.contains(content)).toBe(true);
        expect(content.textContent).toBe('Form content');
    });

    it('should support both secondary and primary toolbar buttons with click handlers', () => {
        const secondaryClick = jest.fn();
        const primaryClick = jest.fn();
        const dialogBuilder = new DialogBuilder();

        dialogBuilder.withToolbar().addSecondaryButton()
            .withCaption(of('Cancel'))
            .withClick(secondaryClick);

        dialogBuilder.withToolbar().withPrimaryButton()
            .withCaption(of('Submit'))
            .withClick(primaryClick);

        const dialog = dialogBuilder.build();
        const buttons = dialog.querySelectorAll('button');
        expect(buttons.length).toBe(2);

        const captions = Array.from(buttons).map(b => b.textContent);
        expect(captions).toContain('Cancel');
        expect(captions).toContain('Submit');

        // Click Cancel → secondary handler fires
        const cancelBtn = Array.from(buttons).find(b => b.textContent === 'Cancel')!;
        cancelBtn.click();
        expect(secondaryClick).toHaveBeenCalledTimes(1);
        expect(primaryClick).not.toHaveBeenCalled();

        // Click Submit → primary handler fires
        const submitBtn = Array.from(buttons).find(b => b.textContent === 'Submit')!;
        submitBtn.click();
        expect(primaryClick).toHaveBeenCalledTimes(1);
    });

    it('should show and close dialog with content and toolbar buttons', () => {
        const dialogBuilder = new DialogBuilder()
            .withCaption(of('Payables Dialog'))
            .withContent({ build: () => document.createElement('div') });

        dialogBuilder.withToolbar().addSecondaryButton()
            .withCaption(of('Cancel'))
            .withClick(() => dialogBuilder.close());

        dialogBuilder.withToolbar().withPrimaryButton()
            .withCaption(of('Add Invoice'))
            .withClick(() => dialogBuilder.close());

        dialogBuilder.show();
        const element = dialogBuilder.build() as HTMLDialogElement;
        expect(document.body.contains(element)).toBe(true);
        expect(element.open).toBe(true);

        // Verify both buttons are in the DOM
        const buttons = element.querySelectorAll('button');
        expect(buttons.length).toBe(2);

        // Close via close() method
        dialogBuilder.close();
        expect(document.body.contains(element)).toBe(false);
        expect(element.open).toBe(false);
    });

    it('should support show/close/show cycle with inline content', () => {
        // Simulates what showNewInvoiceDialog does: fresh builder each time
        const runCycle = () => {
            const db = new DialogBuilder()
                .withCaption(of('Cycle Test'))
                .withContent({ build: () => {
                    const el = document.createElement('input');
                    el.placeholder = 'test';
                    return el;
                }});

            db.withToolbar().withPrimaryButton()
                .withCaption(of('OK'))
                .withClick(() => db.close());

            db.show();
            // Dialog is shown...
            db.close();
        };

        // Cycle twice — second call should work with a fresh builder
        expect(() => {
            runCycle();
            runCycle();
        }).not.toThrow();
    });

    describe('Focus Trapping', () => {
        it('should wrap focus from last to first element on Tab', () => {
            const dialogBuilder = new DialogBuilder()
                .withCaption(of('Focus Test'))
                .withContent({
                    build: () => {
                        const div = document.createElement('div');
                        const input1 = document.createElement('input');
                        input1.id = 'input1';
                        const input2 = document.createElement('input');
                        input2.id = 'input2';
                        div.appendChild(input1);
                        div.appendChild(input2);
                        return div;
                    }
                });

            dialogBuilder.withToolbar().withPrimaryButton().withCaption(of('OK'));

            const dialog = dialogBuilder.build();
            document.body.appendChild(dialog);

            const input1 = dialog.querySelector('#input1') as HTMLInputElement;
            const okButton = dialog.querySelector('button') as HTMLButtonElement;

            // Simulate focus on last element (toolbar is after content)
            okButton.focus();

            // Press Tab on OK button (the last focusable element)
            const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
            okButton.dispatchEvent(tabEvent);

            expect(document.activeElement).toBe(input1);

            document.body.removeChild(dialog);
        });

        it('should skip a disabled primary toolbar button when wrapping focus on Tab', () => {
            // Mirrors a registration/login dialog: the primary "Submit" button is
            // disabled via withEnabled(false) until the form is valid, and is the
            // last focusable element in the dialog.
            const dialogBuilder = new DialogBuilder()
                .withCaption(of('Registration'))
                .withContent({
                    build: () => {
                        const div = document.createElement('div');
                        const input1 = document.createElement('input');
                        input1.id = 'input1';
                        div.appendChild(input1);
                        return div;
                    }
                });

            dialogBuilder.withToolbar().withPrimaryButton()
                .withCaption(of('Register'))
                .withEnabled(new BehaviorSubject(false));

            const dialog = dialogBuilder.build();
            document.body.appendChild(dialog);

            const input1 = dialog.querySelector('#input1') as HTMLInputElement;

            input1.focus();

            const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
            input1.dispatchEvent(tabEvent);

            // The disabled button can never receive focus, so it must not be treated
            // as the wrap target; focus should wrap back to the first element instead.
            expect(document.activeElement).toBe(input1);

            document.body.removeChild(dialog);
        });

        it('should wrap focus from first to last element on Shift+Tab', () => {
            const dialogBuilder = new DialogBuilder()
                .withCaption(of('Focus Test'))
                .withContent({
                    build: () => {
                        const div = document.createElement('div');
                        const input1 = document.createElement('input');
                        input1.id = 'input1';
                        const input2 = document.createElement('input');
                        input2.id = 'input2';
                        div.appendChild(input1);
                        div.appendChild(input2);
                        return div;
                    }
                });

            dialogBuilder.withToolbar().withPrimaryButton().withCaption(of('OK'));

            const dialog = dialogBuilder.build();
            document.body.appendChild(dialog);

            const input1 = dialog.querySelector('#input1') as HTMLInputElement;
            const okButton = dialog.querySelector('button') as HTMLButtonElement;

            input1.focus();

            // Press Shift+Tab on first element
            const shiftTabEvent = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true });
            input1.dispatchEvent(shiftTabEvent);

            expect(document.activeElement).toBe(okButton);

            document.body.removeChild(dialog);
        });

        it('should wrap focus correctly even when focus is on a child with tabindex="-1"', () => {
            const dialogBuilder = new DialogBuilder()
                .withCaption(of('Child Focus Test'))
                .withContent({
                    build: () => {
                        const div = document.createElement('div');
                        const input1 = document.createElement('input');
                        input1.id = 'input1';
                        
                        // Last focusable element is a div with focusable children
                        const lastWrapper = document.createElement('div');
                        lastWrapper.tabIndex = 0;
                        lastWrapper.id = 'last-wrapper';
                        
                        const child = document.createElement('button');
                        child.tabIndex = -1;
                        child.textContent = 'Child Button';
                        lastWrapper.appendChild(child);
                        
                        div.appendChild(input1);
                        div.appendChild(lastWrapper);
                        return div;
                    }
                });

            const dialog = dialogBuilder.build();
            document.body.appendChild(dialog);

            const input1 = dialog.querySelector('#input1') as HTMLInputElement;
            const lastWrapper = dialog.querySelector('#last-wrapper') as HTMLElement;
            const childButton = dialog.querySelector('button') as HTMLButtonElement;

            // 1. Focus on child button (which has tabindex="-1")
            childButton.focus();
            expect(document.activeElement).toBe(childButton);

            // 2. Press Tab. Since childButton is inside the last focusable element (lastWrapper), it should wrap.
            const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
            childButton.dispatchEvent(tabEvent);

            expect(document.activeElement).toBe(input1);

            document.body.removeChild(dialog);
        });

        it('should wrap focus from a tabindex="-1" element that is positioned AFTER the last normally focusable element', () => {
            const dialogBuilder = new DialogBuilder()
                .withCaption(of('Tabindex -1 After Test'))
                .withContent({
                    build: () => {
                        const div = document.createElement('div');
                        const input1 = document.createElement('input');
                        input1.id = 'input1';
                        
                        const lastNormallyFocusable = document.createElement('button');
                        lastNormallyFocusable.id = 'last-normal';
                        
                        const tabMinusOne = document.createElement('div');
                        tabMinusOne.id = 'tab-minus-one';
                        tabMinusOne.tabIndex = -1;
                        
                        div.appendChild(input1);
                        div.appendChild(lastNormallyFocusable);
                        div.appendChild(tabMinusOne);
                        return div;
                    }
                });

            const dialog = dialogBuilder.build();
            document.body.appendChild(dialog);

            const input1 = dialog.querySelector('#input1') as HTMLElement;
            const tabMinusOne = dialog.querySelector('#tab-minus-one') as HTMLElement;

            // Focus the tabindex="-1" element that is AFTER the last normally focusable element
            tabMinusOne.focus();
            expect(document.activeElement).toBe(tabMinusOne);

            // Press Tab. It should wrap to the first focusable element.
            const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true });
            tabMinusOne.dispatchEvent(tabEvent);

            expect(document.activeElement).toBe(input1);

            document.body.removeChild(dialog);
        });
    });
});
