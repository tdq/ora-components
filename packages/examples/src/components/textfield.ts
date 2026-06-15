import { TextFieldBuilder, TextFieldStyle } from '@tdq/ora-components';
import { BehaviorSubject, of } from 'rxjs';

/**
 * TONAL (default) — filled-surface input.
 * Use in most forms on standard surfaces. No explicit `.withStyle()` needed
 * since TONAL is the default, but shown here for clarity.
 */
export function createTextFieldExample() {
    return new TextFieldBuilder()
        .withLabel(of('Full Name'))
        .withPlaceholder(of('Enter your name...'));
}

/**
 * OUTLINED — bordered input with a transparent background.
 * Use on light surfaces, inside glass panels, or in dense forms
 * where a filled background would feel heavy.
 */
export function createOutlinedTextFieldExample() {
    return new TextFieldBuilder()
        .withLabel(of('Email'))
        .withStyle(of(TextFieldStyle.OUTLINED))
        .asEmail()
        .withPlaceholder(of('you@example.com'));
}

/**
 * Password — `.asPassword()` masks the value and adds a show/hide toggle.
 * Combine with `.withError()` for confirm-password mismatch feedback.
 */
export function createPasswordTextFieldExample() {
    return new TextFieldBuilder()
        .withLabel(of('Password'))
        .asPassword();
}

/**
 * Prefix — `.withPrefix()` accepts a string (icon name) or HTMLElement.
 * Use icon names from the Icons enum or a raw SVG string for custom icons.
 * `.withSuffix()` works the same way on the trailing side.
 */
export function createPrefixTextFieldExample() {
    return new TextFieldBuilder()
        .withLabel(of('Search'))
        .withPrefix(of('search'))
        .withPlaceholder(of('Type to search...'));
}

/**
 * Validation error — `.withError()` shows a message below the field.
 * Accepts Observable<string>: emit a message to show it, emit '' to clear.
 * Use `.asInlineError()` to render the error inside the field instead of below.
 */
export function createErrorTextFieldExample() {
    return new TextFieldBuilder()
        .withLabel(of('Username'))
        .withError(of('Username is already taken'));
}

/**
 * Disabled — `.withEnabled(observable<boolean>)` makes the field read-only.
 * Accepts Observable so it can react to permissions or async state.
 */
export function createDisabledTextFieldExample() {
    return new TextFieldBuilder()
        .withLabel(of('Account ID'))
        .withEnabled(of(false))
        .withPlaceholder(of('ACC-00142'));
}

/**
 * Reactive value — `.withValue(subject)` accepts a BehaviorSubject<string>.
 * The subject is two-way: it updates as the user types, and you can push
 * values into it programmatically (e.g. pre-filling from an API response).
 */
export function createReactiveTextFieldExample() {
    const value$ = new BehaviorSubject('');
    return new TextFieldBuilder()
        .withLabel(of('Live Bound Field'))
        .withValue(value$)
        .withPlaceholder(of('Type something...'));
}

/**
 * Glass — frosted translucent input.
 * Use in modals, overlays, or dark-themed surfaces.
 */
export function createGlassTextFieldExample() {
    return new TextFieldBuilder()
        .withLabel(of('Glass Input'))
        .asGlass()
        .withPlaceholder(of('Frosted glass input'));
}
