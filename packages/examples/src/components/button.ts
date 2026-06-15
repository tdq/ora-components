import { ButtonBuilder, ButtonStyle, Icons } from '@tdq/ora-components';
import { of } from 'rxjs';

/**
 * FILLED — highest emphasis.
 * Use for the primary CTA on a page (Save, Submit, Confirm).
 * Only one filled button should appear per surface.
 */
export function createFilledButtonExample() {
    return new ButtonBuilder()
        .withCaption(of('Save Changes'))
        .withStyle(of(ButtonStyle.FILLED))
        .withClick(() => console.log('saved'));
}

/**
 * TONAL — medium emphasis, softer than filled.
 * Use for secondary actions that are important but not the primary CTA.
 * Good for: Add Item, Duplicate, Export.
 */
export function createTonalButtonExample() {
    return new ButtonBuilder()
        .withCaption(of('Add Item'))
        .withStyle(of(ButtonStyle.TONAL));
}

/**
 * OUTLINED — low emphasis with a visible boundary.
 * Use for cancel/back actions, or when the background provides enough context.
 */
export function createOutlinedButtonExample() {
    return new ButtonBuilder()
        .withCaption(of('Cancel'))
        .withStyle(of(ButtonStyle.OUTLINED));
}

/**
 * ELEVATED — surface-raised button.
 * Use when the button sits on a flat background and needs visual lift.
 */
export function createElevatedButtonExample() {
    return new ButtonBuilder()
        .withCaption(of('More Options'))
        .withStyle(of(ButtonStyle.ELEVATED));
}

/**
 * TEXT — least emphasis, no background or border.
 * Use for inline actions, links, or tertiary controls inside dense UIs.
 */
export function createTextButtonExample() {
    return new ButtonBuilder()
        .withCaption(of('Learn more'))
        .withStyle(of(ButtonStyle.TEXT));
}

/**
 * With icon — `.withIcon()` accepts an Icons enum value or an SVG string.
 * The icon is placed before the caption automatically.
 */
export function createIconButtonExample() {
    return new ButtonBuilder()
        .withCaption(of('Confirm'))
        .withStyle(of(ButtonStyle.FILLED))
        .withIcon(Icons.CHECKMARK);
}

/**
 * Disabled — `.withEnabled(observable<boolean>)` controls interactivity.
 * Accepts an Observable so the enabled state can respond to form validity,
 * permissions, or async operations without rebuilding the button.
 */
export function createDisabledButtonExample() {
    return new ButtonBuilder()
        .withCaption(of('Unavailable'))
        .withStyle(of(ButtonStyle.FILLED))
        .withEnabled(of(false));
}

/**
 * Glass — translucent dark-surface button.
 * Use over images, gradient backgrounds, or inside glass panels.
 * `.asGlass()` optionally accepts a boolean for conditional toggling.
 */
export function createGlassButtonExample() {
    return new ButtonBuilder()
        .withCaption(of('Glass Button'))
        .asGlass()
        .withIcon(Icons.CHECKMARK);
}
