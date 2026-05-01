import { LabelBuilder, LabelSize } from 'ora-components';
import { of } from 'rxjs';

/**
 * Basic Label Example
 * Demonstrates a standard label with a caption.
 */
export function createLabelExample() {
  return new LabelBuilder()
    .withCaption(of('Aura Label'));
}

/**
 * Large Glass Label Example
 * Demonstrates a large label with glass effect.
 */
export function createGlassLabelExample() {
  return new LabelBuilder()
    .withCaption(of('Glass Label'))
    .withSize(LabelSize.MEDIUM)
    .withGlass();
}
