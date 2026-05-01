import { ButtonBuilder, ButtonStyle, Icons } from 'ora-components';
import { of } from 'rxjs';

/**
 * Basic Button Example
 * Demonstrates creating a filled button with a caption and click handler.
 */
export function createButtonExample() {
  return new ButtonBuilder()
    .withCaption(of('Click Me'))
    .withStyle(of(ButtonStyle.FILLED))
    .withClick(() => {
      console.log('Button clicked!');
      alert('Hello from Aura Components!');
    });
}

/**
 * Glass Button Example
 * Demonstrates a button with glass effect and an icon.
 */
export function createGlassButtonExample() {
  return new ButtonBuilder()
    .withCaption(of('Glass Button'))
    .asGlass()
    .withIcon(Icons.CHECKMARK);
}
