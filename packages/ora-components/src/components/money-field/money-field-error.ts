import { FieldSupportTextBuilder, ErrorPopoverBuilder } from '../component-parts';

export function createMoneyFieldSupportText(id: string): HTMLElement {
    return new FieldSupportTextBuilder()
        .withId(id)
        .build();
}

export function createMoneyFieldErrorIcon(errorText: string): HTMLElement {
    return new ErrorPopoverBuilder()
        .withError(errorText)
        .build();
}