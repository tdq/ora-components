# Component Parts

## Description
Component parts are shared, reusable builder-pattern sub-components used by field components (TextField, NumberField, etc.). They live in `src/components/component-parts/` and follow the same builder pattern as main components (implement ComponentBuilder).

Component parts eliminate duplication between field components by centralizing common UI elements like labels, error text, error popovers, and prefix/suffix containers.

## Parts

### ErrorPopoverBuilder
Builds an error icon button with a popover tooltip for inline error display.

Methods:
- `withError(error: string): this` - sets the error text to display.
- `build(): HTMLElement` - returns a `<button>` with an error icon (uses `Icons.ERROR`). On click, toggles a popover tooltip showing the error text.

Popover behavior:
- Positioned above the icon, centered horizontally.
- Auto-adjusts horizontal position to stay within viewport.
- Auto-closes after 5 seconds.
- Closes on click outside (via `popover="auto"` attribute).
- Uses `showPopover()` / `hidePopover()` API with fallback to `display` style.
- Popover element is appended to `document.body` and cleaned up via `registerDestroy()`.

### FieldLabelBuilder
Builds a `<label>` element for a field.

Methods:
- `withId(id: string): this` - sets the `for` attribute to link to the input.
- `build(): HTMLLabelElement` - returns a styled label with `md-label-small` typography.

### FieldSupportTextBuilder
Builds an error/support text `<span>` element.

Methods:
- `withId(id: string): this` - sets the element `id` for ARIA `describedby` linkage.
- `build(): HTMLElement` - returns a span with `aria-live="polite"` and error text styling.

### FieldAffixBuilder
Builds a container `<div>` for prefix/suffix/icon content.

Methods:
- `withClass(className: Observable<string>): this` - sets additional CSS class.
- `build(): HTMLElement` - returns a flex container for icons/text.

### updateAffixContent(container, content)
Utility function to update the content of an affix container reactively.
- If content is null/empty, hides the container.
- If content is a string, sets innerHTML.
- If content is HTMLElement, appends it.

### generateFieldId(prefix)
Generates sequential IDs with a given prefix (e.g. `text-field-0`, `text-field-1`, `number-field-0`).
Each prefix has its own counter.

## Files structure
- `error-popover.ts` - ErrorPopoverBuilder
- `field-label.ts` - FieldLabelBuilder
- `field-support-text.ts` - FieldSupportTextBuilder
- `field-affix.ts` - FieldAffixBuilder + updateAffixContent()
- `field-id.ts` - generateFieldId()
- `index.ts` - barrel re-export of all parts

## Usage example
```typescript
import { FieldLabelBuilder, FieldSupportTextBuilder, ErrorPopoverBuilder, generateFieldId } from '../component-parts';

const id = generateFieldId('my-field');
const label = new FieldLabelBuilder().withId(id).build();
const supportText = new FieldSupportTextBuilder().withId(`${id}-error`).build();
const errorIcon = new ErrorPopoverBuilder().withError('Invalid input').build();
```
