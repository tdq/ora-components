import { FormBuilder } from './form-builder';
import { BehaviorSubject, Observable, Subject, of } from 'rxjs';
import { LabelBuilder } from '../label';
import { FormFieldBuilder } from './types';
import '@testing-library/jest-dom';

describe('FormBuilder', () => {
    it('should render custom builder content between fields in DOM order', () => {
        const fb = new FormBuilder();
        const fields = fb.withFields(1);
        fields.addTextField();
        fields.addCustom(new LabelBuilder().withCaption(of('Custom content')), 1, 1);
        fields.addTextField();

        const formEl = fb.build();
        const fieldEls = Array.from(formEl.querySelector('.grid')!.children) as HTMLElement[];

        expect(fieldEls.length).toBe(3);
        expect(fieldEls[0].querySelector('input')).toBeTruthy();
        expect(fieldEls[1].textContent).toBe('Custom content');
        expect(fieldEls[1].querySelector('input')).toBeNull();
        expect(fieldEls[1]).toHaveStyle('grid-column: 1 / span 1');
        expect(fieldEls[2].querySelector('input')).toBeTruthy();
    });

    it('should not throw when custom builder lacks withEnabled/asGlass', () => {
        const fb = new FormBuilder();
        const fields = fb.withFields(1).withEnabled(of(false)).asGlass();
        const plain = { build: () => document.createElement('hr') };
        fields.addCustom(plain);

        expect(() => fb.build()).not.toThrow();
        expect(fb.build().querySelector('hr')).toBeTruthy();
    });

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

        expect(fieldEls?.[0]).toHaveStyle('grid-column: 1 / span 2');
        expect(fieldEls?.[1]).toHaveStyle('grid-column: 3 / span 1');
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

    it('should propagate asGlass state to fields and toolbar, not the form root', () => {
        const fb = new FormBuilder().asGlass();

        const fields = fb.withFields();
        fields.addTextField().withLabel(new BehaviorSubject('Field'));

        const toolbar = fb.withToolbar();
        toolbar.withPrimaryButton().withCaption(new BehaviorSubject('Submit'));

        const formEl = fb.build();

        // Form itself is not affected by glass effect (.agent/components/form.md)
        expect(formEl).not.toHaveClass('glass-effect');

        const field = formEl.querySelector('.grid')?.firstElementChild;
        expect(field?.querySelector('.glass-effect')).toBeTruthy();

        const button = formEl.querySelector('button');
        expect(button).toHaveClass('glass-effect');
    });

    it('should not apply glass-effect to fields when form is not glass', () => {
        const fb = new FormBuilder();

        const fields = fb.withFields();
        fields.addTextField().withLabel(new BehaviorSubject('Field'));

        const formEl = fb.build();
        const field = formEl.querySelector('.grid')?.firstElementChild;

        expect(field?.querySelector('.glass-effect')).toBeFalsy();
        expect(field).not.toHaveClass('glass-effect');
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

    it('should support addMoneyField in FormBuilder', () => {
        const fb = new FormBuilder();
        const fields = fb.withFields();
        fields.addMoneyField().withLabel(new BehaviorSubject('Amount'));

        const formEl = fb.build();
        const input = formEl.querySelector('input');

        expect(input).toBeTruthy();
        expect(input?.inputMode).toBe('decimal');

        const label = formEl.querySelector('label');
        expect(label?.textContent).toBe('Amount');
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

describe('FieldsBuilder.addCustom', () => {
    /** Minimal custom builder that records the propagation calls it receives. */
    class ProbeBuilder implements FormFieldBuilder {
        readonly el: HTMLElement;
        receivedEnabled?: Observable<boolean>;
        glassCalls: Array<boolean | undefined> = [];
        private sub?: { unsubscribe(): void };

        constructor(private readonly name: string) {
            this.el = document.createElement('div');
            this.el.dataset.probe = name;
        }

        withEnabled(enabled: Observable<boolean>): this {
            this.receivedEnabled = enabled;
            return this;
        }

        asGlass(isGlass?: boolean): this {
            this.glassCalls.push(isGlass);
            return this;
        }

        build(): HTMLElement {
            this.el.textContent = this.name;
            this.sub = this.receivedEnabled?.subscribe(value => {
                this.el.dataset.enabled = String(value);
            });
            return this.el;
        }

        destroy(): void {
            this.sub?.unsubscribe();
            this.sub = undefined;
        }
    }

    const probes: ProbeBuilder[] = [];
    const streams: Subject<any>[] = [];
    const mounted: HTMLElement[] = [];

    const probe = (name: string): ProbeBuilder => {
        const p = new ProbeBuilder(name);
        probes.push(p);
        return p;
    };

    afterEach(() => {
        probes.splice(0).forEach(p => p.destroy());
        streams.splice(0).forEach(s => s.complete());
        mounted.splice(0).forEach(el => el.remove());
    });

    const gridOf = (formEl: HTMLElement) => formEl.querySelector('.grid') as HTMLElement;

    it('places a custom field with column only using grid-column-start', () => {
        const fb = new FormBuilder();
        fb.withFields(3).addCustom(probe('col-only'), 2);

        const el = gridOf(fb.build()).firstElementChild as HTMLElement;

        expect(el.dataset.probe).toBe('col-only');
        expect(el.style.gridColumnStart).toBe('2');
        expect(el.style.gridColumnEnd).toBe('');
    });

    it('places a custom field with colspan only using span', () => {
        const fb = new FormBuilder();
        fb.withFields(3).addCustom(probe('span-only'), undefined, 2);

        const el = gridOf(fb.build()).firstElementChild as HTMLElement;

        expect(el).toHaveStyle('grid-column: span 2');
        expect(el.style.gridColumn).toBe('span 2');
    });

    it('places a custom field with both column and colspan as "<col> / span <n>"', () => {
        const fb = new FormBuilder();
        fb.withFields(4).addCustom(probe('both'), 2, 3);

        const el = gridOf(fb.build()).firstElementChild as HTMLElement;

        expect(el).toHaveStyle('grid-column: 2 / span 3');
    });

    it('leaves grid placement untouched when neither column nor colspan is given', () => {
        const fb = new FormBuilder();
        fb.withFields(2).addCustom(probe('bare'));

        const el = gridOf(fb.build()).firstElementChild as HTMLElement;

        expect(el.style.gridColumn).toBe('');
        expect(el.style.gridColumnStart).toBe('');
        expect(el.style.gridColumnEnd).toBe('');
    });

    it('returns the same builder instance it was given', () => {
        const custom = probe('identity');
        const returned = new FormBuilder().withFields(1).addCustom(custom);

        expect(returned).toBe(custom);
    });

    it('keeps insertion order across multiple addCustom entries and regular fields', () => {
        const fb = new FormBuilder();
        const fields = fb.withFields(1);
        fields.addCustom(probe('first'));
        fields.addTextField();
        fields.addCustom(probe('second'));
        fields.addCustom(probe('third'));

        const children = Array.from(gridOf(fb.build()).children) as HTMLElement[];

        expect(children.length).toBe(4);
        expect(children.map(c => c.dataset.probe ?? 'field')).toEqual([
            'first', 'field', 'second', 'third'
        ]);
        expect(children[1].querySelector('input')).toBeTruthy();
    });

    it('passes the form enabled stream to a custom builder that exposes withEnabled', () => {
        const enabled$ = new BehaviorSubject(true);
        streams.push(enabled$);

        const custom = probe('enabled');
        const fb = new FormBuilder().withEnabled(enabled$);
        fb.withFields(1).addCustom(custom);

        const formEl = fb.build();
        document.body.appendChild(formEl);
        mounted.push(formEl);

        // same stream instance, not a copy
        expect(custom.receivedEnabled).toBe(enabled$);
        expect(custom.el.dataset.enabled).toBe('true');

        // live update while connected
        enabled$.next(false);
        expect(custom.el.dataset.enabled).toBe('false');

        // disconnect: builder tears its own subscription down, later emissions are inert
        custom.destroy();
        formEl.remove();
        enabled$.next(true);
        expect(custom.el.dataset.enabled).toBe('false');
    });

    it('does not call withEnabled on a custom builder when the form has no enabled stream', () => {
        const custom = probe('no-enabled');
        const fb = new FormBuilder();
        fb.withFields(1).addCustom(custom);

        fb.build();

        expect(custom.receivedEnabled).toBeUndefined();
        expect(custom.el.dataset.enabled).toBeUndefined();
    });

    it('calls asGlass with no argument on a custom builder only when the form is glass', () => {
        const glassCustom = probe('glass');
        const glassForm = new FormBuilder().asGlass();
        glassForm.withFields(1).addCustom(glassCustom);
        glassForm.build();

        expect(glassCustom.glassCalls).toEqual([undefined]);

        const plainCustom = probe('plain');
        const plainForm = new FormBuilder();
        plainForm.withFields(1).addCustom(plainCustom);
        plainForm.build();

        expect(plainCustom.glassCalls).toEqual([]);
    });

    it('survives a custom builder that exposes neither withEnabled nor asGlass', () => {
        const enabled$ = new Subject<boolean>();
        streams.push(enabled$);

        const bare: FormFieldBuilder = { build: () => document.createElement('hr') };
        const fb = new FormBuilder().withEnabled(enabled$).asGlass();
        fb.withFields(1).addCustom(bare);

        const formEl = fb.build();
        document.body.appendChild(formEl);
        mounted.push(formEl);

        expect(gridOf(formEl).querySelector('hr')).toBeTruthy();
        expect(() => enabled$.next(false)).not.toThrow();
    });

    it('renders a live custom builder through connect -> update -> disconnect', () => {
        const caption$ = new Subject<string>();
        streams.push(caption$);

        const fb = new FormBuilder();
        fb.withFields(1).addCustom(new LabelBuilder().withCaption(caption$), 1, 1);

        const formEl = fb.build();
        document.body.appendChild(formEl);
        mounted.push(formEl);

        const el = gridOf(formEl).firstElementChild as HTMLElement;
        expect(el).toHaveStyle('grid-column: 1 / span 1');

        caption$.next('live');
        expect(el.textContent).toBe('live');

        caption$.next('updated');
        expect(el.textContent).toBe('updated');

        formEl.remove();
        expect(() => caption$.next('after removal')).not.toThrow();
    });
});
