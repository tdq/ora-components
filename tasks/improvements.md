# Improvements tasks

1. All **withClass** methods should be refactored to this: `withClass(class: Observable<string>)`
2. **GridBuilder** Allow to define conditions for icons in actions panel on which they will be enabled or visible. Add methods `withEnable(enable: Observable<boolean>)` and `withVisible(visible: Observable<boolean>)`