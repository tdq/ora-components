import { LabelBuilder, LabelSize } from '@tdq/ora-components';
import { BehaviorSubject, of } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * SMALL — captions, metadata, secondary info, timestamps.
 * Renders at the smallest available text size.
 */
export function createSmallLabelExample() {
    return new LabelBuilder()
        .withCaption(of('Updated 2 hours ago'))
        .withSize(LabelSize.SMALL);
}

/**
 * MEDIUM — body text, descriptions, default label size.
 * Use when no explicit size is needed.
 */
export function createMediumLabelExample() {
    return new LabelBuilder()
        .withCaption(of('Invoice total'))
        .withSize(LabelSize.MEDIUM);
}

/**
 * LARGE — section headings, panel titles, prominent labels.
 * Use at the top of a PanelBuilder or as a visual section divider.
 */
export function createLargeLabelExample() {
    return new LabelBuilder()
        .withCaption(of('Dashboard Overview'))
        .withSize(LabelSize.LARGE);
}

/**
 * Styled label — `.withClass()` applies Tailwind classes for cases where
 * preset sizes aren't enough: large numeric displays, colored text, opacity,
 * monospaced figures, or custom font weights.
 *
 * Use `tabular-nums` for monetary values and counters to prevent layout shifts.
 */
export function createStyledLabelExample() {
    return new LabelBuilder()
        .withCaption(of('$24,891.00'))
        .withClass(of('text-[28px] font-bold tabular-nums text-on-surface'));
}

/**
 * Glass label — frosted glass treatment.
 * Use over blurred, image, or gradient backgrounds.
 */
export function createGlassLabelExample() {
    return new LabelBuilder()
        .withCaption(of('Glass Label'))
        .withSize(LabelSize.MEDIUM)
        .withGlass();
}

/**
 * Reactive label — `.withCaption()` accepts any Observable<string>.
 * Pipe any BehaviorSubject, store selector, or timer to update the label
 * in real time without rebuilding the component.
 */
export function createReactiveLabelExample() {
    const count$ = new BehaviorSubject(0);
    const caption$ = count$.pipe(map(n => `Live count: ${n}`));

    return new LabelBuilder()
        .withCaption(caption$)
        .withSize(LabelSize.MEDIUM);
}
