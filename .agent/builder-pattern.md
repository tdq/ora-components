# Builder pattern

## Description
Builder pattern is used to create components.
Components implemented by using builders pattern are classes, which implements interface "ComponentBuilder".

```typescript
export interface ComponentBuilder {
    build(): HTMLElement;
}
```

Popups are special components. They are displayed not as a page content, but as panel ontop of it with higher zIndex (1000).
Popups are implementing "PopupBuilder" interface.

```typescript
export interface PopupBuilder {
    show()
    close()
}
```

On "show" call popup builds its content and displays itself. On "close" it removes itself.

The main feature of builders is that methods can be called in any order. and only in "build" method HTMLElement is created.
"build" method should be called as last method for constructing component. All "with", "add", "as" methods are setting properties and parameters according to which component will be constructed in "build" method.

## Example: Composing existing builders

```typescript
// Custom KPI card builder — shows proper delegation, NOT raw class manipulation
export class KPICardBuilder implements ComponentBuilder {
    private label$?: Observable<string>;
    private value$?: Observable<string>;

    withLabel(label: Observable<string>): this {
        this.label$ = label;
        return this;
    }

    withValue(value: Observable<string>): this {
        this.value$ = value;
        return this;
    }

    build(): HTMLElement {
        const layout = new LayoutBuilder().asVertical();
        layout.addSlot().withContent(
            new LabelBuilder().withCaption(this.label$!)
        );
        layout.addSlot().withContent(
            new LabelBuilder().withCaption(this.value$!)
        );

        // All configuration BEFORE build() — no classList.add, no style.xxx
        return new PanelBuilder()
            .withGap(PanelGap.LARGE)
            .withContent(layout)
            .build();
    }
}
```

This shows:
1. Delegation to existing builders (PanelBuilder, LayoutBuilder, LabelBuilder)
2. withContent() used with an internal LayoutBuilder for multi-child layouts
3. withGap() used instead of raw classes
4. All configuration before build()
5. No classList.add/remove, no element.style.xxx, no appendChild post-build

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

## Anti-patterns — Post-build manipulation

After calling `build()`, the returned `HTMLElement` is **final**. Never modify it:

- ❌ `element.classList.add(...)`, `element.classList.remove(...)`
- ❌ `element.style.xxx = 'yyy'`, `element.style.setProperty(...)`
- ❌ `element.appendChild(...)`, `element.removeChild(...)`, `element.innerHTML = ...`
- ❌ `element.setAttribute(...)`, `element.removeAttribute(...)`

All visual properties, children, and styling must be configured through builder methods
(`withGap()`, `withContent()`, `withClass()`, `asGlass()`, etc.) **before** calling `build()`.

Custom styling: use `withClass(of('your-class'))` — the builder merges it with internal classes via `cn()`.

Multi-child layout: use `LayoutBuilder` with `addSlot().withContent(...)` — do NOT append children after `build()`.

### Manual subscription instead of piped Observable

When a builder method accepts `Observable<T>`, pipe dynamic values through the Observable
chain — do NOT subscribe manually:

❌ WRONG — manual subscribe + style manipulation:
```typescript
const el = new LabelBuilder().withCaption(name$).build();
const colorSub = color$.subscribe(c => { el.style.color = c; });
registerDestroy(el, () => colorSub.unsubscribe());
```

✅ RIGHT — pipe into `withClass()`:
```typescript
const label = new LabelBuilder()
    .withCaption(name$)
    .withClass(color$.pipe(map(c => `text-[${c}]`)));
```

✅ RIGHT — combine observables with `combineLatest`:
```typescript
const class$ = combineLatest([color$, size$]).pipe(
    map(([c, s]) => `text-[${c}] text-${s}`)
);
const label = new LabelBuilder().withCaption(name$).withClass(class$);
```

The key insight: `withClass()` accepts `Observable<string>`, which means ANY observable
can be piped/mapped to produce Tailwind class strings dynamically — no manual subscriptions,
no `element.style.xxx`, no `registerDestroy` for style subscriptions.

### Tailwind: dynamic classes with withClass()

If you pipe an Observable into `withClass()` to produce Tailwind class names dynamically
(e.g., `` text-${colorName} ``), Tailwind's static content scanner cannot see these classes.
They won't be in the compiled CSS unless you:

1. Define the color in `tailwind.config.mjs` → `theme.extend.colors`
2. Add each possible class to `tailwind.config.mjs` → `safelist` as an **exact string**
   (NOT a regex — Tailwind can't validate regex against its class registry):

```javascript
safelist: [
    'text-kpi-green',
    'text-kpi-red',
],
```

Never use `text-[#hex]` or `bg-[rgba(...)]` in template literals with `withClass()` —
Tailwind cannot validate or safelist these.

### Building sub-components prematurely

Pass builder instances to `withContent()` and `addSlot().withContent()` — do NOT
call `.build()` on sub-builders and then wrap the result:

❌ WRONG — premature build + wrapper:
```typescript
const el = new LabelBuilder().withCaption(name$).build();
const wrapper = { build: () => el };
// Then: parent.withContent(wrapper)
```

✅ RIGHT — pass the builder directly:
```typescript
parent.withContent(
    new LabelBuilder().withCaption(name$)  // no .build()
);
```

`LayoutBuilder.addSlot().withContent()` and `PanelBuilder.withContent()` accept
`ComponentBuilder` instances; they call `.build()` internally at the right time.
Never call `.build()` on a builder and then construct an ad-hoc `{ build: () => el }`
wrapper — pass the builder instance directly.

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
