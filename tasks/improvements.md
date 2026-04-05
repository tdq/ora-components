# Improvements tasks
[x] **GridBuilder** addMoneyColumn should accept Money object instead of nimber. Money object is instance of {amount: number, currencyId: string}. Represent currency sign according to the currency id. Provide currency register as a separate util.
[ ] **GridBuilder** "editable" feature is not working
[x] **GridBuilder** if `withHeight` is not set then height is full height of container
[ ] Implement component which accepts observable and allows to define how to render observable value
[x] Export `registerDestroy`
[x] **GridBuilder** columns method `withClass` should be changed to `withClass(classProvider: (item: ITEM) => string)`
[x] **GridBuilder** Actions panel should be of the width according to the content and not being expanded. It should be aligned to the right.
[x] **DatePickerBuilder** On light theme with glass effect highlighting of current date is not visible
[ ] Implement SelectBuilder
[ ] Implement DateTimePickerBuilder
[ ] **GridBuilder** Implement editors for enum-column and datetime-column
[ ] Implement DateRangePickerBuilder
[ ] Implement TreeGridBuilder