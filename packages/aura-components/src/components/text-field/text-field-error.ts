import { FieldSupportTextBuilder, ErrorPopoverBuilder } from '../component-parts';

export function createTextFieldSupportText(id: string): HTMLElement {
    return new FieldSupportTextBuilder()
        .withId(id)
        .build();
}

export function createTextFieldError(errorText: string): HTMLElement {
    return new ErrorPopoverBuilder()
        .withError(errorText)
        .build();
}
