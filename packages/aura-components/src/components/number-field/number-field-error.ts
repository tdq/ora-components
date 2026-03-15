import { FieldSupportTextBuilder, ErrorPopoverBuilder } from '../component-parts';

export function createNumberFieldSupportText(id: string): HTMLElement {
    return new FieldSupportTextBuilder()
        .withId(id)
        .build();
}

export function createNumberFieldErrorIcon(errorText: string): HTMLElement {
    return new ErrorPopoverBuilder()
        .withError(errorText)
        .build();
}
