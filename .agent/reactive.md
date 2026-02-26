# Reactive state management

## Description
State management is done by using RxJS.
Components which are subscribing to any observable should unscribe from it when the component is destroyed.
Use registerDestroy function to register the subscription for unsubscription ('@/core/destroyable-element' module).

## Example of subscription
```typescript
import { registerDestroy } from '@/core/destroyable-element';

const sub = this.caption$.subscribe(caption => {
    label.textContent = caption;
});

registerDestroy(label, () => {
    sub.unsubscribe();
});
```