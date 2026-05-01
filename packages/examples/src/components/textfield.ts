import { TextFieldBuilder } from 'ora-components';
import { of } from 'rxjs';

/**
 * Basic TextField Example
 * Demonstrates a standard text input with a label and placeholder.
 */
export function createTextFieldExample() {
  return new TextFieldBuilder()
    .withLabel(of('User Name'))
    .withPlaceholder(of('Enter your name...'));
}

/**
 * Glass Password TextField Example
 * Demonstrates a password input with glass effect and icon.
 */
export function createPasswordTextFieldExample() {
  return new TextFieldBuilder()
    .withLabel(of('Password'))
    .asPassword()
    .asGlass()
    .withPrefix(of('lock'));
}
