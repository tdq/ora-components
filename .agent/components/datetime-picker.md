# DateTimePicker

## Description
DateTimePickerBuilder is a component that combines date and time selection into a single input field. It extends the DatePickerBuilder pattern by adding a time picker section below the calendar inside the same popover. The user selects a date first (popover stays open), then selects a time (popover closes and value is committed).

## API Reference

All builder methods are chainable and return `this`.

### Value Binding
- **`withValue(value: Subject<Date | null>)`** — Two-way binding. The component reads from this subject to display the current value and writes to it on selection or valid manual input.

### Configuration
- **`withCaption(caption: Observable<string>)`** — Sets a caption label above the field. Hidden when the observable emits an empty string.
- **`withFormat(format: string)`** — Sets the date-time display and parse format. Default: `'DD-MM-YYYY HH:mm'`. Supported tokens: `YYYY`, `MM`, `DD`, `HH:mm` (24h) or `hh:mm A` (12h). The time placeholder in the format must match the configured `timeFormat`.
- **`withTimeFormat(format: '12h' | '24h')`** — Switches between 24-hour (`HH:mm`) and 12-hour (`hh:mm A`) time representations. Default: `'24h'`.
- **`withFirstDayOfTheWeek(day: DayOfWeek)`** — Sets which day appears first in the calendar grid. Default: `DayOfWeek.MONDAY`.

### Constraints
- **`withMinDate(min: Observable<Date>)`** — Minimum selectable date. Days before this are disabled in the calendar.
- **`withMaxDate(max: Observable<Date>)`** — Maximum selectable date. Days after this are disabled in the calendar.
- **`withMinTime(time: Observable<Time>)`** — Minimum selectable hour and minute. When the selected date equals `minDate`, hours and minutes before this are disabled in the list boxes.
- **`withMaxTime(time: Observable<Time>)`** — Maximum selectable hour and minute. When the selected date equals `maxDate`, hours and minutes after this are disabled in the list boxes.

Time type
```ts
export interface Time {
    hour: number;
    minute: number;
}
```

### State Observables
- **`withEnabled(enabled: Observable<boolean>)`** — Disables the input and icon button when `false`. Applies `opacity-38` and `pointer-events-none`.
- **`withError(error: Observable<string>)`** — Shows an error message below the field. Highlights the input wrapper border with `border-error` when non-empty.

### Styling
- **`withStyle(style: Observable<DateTimePickerStyle>)`** — Sets CSS custom properties on the container: `--md-sys-color-primary`, `--md-sys-color-surface`, `--md-sys-color-on-surface`, `--md-sys-shape-corner-small`, and `font-family`.
- **`withClass(className: Observable<string>)`** — Appends additional CSS classes to the container element.
- **`asGlass()`** — Enables glass-morphism styling (see Glass Effects below).

`DateTimePickerStyle` is a type re-export of `DatePickerStyle`:
```ts
// In types.ts:
export type { DatePickerStyle as DateTimePickerStyle } from '../date-picker/types';
```
The enum values (`TONED`, `OUTLINED`) come from `DatePickerStyle`.
Calendar is on the left, and hours/minutes are on the right. hours and minutes have same width - 100px, small gap between them. Medium gap between calendar and hours.
Calendar width should be 288px. Height of hours and minutes list boxes should be 232px. Width of popover is not defined, it will be according the content.

Width of popover is 548px.
Popover should not close on changing hours/minues/date. It can be closed only if user clicked outside of the popup, or by ESC key.

### Build
- **`build(): HTMLElement`** — Constructs and returns the DOM element. The returned element has three convenience methods attached: `showPopover()`, `hidePopover()`, and `toggle()`.

### Components
Use Calendar from components-parts for selecting date.
Use LayoutBuilder for layouting (as horizontal)
Use ListBoxBuilder for hours and minutes lists
Use CheckboxBuilder for AM/PM switch


## Usage Examples

### Basic 24h DateTime Picker
```ts
import { BehaviorSubject } from 'rxjs';
import { DateTimePickerBuilder } from 'ora-components';

const value$ = new BehaviorSubject<Date | null>(new Date());
const builder = new DateTimePickerBuilder()
    .withValue(value$)
    .withCaption(of('Appointment'))
    .withFormat('DD-MM-YYYY HH:mm');
const element = builder.build();
document.body.appendChild(element);
```

### 12h Format with AM/PM
```ts
const builder = new DateTimePickerBuilder()
    .withValue(value$)
    .withTimeFormat('12h')
    .withFormat('DD-MM-YYYY hh:mm A');
```

### Glass Effect with Range Constraints
```ts
const min$ = of(new Date(2024, 0, 1));
const max$ = of(new Date(2025, 11, 31));
const builder = new DateTimePickerBuilder()
    .withValue(value$)
    .withMinDate(min$)
    .withMaxDate(max$)
    .asGlass();
```

### Programmatic Control
```ts
const container = builder.build() as HTMLElement & {
    showPopover(): void;
    hidePopover(): void;
    toggle(): void;
};
container.showPopover(); // opens the popover
container.hidePopover(); // closes the popover
container.toggle();      // toggles the popover
```

## Grid Integration (DateTimeColumnBuilder)

The `DateTimeColumnBuilder` automatically uses `DateTimePickerBuilder` as its inline editor. When a column type is set to `ColumnType.DATETIME`, the grid invokes:

```ts
// DateTimeColumnBuilder.createEditor (simplified)
const value$ = new BehaviorSubject<Date | null>(date);
const builder = new DateTimePickerBuilder()
    .withValue(value$);
if (isGlass) builder.asGlass();
if (this._format) builder.withFormat(this._format);
```

The column's `render()` method formats the date using `toLocaleString()` for display only; the editor handles the full datetime picker interaction.

## Format Options

The component supports two time format modes, controlled by `withTimeFormat()`:

| Mode   | Format template | Example input        | Placeholder      |
|--------|-----------------|----------------------|------------------|
| `'24h'` (default) | `DD-MM-YYYY HH:mm` | `15-06-2023 14:30` | `DD-MM-YYYY HH:mm` |
| `'12h'` | `DD-MM-YYYY hh:mm A` | `15-06-2023 02:30 PM` | `DD-MM-YYYY hh:mm A` |

When using `'12h'` mode, the time picker displays AM/PM toggle buttons. The hours grid shows 1-12 instead of 0-23.

**Important**: The time placeholder in the format string (`HH:mm` or `hh:mm A`) must match the value passed to `withTimeFormat()`. Mismatched combinations (e.g. `HH:mm` in format but `'12h'` in timeFormat) will cause formatting and parsing errors.

## Component Structure

```
DateTimePickerBuilder.build()
├── Caption (optional label)
├── Input wrapper
│   ├── Text input (with input masking)
│   └── Calendar icon button (toggles popover)
├── Error message (hidden by default)
└── Popover (360px wide)
    ├── Calendar grid (date selection) | Time picker (hours + minutes)
```

### Selection Flow
1. **Open popover**: Click calendar icon or press `Alt + ArrowDown` on the input.
2. **Select date**: Click a day in the calendar grid, or navigate with arrow keys and press `Enter`. Selecting a date updates the date portion of the value but keeps the popover open.
3. **Select time**: Click an hour and minute in the time picker scroll columns, or toggle AM/PM in 12h mode. Selecting a time updates the full datetime and **closes the popover**.
4. **Manual input**: Typing a value matching the format string immediately parses and commits it. Input masking enforces the format character-by-character.

## Keyboard Navigation

| Context          | Key              | Action                                |
|------------------|------------------|---------------------------------------|
| Input (closed)   | `Alt + ArrowDown`| Open popover                          |
| Input (open)     | `Escape`         | Close popover, return focus to input  |
| Calendar grid    | `ArrowLeft/Right`| Move focus by 1 day                   |
| Calendar grid    | `ArrowUp/Down`   | Move focus by 7 days                  |
| Calendar grid    | `Enter` / `Space`| Select focused date                   |
| Calendar grid    | `Escape`         | Close popover                         |

## Glass Effects

When `asGlass()` is called:
- The input wrapper uses `glass-effect` and `rounded-small` classes instead of `bg-surface-variant` / `rounded-t-small`.
- Text colors switch to `text-gray-900 dark:text-white` for input/label, `text-gray-600 dark:text-white/60` for icons.
- The popover receives the `glass-effect` class (transparent with backdrop blur) instead of `bg-surface border-outline`.
- Calendar day cells, time picker buttons, and AM/PM toggles all adapt their active/inactive styling accordingly.


