import { FormBuilder } from './form-builder';
import { BehaviorSubject } from 'rxjs';
import '@testing-library/jest-dom';

describe('FormBuilder', () => {
    it('should render form with header (caption and description)', () => {
        const caption$ = new BehaviorSubject('Test Form');
        const description$ = new BehaviorSubject('Test Description');
        
        const form = new FormBuilder()
            .withCaption(caption$)
            .withDescription(description$)
            .build();

        // LabelBuilder creates spans
        const labels = form.querySelectorAll('span');
        const captionEl = Array.from(labels).find(el => el.textContent === 'Test Form');
        const descriptionEl = Array.from(labels).find(el => el.textContent === 'Test Description');

        expect(captionEl).toBeTruthy();
        expect(descriptionEl).toBeTruthy();

        caption$.next('Updated Caption');
        expect(captionEl?.textContent).toBe('Updated Caption');
    });

    it('should hide caption/description when empty', () => {
        const caption$ = new BehaviorSubject('');
        const form = new FormBuilder()
            .withCaption(caption$)
            .build();

        const label = form.querySelector('span');
        // The slot wrapper should be hidden
        const slot = label?.parentElement;
        expect(slot?.style.display).toBe('none');

        caption$.next('Visible');
        expect(slot?.style.display).toBe('');
    });

    it('should render field grid layout with columns and colspans', () => {
        const fb = new FormBuilder();
        const fields = fb.withFields(3);
        fields.addTextField(1, 2);
        fields.addNumberField(3, 1);
        
        const formEl = fb.build();
        const fieldsContainer = formEl.querySelector('.grid');
        
        expect(fieldsContainer).toBeTruthy();
        expect(fieldsContainer).toHaveStyle('grid-template-columns: repeat(3, 1fr)');
        
        const fieldEls = fieldsContainer?.children;
        expect(fieldEls?.length).toBe(2);
        
        expect(fieldEls?.[0]).toHaveStyle('grid-column: span 2');
        expect(fieldEls?.[0]).toHaveStyle('grid-column-start: 1');
        expect(fieldEls?.[1]).toHaveStyle('grid-column: span 1');
        expect(fieldEls?.[1]).toHaveStyle('grid-column-start: 3');
    });

    it('should render toolbar with correct alignment', () => {
        const fb = new FormBuilder();
        const toolbar = fb.withToolbar();
        toolbar.addTextButton().withCaption(new BehaviorSubject('Cancel'));
        toolbar.addSecondaryButton().withCaption(new BehaviorSubject('Reset'));
        toolbar.withPrimaryButton().withCaption(new BehaviorSubject('Submit'));
        
        const formEl = fb.build();
        const buttons = formEl.querySelectorAll('button');
        const textBtn = Array.from(buttons).find(b => b.textContent === 'Cancel');
        const secondaryBtn = Array.from(buttons).find(b => b.textContent === 'Reset');
        const primaryBtn = Array.from(buttons).find(b => b.textContent === 'Submit');
        
        expect(textBtn).toBeTruthy();
        expect(secondaryBtn).toBeTruthy();
        expect(primaryBtn).toBeTruthy();
        
        if (textBtn && secondaryBtn && primaryBtn) {
            // Check order
            expect(textBtn.compareDocumentPosition(secondaryBtn) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
            expect(secondaryBtn.compareDocumentPosition(primaryBtn) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

            // The buttons on the right are inside a nested layout which has alignment RIGHT.
            // Its slots should have justify-end.
            const rightAlignedSlot = secondaryBtn.parentElement;
            expect(rightAlignedSlot).toHaveClass('justify-end');
        }
    });

    it('should propagate enabled state to fields and buttons', () => {
        const enabled$ = new BehaviorSubject(true);
        const fb = new FormBuilder().withEnabled(enabled$);
        
        const fields = fb.withFields();
        fields.addTextField().withLabel(new BehaviorSubject('Field'));
        
        const toolbar = fb.withToolbar();
        toolbar.withPrimaryButton().withCaption(new BehaviorSubject('Submit'));
        
        const formEl = fb.build();
        const input = formEl.querySelector('input');
        const button = formEl.querySelector('button');
        
        expect(input?.disabled).toBe(false);
        expect(button?.disabled).toBe(false);
        
        enabled$.next(false);
        expect(input?.disabled).toBe(true);
        expect(button?.disabled).toBe(true);
    });

    it('should propagate asGlass state to form, fields and buttons', () => {
        const fb = new FormBuilder().asGlass();
        
        const fields = fb.withFields();
        fields.addTextField().withLabel(new BehaviorSubject('Field'));
        
        const toolbar = fb.withToolbar();
        toolbar.withPrimaryButton().withCaption(new BehaviorSubject('Submit'));
        
        const formEl = fb.build();
        
        // Form glass effect should be on the root element
        expect(formEl).toHaveClass('glass-effect');
        
        const button = formEl.querySelector('button');
        expect(button).toHaveClass('glass-effect');
    });

    it('should display error message', () => {
        const errorMsg$ = new BehaviorSubject('');
        const fb = new FormBuilder().withError(errorMsg$);
        
        const formEl = fb.build();
        
        // Error label should be hidden initially
        // Find slot containing a span that is hidden
        const spans = formEl.querySelectorAll('span');
        const hiddenSlot = Array.from(spans).map(s => s.parentElement).find(p => p?.style.display === 'none');
        expect(hiddenSlot).toBeTruthy();
        
        errorMsg$.next('Something went wrong');
        const visibleError = Array.from(formEl.querySelectorAll('span')).find(s => s.textContent === 'Something went wrong');
        expect(visibleError).toBeTruthy();
        expect(visibleError?.parentElement?.style.display).toBe('');
    });

    it('should support addPasswordField and addEmailField', () => {
        const fb = new FormBuilder();
        const fields = fb.withFields();
        fields.addPasswordField();
        fields.addEmailField();
        
        const formEl = fb.build();
        const inputs = formEl.querySelectorAll('input');
        
        expect(inputs[0].type).toBe('password');
        expect(inputs[1].type).toBe('email');
    });

    it('should support email validation in form field', () => {
        const fb = new FormBuilder();
        const fields = fb.withFields();
        const value$ = new BehaviorSubject('');
        fields.addEmailField().withValue(value$);
        
        const formEl = fb.build();
        const input = formEl.querySelector('input') as HTMLInputElement;
        const errorSpan = formEl.querySelector('[aria-live="polite"]') as HTMLElement;
        
        input.value = 'invalid';
        input.dispatchEvent(new Event('input'));
        expect(errorSpan.textContent).toBe('Invalid email address');
        
        input.value = 'valid@example.com';
        input.dispatchEvent(new Event('input'));
        expect(errorSpan.textContent).toBe('');
    });
});
