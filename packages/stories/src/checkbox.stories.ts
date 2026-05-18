import { CheckboxBuilder } from '@tdq/ora-components';
import { BehaviorSubject, combineLatest, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { LayoutBuilder, LayoutGap } from '@tdq/ora-components';

export default {
    title: 'Components/Checkbox',
    tags: ['stable', 'glass', 'reactive'],
};

export const Basic = () => {
    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.MEDIUM);

    layout.addSlot().withContent(
        new CheckboxBuilder()
            .withCaption(of('Default Checkbox'))
    );

    layout.addSlot().withContent(
        new CheckboxBuilder()
            .withCaption(of('Checked Checkbox'))
            .withValue(new BehaviorSubject(true))
    );

    layout.addSlot().withContent(
        new CheckboxBuilder()
            .withCaption(of('Disabled Checkbox'))
            .withEnabled(of(false))
    );

    layout.addSlot().withContent(
        new CheckboxBuilder()
            .withCaption(of('Disabled Checked Checkbox'))
            .withEnabled(of(false))
            .withValue(new BehaviorSubject(true))
    );

    const container = layout.build();
    container.classList.add('p-4');

    return container;
};

export const Interactive = () => {
    const value$ = new BehaviorSubject(false);
    const caption$ = new BehaviorSubject('Unchecked');

    value$.subscribe(val => {
        caption$.next(val ? 'Checked' : 'Unchecked');
    });

    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.MEDIUM);

    layout.addSlot().withContent(
        new CheckboxBuilder()
            .withCaption(caption$)
            .withValue(value$)
    );

    const container = layout.build();
    container.classList.add('p-4');

    return container;
};

export const Indeterminate = () => {
    // 5 child checkboxes with individual state subjects
    const childValues = Array.from({ length: 5 }, () => new BehaviorSubject(false));
    const childLabels = ['Option A', 'Option B', 'Option C', 'Option D', 'Option E'];

    // Derive checked count from children
    const checkedCount$ = combineLatest(childValues).pipe(
        map(values => values.filter(v => v).length)
    );

    // Derive parent state: unchecked, indeterminate, or checked
    const parentState$ = checkedCount$.pipe(
        map(count => {
            if (count === 0) return 'unchecked' as const;
            if (count < 5) return 'indeterminate' as const;
            return 'checked' as const;
        })
    );

    // Parent checked value (boolean only for the checkbox input)
    const parentChecked$ = parentState$.pipe(
        map(state => state === 'checked')
    );

    // Caption showing live count
    const parentCaption$ = checkedCount$.pipe(
        map(count => count === 5 ? 'Select All (5/5)' : `Select All (${count}/5)`)
    );

    // The parent checkbox value subject
    const parentValue$ = new BehaviorSubject<boolean>(false);

    // Guard flag to prevent circular updates:
    // when children change parentValue$, we don't want to re-toggle children
    let updatingFromParent = false;

    // When children change, update parent checked state
    parentChecked$.subscribe(checked => {
        if (parentValue$.value !== checked) {
            updatingFromParent = true;
            parentValue$.next(checked);
            updatingFromParent = false;
        }
    });

    // When user clicks the parent checkbox, toggle all children
    parentValue$.subscribe(checked => {
        if (!updatingFromParent) {
            childValues.forEach(child => child.next(checked));
        }
    });

    // Build the parent checkbox
    const parentBuilder = new CheckboxBuilder()
        .withCaption(parentCaption$)
        .withValue(parentValue$);
    const parentEl = parentBuilder.build();

    // Add indeterminate visual support: find the icon container and input
    const iconContainer = parentEl.querySelector('.peer-checked\\:scale-100') as HTMLElement
        || parentEl.querySelector('[class*="scale-0"]') as HTMLElement;
    const hiddenInput = parentEl.querySelector('input[type="checkbox"]') as HTMLInputElement;

    // Save the original checkmark icon HTML so we can restore it
    const originalIconHtml = iconContainer ? iconContainer.innerHTML : '';

    // Minus icon SVG for indeterminate state
    const MINUS_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>';

    // Watch parent state to toggle indeterminate visual
    parentState$.subscribe(state => {
        if (hiddenInput) {
            hiddenInput.indeterminate = state === 'indeterminate';
        }
        if (iconContainer) {
            if (state === 'indeterminate') {
                iconContainer.innerHTML = MINUS_ICON;
                iconContainer.style.transform = 'scale(1)';
            } else {
                // Restore the checkmark icon, CSS peer-checked:scale-100 handles visibility
                iconContainer.innerHTML = originalIconHtml;
                if (state === 'unchecked') {
                    iconContainer.style.transform = 'scale(0)';
                } else {
                    iconContainer.style.transform = '';
                }
            }
        }
    });

    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.MEDIUM);

    layout.addSlot().withContent({ build: () => parentEl });

    // Add separator
    const separator = document.createElement('hr');
    separator.className = 'border-outline/20 my-1';
    layout.addSlot().withContent({ build: () => separator });

    // Add child checkboxes
    childValues.forEach((value$, i) => {
        layout.addSlot().withContent(
            new CheckboxBuilder()
                .withCaption(of(childLabels[i]))
                .withValue(value$)
        );
    });

    const container = layout.build();
    container.classList.add('p-4');

    return container;
};

export const Glass = () => {
    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.MEDIUM);

    const glassCheckbox = new CheckboxBuilder()
        .withCaption(of('Glass Checkbox'))
        .asGlass();

    layout.addSlot().withContent(glassCheckbox);

    const container = layout.build();
    container.classList.add('flex-1', 'p-8', 'bg-gradient-to-br', 'from-indigo-500', 'via-purple-500', 'to-pink-500');

    return container;
};
