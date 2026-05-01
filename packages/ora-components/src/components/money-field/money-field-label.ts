import { FieldLabelBuilder } from '../component-parts';

export function createMoneyFieldLabel(id: string): HTMLLabelElement {
    return new FieldLabelBuilder()
        .withId(id)
        .build();
}