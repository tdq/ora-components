Builder pattern is used to create components.
Components implemented by using builders pattern are classes, which implements interface "ComponentBuilder".

```typescript
export interface ComponentBuilder {
    build(): HTMLElement;
}
```

The main feature of builders is that methods can be called in any order. and only in "build" method HTMLElement is created.
"build" method should be called as last method for constructing component. All "with", "add", "as" methods are setting properties and parameters according to which component will be constructed in "build" method.

## Example of component builder:

```typescript
export class DivBuilder implements ComponentBuilder {

    private content: ComponentBuilder;
    private className: string;

    withContent(ComponentBuilder: ComponentBuilder): this {
        this.content = ComponentBuilder;
        return this;
    }

    withClass(className: string): this {
        this.className = className;
        return this;
    }

    build(): HTMLElement {
        const element = document.createElement('div');
        if (this.content) {
            element.appendChild(this.content.build());
        }
        if (this.className) {
            element.classList.add(this.className);
        }
        return element;
    }
}
```

## Usage

```typescript
class SomeBuilder extends DivBuilder {
    constructor() {
        super();
        this.withClass('flex flex-col gap-4');
        this.withContent(new LabelBuilder().withCaption('Label'));
    }
}

const somePanel = new SomeBuilder();

layout.addSlot().withContent(somePanel);
```

## Naming convention
- builder classes should have suffix "Builder". Example: "ButtonBuilder", "LayoutBuilder", "DivBuilder"
- builders can have only methods that starts with "with" or "add", or "as". 
- "build" method is special method which is used for getting HTMLElement.
- "with" method is used for setting properties, which are changing behavior of the component. Example for ButtonBuilder: "withCaption", "withDisabled", "withClick". Also such method can be used to define inline builder. For example: "withToolbar(): ToolbarBuilder". Calling this method returns current instance of ToolbarBuilder. This instance should be created only once.
- "add" method is used for adding some sub builders. Example: "addButton(new ButtonBuilder())"
- "as" method is used for setting properties, which are changing behavior of the component. Example for LayoutBuilder: "asHorizontal()", "asVertical()", "asGrid()"
- methods can return same builder instance or another builder instance. For example, if method has name "withToolbar", it should return ToolbarBuilder instance.

## Types of builders

There are two types of builders:
- main builders
- inline builders

Main builders are classes, which implements interface "ComponentBuilder". They are used as main entry point for building components.
Inline builders are classes, which also implements interface "ComponentBuilder". But they are not exported from the module, module should export only interface of inline builder.
Instead main builder has some methods, which returns inline builder instance.
Inline builders also can have helper methods which main builders can call to setup them. Inline builders interface must not define this helper methods.

## Example of builder with inline builder:

```typescript
export interface SomeInlineBuilder {
    withContent(content: ComponentBuilder): this;
}

export class SomeBuilder extends ComponentBuilder {
    addSlot(): SomeInlineBuilder {
        return new SomeInlineBuilderImpl();
    }
}

class SomeInlineBuilderImpl implements SomeInlineBuilder {
    withContent(content: ComponentBuilder): this {
        return this;
    }
}
```
