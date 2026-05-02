# Label

## Description
Label component is a component which is used to display a label.
It has the following methods:
- `withCaption(caption: Observable<string>): this` - sets caption of the label.
- `withSize(size: LabelSize): this` - sets size of the label.
- `withClass(className: Observable<string>): this` - sets class css name of the label.

LabelSize is an enum with the following values according to Material Design 3:
- `SMALL`
- `MEDIUM`
- `LARGE`

## Usage

```typescript
const label = new LabelBuilder()
    .withCaption(of('Hello World'))
    .withSize(LabelSize.LARGE)
    .build();
```

### Dynamic color via withClass

When a color value comes from an Observable, define it as a named theme color instead
of using arbitrary `text-[#hex]` values:

**tailwind.config.mjs:**
```javascript
theme: { extend: { colors: { 'label-accent': '#10B981' } } },
safelist: ['text-label-accent'],
```

**Builder:**
```typescript
import { map } from 'rxjs/operators';

const HEX_MAP: Record<string, string> = { '#10B981': 'label-accent' };

const color$ = of('#10B981');
const class$ = color$.pipe(map(c => `text-${HEX_MAP[c] ?? 'on-surface'}`));

const label = new LabelBuilder()
    .withCaption(of('Hello'))
    .withClass(class$)
    .build();
```

Arbitrary Tailwind values (`text-[#10B981]`) in template literals will NOT work —
Tailwind's static scanner cannot resolve interpolated class names. Always use named
theme colors with safelist instead.
