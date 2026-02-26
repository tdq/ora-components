# DatePicker

## Description
DatePicker component is a custom component that is used to display a date selector.
It has the following methods:
- withCaption(caption: Observable<string>): this - sets caption of the datepicker.
- withEnabled(enabled: Observable<boolean>): this - sets enabled state of the datepicker.
- withClass(className: Observable<string>): this - sets class css name of the datepicker.
- withValue(value: Subject<Date | null>): this - sets value for datepicker. It is also updated by datepicker itself on date setting.
- withError(error: Observable<string>): this - sets error of the datepicker.
- withStyle(style: Observable<DatePickerStyle>): this - sets style of the datepicker.
- asGlass(): this - sets special styling option for datepicker and its popup with items as transparent with blur background (glass effect). 
- withMinDate(min: Observable<Date>): this - Sets minimum selectable date.
- withMaxDate(max: Observable<Date>): this - Sets maximum selectable date.
- withFormat(format: string): this - sets date format (default: 'DD-MM-YYYY')

## Requirements
- DatePicker should not allow to type not in defined format. For example, if format is DD/MM/YYYY it should not allow to set anything like "asbasbds".
- On opening calendar it should display currently selected date in the calendar.

## State Management

- **Selected Date**: Managed via `withValue(Subject<Date | null>)`. Updates on valid manual input or grid cell selection.
- **Popup Visibility**: Toggled by the calendar icon and closed on selection or outside click.
- **Constraints**: `minDate` and `maxDate` disable selection of dates outside the range.
- **Validation**: Manual input is validated against the specified format; invalid entries trigger error state.

## Styling

- **Theme**: Use Material Design 3 tokens (`bg-surface-variant`, `text-on-surface`, `primary`).
- **States**: Hover/focus effects for input and day cells (`hover:bg-primary-container`).
- **Glass Effect**: Applies `backdrop-blur-md`, `bg-white/10`, and `border-white/20`.
- **Transitions**: Smooth transitions (150-200ms) for popup entry and day selection.
Height is 48px

## Accessibility Requirements
- **Keyboard**: 
  - `Alt + ArrowDown` to open popup.
  - Arrow keys to navigate calendar grid.
  - `Enter` to select, `Esc` to close.
