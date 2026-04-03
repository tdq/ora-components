# Improvements tasks
1. [x] **GridBuilder** addMoneyColumn should accept Money object instead of nimber. Money object is instance of {amount: number, currencyId: string}. Represent currency sign according to the currency id. Provide currency register as a separate util.
2. [ ] **GridBuilder** "editable" feature is not working
3. [x] **GridBuilder** if `withHeight` is not set then height is full height of container
4. [ ] Implement component which accepts observable and allows to define how to render observable value
5. [x] Export `registerDestroy`
6. [x] **GridBuilder** columns method `withClass` should be changed to `withClass(classProvider: (item: ITEM) => string)`
7. [ ] **GridBuilder** Actions panel should be of the width according to the content and not being expanded. It should be aligned to the right.