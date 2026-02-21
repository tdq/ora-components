import { TextFieldBuilder, TextFieldStyle } from '../components/text-field';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { map } from 'rxjs/operators';
import { LayoutBuilder, LayoutGap } from '../components/layout';
import { LabelBuilder, LabelSize } from '../components/label';
import { ButtonBuilder, ButtonStyle } from '../components/button';
import { Validators } from '../utils/validators';

export default {
    title: 'Components/TextField',
};

export const Styles = () => {
    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.EXTRA_LARGE);

    layout.addSlot().withContent(
        new LabelBuilder()
            .withCaption(of('Filled Style'))
            .withSize(LabelSize.MEDIUM)
    );

    layout.addSlot().withContent(
        new TextFieldBuilder()
            .withPlaceholder(new BehaviorSubject('Type something...'))
            .withStyle(new BehaviorSubject(TextFieldStyle.TONAL))
    );

    layout.addSlot().withContent(
        new LabelBuilder()
            .withCaption(of('Outlined Style'))
            .withSize(LabelSize.MEDIUM)
    );

    layout.addSlot().withContent(
        new TextFieldBuilder()
            .withPlaceholder(new BehaviorSubject('Type something...'))
            .withStyle(new BehaviorSubject(TextFieldStyle.OUTLINED))
    );

    const container = layout.build();
    container.classList.add('p-4', 'max-w-md');

    return container;
};

export const Interactive = () => {
    const value$ = new BehaviorSubject('Hello RxJS');
    const resetClick$ = new Subject<void>();

    resetClick$.subscribe(() => value$.next('Hello RxJS'));

    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.LARGE);

    layout.addSlot().withContent(
        new TextFieldBuilder()
            .withPlaceholder(new BehaviorSubject('Placeholder...'))
            .withValue(value$)
    );

    layout.addSlot().withContent(
        new LabelBuilder()
            .withCaption(value$.pipe(map(val => `Current Value: ${val}`)))
            .withSize(LabelSize.MEDIUM)
    );

    layout.addSlot().withContent(
        new ButtonBuilder()
            .withCaption(of('Reset to Default'))
            .withStyle(of(ButtonStyle.TONAL))
            .withClick(resetClick$)
    );

    const container = layout.build();
    container.classList.add('p-4', 'max-w-md');

    return container;
};

export const States = () => {
    const enabled$ = new BehaviorSubject(true);

    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.LARGE);

    layout.addSlot().withContent(
        new TextFieldBuilder()
            .withPlaceholder(new BehaviorSubject('Disabled when unchecked...'))
            .withEnabled(enabled$)
    );

    // Exception for checkbox as per request
    const controls = document.createElement('label');
    controls.className = 'flex items-center gap-2 cursor-pointer';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = true;
    checkbox.onchange = (e) => enabled$.next((e.target as HTMLInputElement).checked);

    const labelText = new LabelBuilder()
        .withCaption(of('Enabled'))
        .withSize(LabelSize.MEDIUM)
        .build();

    controls.appendChild(checkbox);
    controls.appendChild(labelText);

    layout.addSlot().withContent({
        build: () => controls
    });

    const container = layout.build();
    container.classList.add('p-4', 'max-w-md');

    return container;
};

export const LabelsAndErrors = () => {
    const value$ = new BehaviorSubject('');
    const error$ = value$.pipe(
        map(val => val.length > 5 ? 'Too long! Max 5 characters.' : '')
    );

    const emailValue$ = new BehaviorSubject('');
    const emailError$ = emailValue$.pipe(
        map(val => val.trim() === '' ? 'Required field' : '')
    );

    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.EXTRA_LARGE);

    layout.addSlot().withContent(
        new TextFieldBuilder()
            .withLabel(of('Username'))
            .withPlaceholder(of('Enter your username...'))
            .withValue(value$)
            .withError(error$)
            .withStyle(of(TextFieldStyle.TONAL))
    );

    layout.addSlot().withContent(
        new TextFieldBuilder()
            .withLabel(of('Email (Outlined)'))
            .withPlaceholder(of('example@domain.com'))
            .withValue(emailValue$)
            .withError(emailError$)
            .withStyle(of(TextFieldStyle.OUTLINED))
    );

    const container = layout.build();
    container.classList.add('p-4', 'max-w-md');

    return container;
};

export const Glass = () => {
    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.EXTRA_LARGE);

    layout.addSlot().withContent(
        new TextFieldBuilder()
            .withLabel(of('Glass Filled'))
            .withPlaceholder(of('Glass filled text field...'))
            .asGlass()
            .withStyle(of(TextFieldStyle.TONAL))
    );

    layout.addSlot().withContent(
        new TextFieldBuilder()
            .withLabel(of('Glass Outlined'))
            .withPlaceholder(of('Glass outlined text field...'))
            .asGlass()
            .withStyle(of(TextFieldStyle.OUTLINED))
    );

    const container = layout.build();
    container.classList.add('p-8', 'bg-gradient-to-br', 'from-blue-500', 'to-purple-600', 'min-h-[400px]');

    return container;
};

export const EnhancedFeatures = () => {
    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.EXTRA_LARGE);

    // Helper Text & Character Counter
    layout.addSlot().withContent(
        new TextFieldBuilder()
            .withLabel(of('Character Counter'))
            .withPlaceholder(of('Type to see counter...'))
            .withHelperText(of('This field has a limit'))
            .withMaxLength(20)
            .withCharacterCounter()
    );

    // Password Toggle
    layout.addSlot().withContent(
        new TextFieldBuilder()
            .withLabel(of('Password with Toggle'))
            .withPlaceholder(of('Enter password'))
            .withPasswordToggle()
    );

    // Leading/Trailing Icons
    layout.addSlot().withContent(
        new TextFieldBuilder()
            .withLabel(of('Icons Support'))
            .withPlaceholder(of('Search...'))
            .withLeadingIcon(of('<svg viewBox="0 0 24 24" class="w-5 h-5 fill-current"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>'))
            .withTrailingIcon(of('<svg viewBox="0 0 24 24" class="w-5 h-5 fill-current text-primary"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>'))
    );

    // Prefix/Suffix
    layout.addSlot().withContent(
        new TextFieldBuilder()
            .withLabel(of('Prefix and Suffix'))
            .withPlaceholder(of('0.00'))
            .withPrefix(of('$'))
            .withSuffix(of('USD'))
    );

    const container = layout.build();
    container.classList.add('p-4', 'max-w-md');

    return container;
};

export const Validation = () => {
    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.EXTRA_LARGE);

    layout.addSlot().withContent(
        new TextFieldBuilder()
            .withLabel(of('Email Validation'))
            .withPlaceholder(of('Enter email...'))
            .withEmailValidation()
            .withValue(new BehaviorSubject(''))
    );

    layout.addSlot().withContent(
        new TextFieldBuilder()
            .withLabel(of('Required and Min Length'))
            .withPlaceholder(of('Type at least 3 chars...'))
            .withValidator(Validators.required('Field is mandatory'))
            .withValidator(Validators.minLength(3, 'Too short!'))
            .withValue(new BehaviorSubject(''))
    );

    const container = layout.build();
    container.classList.add('p-4', 'max-w-md');

    return container;
};

