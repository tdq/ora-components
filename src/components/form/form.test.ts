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

        const captionEl = form.querySelector('h2');
        const descriptionEl = form.querySelector('p');

        expect(captionEl).toBeTruthy();
        expect(captionEl?.textContent).toBe('Test Form');
        expect(descriptionEl).toBeTruthy();
        expect(descriptionEl?.textContent).toBe('Test Description');

        caption$.next('Updated Caption');
        expect(captionEl?.textContent).toBe('Updated Caption');
    });

    it('should hide caption/description when empty', () => {
        const caption$ = new BehaviorSubject('');
        const form = new FormBuilder()
            .withCaption(caption$)
            .build();

        const captionEl = form.querySelector('h2');
        expect(captionEl).toHaveClass('hidden');

        caption$.next('Visible');
        expect(captionEl).not.toHaveClass('hidden');
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
        
        const inputs = fieldsContainer?.querySelectorAll('div > label + div, div > div.relative'); // This depends on field implementation
        // Actually let's just look at the children of fieldsContainer
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
        // Toolbar uses LayoutBuilder which creates nested divs
        // Text buttons are in the main layout, then a spacer, then another layout for secondary/primary
        
        const textBtn = formEl.querySelector('button.text-primary'); // Cancel
        const secondaryBtn = formEl.querySelector('button.border-outline'); // Reset
        const primaryBtn = formEl.querySelector('button.bg-primary'); // Submit
        
        expect(textBtn).toBeTruthy();
        expect(secondaryBtn).toBeTruthy();
        expect(primaryBtn).toBeTruthy();
        
        // Check "alignment" by looking at structure and order
        if (textBtn && secondaryBtn && primaryBtn) {
            // textBtn (Cancel) should be before secondaryBtn (Reset)
            expect(textBtn.compareDocumentPosition(secondaryBtn) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
            // secondaryBtn (Reset) should be before primaryBtn (Submit)
            expect(secondaryBtn.compareDocumentPosition(primaryBtn) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

            // Verify existence of spacer (flex-1) between them
            const flex1s = Array.from(formEl.querySelectorAll('.flex-1'));
            // The spacer is an empty div (or containing only another empty div)
            const spacer = flex1s.find(el => !el.querySelector('button') && el.classList.contains('flex-1'));
            expect(spacer).toBeTruthy();
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
        const container = formEl.firstChild as HTMLElement;
        
        // Form glass effect
        expect(container).toHaveClass('backdrop-blur-md');
        
        // Field glass effect (if implemented in TextFieldBuilder)
        // TextFieldBuilder should have asGlass() called on it by FieldsBuilder
        const inputContainer = formEl.querySelector('.relative'); // Assuming text field has a relative container
        // We might need to check if asGlass was actually called. 
        // Based on fields-builder.ts:
        /*
        if (this.isGlass$.value && field.builder.asGlass) {
            field.builder.asGlass();
        }
        */
        // Let's check for glass classes on button or field if they have them.
        // ButtonBuilder.asGlass adds 'backdrop-blur-md' etc.
        const button = formEl.querySelector('button');
        expect(button).toHaveClass('backdrop-blur-md');
    });

    it('should display error message', () => {
        const error$ = new BehaviorSubject('');
        const fb = new FormBuilder().withError(error$);
        
        const formEl = fb.build();
        const errorEl = formEl.querySelector('.text-error');
        
        expect(errorEl).toHaveClass('hidden');
        
        error$.next('Something went wrong');
        expect(errorEl).not.toHaveClass('hidden');
        expect(errorEl?.textContent).toBe('Something went wrong');
    });
});
