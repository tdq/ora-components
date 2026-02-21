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

    it('should apply base classes including border radius', () => {
        const dialog = new DialogBuilder().build();
        expect(dialog).toHaveClass('rounded-large');
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
});
