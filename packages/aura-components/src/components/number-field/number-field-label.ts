import { FieldLabelBuilder } from '../component-parts';

export function createNumberFieldLabel(id: string): HTMLLabelElement {
    return new FieldLabelBuilder()
        .withId(id)
        .build();
}
