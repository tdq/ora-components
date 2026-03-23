# Improvements tasks

1. All **withClass** methods should be refactored to this: `withClass(class: Observable<string>)`
2. **ChartBuilder** should optimize amount of displayed points to some limited amount (not more points than length of X/Y axes)
3. **ChartBuilder** should opimaly display huge amount of values in X axes, so they are not overlapping. Maybe display them vertically and allow to scroll content.
4. **GridBuilder** Glass effect do not have blur if grid displayed in panel.
5. **GridBuilder** Allow to define conditions for icons in actions panel on which they will be enabled or visible.
6. **DatePickerBuilder** Height should be the same as text fields.
7. **DatePickerBuilder** Should allow to define first day of the week `withFirstDayOfTheWeek(day: DaysEnum)` and by default it should be Monday.