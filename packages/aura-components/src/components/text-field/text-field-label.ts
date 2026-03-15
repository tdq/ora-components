import { FieldLabelBuilder } from '../component-parts';

export function createTextFieldLabel(id: string): HTMLLabelElement {
    return new FieldLabelBuilder()
        .withId(id)
        .build();
}
