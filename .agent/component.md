# Component

## Description
Each component is a custom element based on native JavaScript and HTML (no shadow dom, only light dom is used).
It has the following structure:
- index.ts - component entry point
- component.ts - component class. Name of the file should be the same as class name. For example "layout-builder.ts"
- template.html - component template
- style.css - component styles
- test.ts - component test

component.ts is a class that is following builder pattern for describing the component.
It should implement ComponentBuilder interface.

Components are styled by using Tailwind CSS.
Logic and state are managed by RxJS.

## Requirements
Make components as a pieces of single task. 
Split complex components into a composition of simple components. 
Keep them under the same folder.
Each component should be defined in its own file.
Try to reuse existing components for building more complex components.

## Types of components
1. Components which provides value. This components has method "withValue(value: Subject<T>)". It also should have method "withError(error: Observable<string>)".
2. Components which is used for layout. This components has method "withContent(content: ComponentBuilder)", or "addSlot(): SlotBuilder".

```typescript
interface SlotBuilder {
    withContent(content: ComponentBuilder): this;
    withVisible(visible: Observable<boolean>): this;
    withSize(size: Observable<Size>): this;
}
```

3. Components which are used for displaying data. This components has method "withValue(value: Observable<T>)". It also should have method "withError(error: Observable<string>)".
4. Components which are displaying data as table or as chart. These components has method "withData(data: Observable<T[]>)". It also should have method "withError(error: Observable<string>)". And also these components can have method "withColumns(columns: ColumnBuilder[])" for tables or withCharts(charts: ChartBuilder[]) for charts.

## Theme
Components are styled by using Tailwind CSS. The theme is Material Design 3.
Theme has color schemes:
- light
- dark
- pink

## Common methods
- withCaption(caption: Observable<string>): this - sets the caption of the component
- withContent(content: Observable<ComponentBuilder>): this - sets the content of the component
- withVisible(visible: Observable<boolean>): this - sets the visibility of the component

## Example

```typescript
// Example builder that delegates to existing components
// (See builder-pattern.md for the full pattern)
class ExampleBuilder implements ComponentBuilder {
    build(): HTMLElement {
        return new PanelBuilder()
            .withContent(new LabelBuilder().withCaption(of('Hello')))
            .build();
    }
}
```