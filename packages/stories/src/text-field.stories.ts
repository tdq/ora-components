import { TextFieldBuilder, TextFieldStyle } from '@tdq/ora-components';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { map } from 'rxjs/operators';
import { LayoutBuilder, LayoutGap } from '@tdq/ora-components';
import { LabelBuilder, LabelSize } from '@tdq/ora-components';
import { ButtonBuilder, ButtonStyle } from '@tdq/ora-components';

export default {
    title: 'Components/TextField',
    tags: ['stable', 'glass', 'reactive'],
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
            .withPlaceholder(of('Type something...'))
            .withStyle(of(TextFieldStyle.TONAL))
    );

    layout.addSlot().withContent(
        new LabelBuilder()
            .withCaption(of('Outlined Style'))
            .withSize(LabelSize.MEDIUM)
    );

    layout.addSlot().withContent(
        new TextFieldBuilder()
            .withPlaceholder(of('Type something...'))
            .withStyle(of(TextFieldStyle.OUTLINED))
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
            .withPlaceholder(of('Disabled when unchecked...'))
            .withEnabled(enabled$)
    );

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

export const InlineValidation = () => {
    const value1$ = new BehaviorSubject('');
    const error1$ = value1$.pipe(
        map(val => val.length > 0 && val.length < 3 ? 'Too short' : '')
    );

    const value2$ = new BehaviorSubject('');
    const error2$ = value2$.pipe(
        map(val => val.length > 0 && val.length < 3 ? 'Too short' : '')
    );

    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.EXTRA_LARGE);

    layout.addSlot().withContent(
        new TextFieldBuilder()
            .withLabel(of('Username (TONAL)'))
            .withPlaceholder(of('Type at least 3 characters...'))
            .withValue(value1$)
            .withError(error1$)
            .asInlineError()
            .withStyle(of(TextFieldStyle.TONAL))
    );

    layout.addSlot().withContent(
        new TextFieldBuilder()
            .withLabel(of('Username (OUTLINED)'))
            .withPlaceholder(of('Type at least 3 characters...'))
            .withValue(value2$)
            .withError(error2$)
            .asInlineError()
            .withStyle(of(TextFieldStyle.OUTLINED))
    );

    const container = layout.build();
    container.classList.add('p-4', 'max-w-md');

    return container;
};

/**
 * Every state of `asInlineError()` side by side: no error, static error in both
 * styles, a live length validation, a manual toggle, and disabled-with-error.
 * Click the error icon to open the message popover.
 */
export const InlineErrorStates = () => {
    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.EXTRA_LARGE);

    layout.addSlot().withContent(
        new LabelBuilder()
            .withCaption(of('No error — renders like a plain TextField (no footer space reserved)'))
            .withSize(LabelSize.MEDIUM)
    );
    layout.addSlot().withContent(
        new TextFieldBuilder()
            .withLabel(of('Name'))
            .withPlaceholder(of('Type anything...'))
            .withError(of(''))
            .asInlineError()
    );

    layout.addSlot().withContent(
        new LabelBuilder()
            .withCaption(of('Static error — TONAL and OUTLINED'))
            .withSize(LabelSize.MEDIUM)
    );
    layout.addSlot().withContent(
        new TextFieldBuilder()
            .withLabel(of('Email (tonal)'))
            .withValue(new BehaviorSubject('not-an-email'))
            .withError(of('Enter a valid email address'))
            .asInlineError()
            .withStyle(of(TextFieldStyle.TONAL))
    );
    layout.addSlot().withContent(
        new TextFieldBuilder()
            .withLabel(of('Email (outlined)'))
            .withValue(new BehaviorSubject('not-an-email'))
            .withError(of('Enter a valid email address'))
            .asInlineError()
            .withStyle(of(TextFieldStyle.OUTLINED))
    );

    layout.addSlot().withContent(
        new LabelBuilder()
            .withCaption(of('Live validation — required, at least 3 characters'))
            .withSize(LabelSize.MEDIUM)
    );
    const live$ = new BehaviorSubject('');
    layout.addSlot().withContent(
        new TextFieldBuilder()
            .withLabel(of('Username'))
            .withPlaceholder(of('Start typing...'))
            .withValue(live$)
            .withError(live$.pipe(map(v => (!v ? 'Required' : v.length < 3 ? 'Too short' : ''))))
            .asInlineError()
    );

    layout.addSlot().withContent(
        new LabelBuilder()
            .withCaption(of('Manual toggle'))
            .withSize(LabelSize.MEDIUM)
    );
    const toggled$ = new BehaviorSubject<string>('');
    layout.addSlot().withContent(
        new TextFieldBuilder()
            .withLabel(of('Reference'))
            .withError(toggled$)
            .asInlineError()
    );
    layout.addSlot().withContent(
        new ButtonBuilder()
            .withCaption(toggled$.pipe(map(e => (e ? 'Clear error' : 'Show error'))))
            .withStyle(of(ButtonStyle.OUTLINED))
            .withClick(() => toggled$.next(toggled$.getValue() ? '' : 'Reference already exists'))
    );

    layout.addSlot().withContent(
        new LabelBuilder()
            .withCaption(of('Disabled with error'))
            .withSize(LabelSize.MEDIUM)
    );
    layout.addSlot().withContent(
        new TextFieldBuilder()
            .withLabel(of('Locked'))
            .withValue(new BehaviorSubject('read only'))
            .withEnabled(of(false))
            .withError(of('Cannot be changed'))
            .asInlineError()
    );

    const container = layout.build();
    container.classList.add('p-4', 'max-w-md');

    return container;
};

export const InlineErrorGlass = () => {
    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.EXTRA_LARGE);

    layout.addSlot().withContent(
        new TextFieldBuilder()
            .withLabel(of('Glass, no error'))
            .withPlaceholder(of('Type anything...'))
            .withError(of(''))
            .asInlineError()
            .asGlass()
    );

    layout.addSlot().withContent(
        new TextFieldBuilder()
            .withLabel(of('Glass, inline error (tonal)'))
            .withValue(new BehaviorSubject('not-an-email'))
            .withError(of('Enter a valid email address'))
            .asInlineError()
            .asGlass()
            .withStyle(of(TextFieldStyle.TONAL))
    );

    layout.addSlot().withContent(
        new TextFieldBuilder()
            .withLabel(of('Glass, inline error (outlined)'))
            .withValue(new BehaviorSubject('not-an-email'))
            .withError(of('Enter a valid email address'))
            .asInlineError()
            .asGlass()
            .withStyle(of(TextFieldStyle.OUTLINED))
    );

    const container = layout.build();
    container.classList.add('flex-1', 'p-8', 'bg-gradient-to-br', 'from-indigo-500', 'via-purple-500', 'to-pink-500');

    return container;
};

export const DocumentedFeatures = () => {
    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.EXTRA_LARGE);

    // Password Toggle
    layout.addSlot().withContent(
        new TextFieldBuilder()
            .withLabel(of('Password Field'))
            .withPlaceholder(of('Enter password'))
            .asPassword()
    );

    // Email Field
    layout.addSlot().withContent(
        new TextFieldBuilder()
            .withLabel(of('Email Field'))
            .withPlaceholder(of('Enter email'))
            .asEmail()
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

export const Interactive = () => {
    const value$ = new BehaviorSubject('Hello RxJS');
    const resetClick$ = new Subject<void>();

    resetClick$.subscribe(() => value$.next('Hello RxJS'));

    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.LARGE);

    layout.addSlot().withContent(
        new TextFieldBuilder()
            .withPlaceholder(of('Placeholder...'))
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
            .withClick(() => resetClick$.next())
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
    container.classList.add('flex-1', 'p-8', 'bg-gradient-to-br', 'from-indigo-500', 'via-purple-500', 'to-pink-500');

    return container;
};


