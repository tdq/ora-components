# Layout

## Description
Layout component is a component which is used for layout of the page. It has the following methods:
- `addSlot(): SlotBuilder` - adds new slot to the layout. It can have one child component.
- `asVertical(): this` - sets layout to vertical.
- `asHorizontal(): this` - sets layout to horizontal.
- `withGap(gap: LayoutGap): this` - sets gap between slots.
- `withClass(className: Observable<string>): this` - sets class css name of the layout.
- `withAlignment(alignment: Observable<Alignment>): this` - sets alignment of the content in the layout.

Layout omponent should have full width.

LayoutGap is an enum with values:
- `SMALL`. 4px gap
- `MEDIUM`. 8px gap
- `LARGE`. 16px gap
- `EXTRA_LARGE`. 32px gap

LayoutGap defines the gap between slots. Default value is MEDIUM.

SlotBuilder has the following methods:
- `withContent(content: ComponentBuilder): this` - sets content of the slot.
- `withSize(size: SlotSize): this` - sets size of the slot.
- `withVisible(visible: Observable<boolean>): this` - sets visibility of the slot.
- `withAlignment(alignment: Observable<Alignment>): this` - sets alignment of the content in the slot.

SlotSize is an enum with values:
- `QUARTER`. 1/4 of available space
- `THIRD`. 1/3 of available space
- `HALF`. 1/2 of available space
- `TWO_THIRDS`. 2/3 of available space
- `THREE_QUARTERS`. 3/4 of available space
- `FULL`. 1 of available space

Alignment is an enum with values:
- `LEFT`. default alignment on the left
- `RIGHT`. align content to be on the right
- `CENTER`. align content to be in center of the slot

SlotSize defines the size of the slot. Default value is calculated based on the number of slots (min QUARTER, max FULL). 
For vertical layout default slot size is not set (size of content).
Slot size can be shrinked or growed based on available space.