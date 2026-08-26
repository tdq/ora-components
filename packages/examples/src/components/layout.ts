import {
    LayoutBuilder, LayoutGap, SlotSize, Alignment,
    PanelBuilder, PanelGap,
    LabelBuilder, LabelSize,
    ButtonBuilder, ButtonStyle,
    ComponentBuilder,
    registerDestroy,
} from '@tdq/ora-components';
import { BehaviorSubject, of } from 'rxjs';
import { map } from 'rxjs/operators';

// Utility: a labeled surface box that makes layout structure visible in demos.
// Not part of the public API — used here to give each slot visible content.
function box(label: string, extraClass = ''): PanelBuilder {
    return new PanelBuilder()
        .withContent(
            new LabelBuilder()
                .withCaption(of(label))
                .withSize(LabelSize.SMALL)
                .withClass(of('text-center w-full block'))
        )
        .withGap(PanelGap.SMALL)
        .withClass(of(extraClass));
}

// Utility: wraps a layout in a titled section for self-documenting visual output.
function section(title: string, content: ComponentBuilder): LayoutBuilder {
    const wrapper = new LayoutBuilder().asVertical().withGap(LayoutGap.SMALL);
    wrapper.addSlot().withContent(
        new LabelBuilder()
            .withCaption(of(title))
            .withSize(LabelSize.LARGE)
    );
    wrapper.addSlot().withContent(content);
    return wrapper;
}

/**
 * Vertical Layout
 *
 * `.asVertical()` stacks slots top-to-bottom; each slot spans full width.
 * This is the default shape for a page, modal body, or card content area.
 *
 * When to use: any time content should flow downward — forms, pages, lists.
 */
export function createVerticalLayoutExample(): LayoutBuilder {
    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.MEDIUM);

    layout.addSlot().withContent(box('Slot 1'));
    layout.addSlot().withContent(box('Slot 2'));
    layout.addSlot().withContent(box('Slot 3'));

    return section('Vertical Layout', layout);
}

/**
 * Horizontal Layout
 *
 * `.asHorizontal()` places slots side-by-side in a row (flex-row).
 * Without an explicit SlotSize, every slot shares space equally (flex-1).
 *
 * When to use: toolbars, stat rows, split views, KPI card rows.
 */
export function createHorizontalLayoutExample(): LayoutBuilder {
    const layout = new LayoutBuilder()
        .asHorizontal()
        .withGap(LayoutGap.MEDIUM);

    layout.addSlot().withContent(box('Left'));
    layout.addSlot().withContent(box('Center'));
    layout.addSlot().withContent(box('Right'));

    return section('Horizontal Layout — equal slots', layout);
}

/**
 * Slot Sizes
 *
 * `.withSize(SlotSize.X)` controls how much of the row a slot occupies.
 *
 * QUARTER     = 25%  — narrow sidebar, small stat card
 * THIRD       = 33%  — three-column grid
 * HALF        = 50%  — two-column split
 * TWO_THIRDS  = 66%  — chart + narrow aside
 * THREE_QUARTERS = 75% — wide main + small sidebar
 * FULL        = 100% — slot spans the entire row
 * FIT         = shrinks to content width (flex-none), rest fills around it
 *
 * Omitting withSize() on a horizontal slot gives it flex-1 (equal sharing).
 */
export function createSlotSizesExample(): LayoutBuilder {
    const wrapper = new LayoutBuilder().asVertical().withGap(LayoutGap.SMALL);

    const sizes: Array<[SlotSize, string]> = [
        [SlotSize.QUARTER,       'QUARTER (25%)'],
        [SlotSize.THIRD,         'THIRD (33%)'],
        [SlotSize.HALF,          'HALF (50%)'],
        [SlotSize.TWO_THIRDS,    'TWO_THIRDS (66%)'],
        [SlotSize.THREE_QUARTERS,'THREE_QUARTERS (75%)'],
        [SlotSize.FULL,          'FULL (100%)'],
    ];

    for (const [size, label] of sizes) {
        const row = new LayoutBuilder().asHorizontal().withGap(LayoutGap.SMALL);
        row.addSlot().withSize(size).withContent(box(label));
        wrapper.addSlot().withContent(row);
    }

    // FIT: the slot collapses to its content; sibling slots absorb the rest.
    // Use FIT for icons, badges, buttons that must not stretch.
    const fitRow = new LayoutBuilder().asHorizontal().withGap(LayoutGap.SMALL);
    fitRow.addSlot().withSize(SlotSize.FIT).withContent(box('FIT — content width'));
    fitRow.addSlot().withContent(box('fills remaining space (flex-1)'));
    wrapper.addSlot().withContent(fitRow);

    return section('Slot Sizes', wrapper);
}

/**
 * Gap Variations
 *
 * `.withGap(LayoutGap.X)` sets space between slots.
 *
 * NONE        =  0px — used when panels provide their own padding
 * SMALL       =  4px — compact toolbars, tight chip rows
 * MEDIUM      =  8px — standard form fields, default
 * LARGE       = 16px — card rows, section separation
 * EXTRA_LARGE = 32px — page-level section breathing room
 */
export function createGapVariationsExample(): LayoutBuilder {
    const wrapper = new LayoutBuilder().asVertical().withGap(LayoutGap.LARGE);

    const gaps: Array<[LayoutGap, string]> = [
        [LayoutGap.NONE,        'NONE (0px)'],
        [LayoutGap.SMALL,       'SMALL (4px)'],
        [LayoutGap.MEDIUM,      'MEDIUM (8px)'],
        [LayoutGap.LARGE,       'LARGE (16px)'],
        [LayoutGap.EXTRA_LARGE, 'EXTRA_LARGE (32px)'],
    ];

    for (const [gap, label] of gaps) {
        const row = new LayoutBuilder().asHorizontal().withGap(gap);
        row.addSlot().withContent(box(`gap: ${label}`));
        row.addSlot().withContent(box('B'));
        row.addSlot().withContent(box('C'));
        wrapper.addSlot().withContent(row);
    }

    return section('Gap Variations', wrapper);
}

/**
 * Alignment
 *
 * `.withAlignment(of(Alignment.X))` aligns slots along the cross-axis.
 * On a horizontal layout this controls vertical centering within the row.
 * Use `.withAlignment()` on a slot to override alignment for just that slot.
 *
 * LEFT   = justify-start  — default, slots start at the leading edge
 * CENTER = justify-center — slots cluster in the middle
 * RIGHT  = justify-end    — slots pushed to the trailing edge
 */
export function createAlignmentExample(): LayoutBuilder {
    const wrapper = new LayoutBuilder().asVertical().withGap(LayoutGap.MEDIUM);

    const alignments: Array<[Alignment, string]> = [
        [Alignment.LEFT,   'LEFT'],
        [Alignment.CENTER, 'CENTER'],
        [Alignment.RIGHT,  'RIGHT'],
    ];

    for (const [align, label] of alignments) {
        const row = new LayoutBuilder()
            .asHorizontal()
            .withGap(LayoutGap.MEDIUM)
            .withAlignment(of(align))
            .withClass(of('min-h-[56px] rounded border border-dashed border-surface-variant'));
        row.addSlot().withSize(SlotSize.FIT).withContent(box(label));
        wrapper.addSlot().withContent(row);
    }

    return section('Alignment', wrapper);
}

/**
 * Slot Visibility
 *
 * `.withVisible(observable<boolean>)` reactively shows/hides a slot.
 * The DOM node is kept; only `display` is toggled — no re-renders.
 *
 * Pattern: wire a BehaviorSubject so any code (button click, route param,
 * form state) can toggle the slot without rebuilding the layout.
 */
export function createVisibilityExample(): ComponentBuilder {
    const visible$ = new BehaviorSubject(true);

    return {
        build(): HTMLElement {
            const layout = new LayoutBuilder().asVertical().withGap(LayoutGap.MEDIUM);

            const toggleBtn = new ButtonBuilder()
                .withCaption(visible$.pipe(map(v => v ? 'Hide Panel' : 'Show Panel')))
                .withStyle(of(ButtonStyle.TONAL))
                .withClick(() => visible$.next(!visible$.value));

            const controls = new LayoutBuilder().asHorizontal().withGap(LayoutGap.SMALL);
            controls.addSlot().withSize(SlotSize.FIT).withContent(toggleBtn);
            layout.addSlot().withContent(controls);

            layout
                .addSlot()
                .withVisible(visible$.asObservable())
                .withContent(box('This slot is conditionally visible'));

            const wrapper = section('Slot Visibility (withVisible)', layout);
            const element = wrapper.build();

            // Clean up the BehaviorSubject when the element leaves the DOM
            registerDestroy(element, () => visible$.complete());
            return element;
        },
    };
}

/**
 * GROW Slot — fill remaining height
 *
 * `.withSize(SlotSize.GROW)` absorbs all leftover space along the layout's
 * main axis, so a scrollable child (grid, list, chart) fills the remaining
 * height instead of overflowing the page. In a vertical layout the GROW
 * slot gets `flex-1 min-h-0` and the container gets `h-full min-h-0` — the
 * `min-h-0` is what lets the nested scroll container actually scroll instead
 * of pushing the page taller.
 *
 * Use it for the classic "fixed header + scrollable body" shell: a toolbar
 * slot sized FIT, a GROW slot holding a tall list, and nothing below it.
 */
export function createGrowSlotExample(): ComponentBuilder {
    return {
        build(): HTMLElement {
            // rounded/p-2 exist in the shipped stylesheet; the fixed demo height and
            // border are set as inline styles since packages/examples isn't scanned by
            // ora-components' Tailwind content globs — a class not already referenced
            // from ora-components/src or packages/stories won't be in dist/ora-components.css.
            const shell = new LayoutBuilder()
                .asVertical()
                .withGap(LayoutGap.SMALL)
                .withClass(of('rounded p-2'));

            shell.addSlot().withSize(SlotSize.FIT).withContent(box('Toolbar (FIT — content height)'));

            const scrollArea = new LayoutBuilder()
                .asVertical()
                .withGap(LayoutGap.SMALL)
                .withClass(of('overflow-y-auto'));
            for (let i = 1; i <= 12; i++) {
                scrollArea.addSlot().withSize(SlotSize.FIT).withContent(box(`Row ${i}`));
            }
            shell.addSlot().withSize(SlotSize.GROW).withContent(scrollArea);

            const shellEl = shell.build();
            shellEl.style.height = '240px';
            // `--md-sys-color-outline` is the theme token actually defined in index-base.css
            // (there is no `-outline-variant` token), so the border follows light/dark theme.
            shellEl.style.border = '1px dashed var(--md-sys-color-outline)';

            return section('GROW Slot — scrollable body fills remaining height', { build: () => shellEl }).build();
        },
    };
}

/**
 * Nested Layouts — App Shell Pattern
 *
 * The standard sidebar + content split used in dashboards and admin apps.
 *
 * Outer layout: horizontal, gap NONE (panels provide their own padding)
 *   Left slot: FIT  — sidebar never grows or shrinks beyond its content width
 *   Right slot: FULL — content area expands to fill every remaining pixel
 *
 * Inside the content area, nest a vertical layout for header + body sections.
 * This mirrors how createDashboardDemo() in the landing page demo is built.
 */
export function createNestedLayoutExample(): LayoutBuilder {
    const root = new LayoutBuilder()
        .asHorizontal()
        .withGap(LayoutGap.NONE)
        .withClass(of('min-h-[280px]'));

    // Sidebar — FIT: width is determined by content (set via withClass or content intrinsic size)
    const sidebar = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.SMALL)
        .withClass(of('w-40 p-3'));
    sidebar.addSlot().withContent(box('Nav Item 1'));
    sidebar.addSlot().withContent(box('Nav Item 2'));
    sidebar.addSlot().withContent(box('Nav Item 3'));
    root.addSlot().withSize(SlotSize.FIT).withContent(sidebar);

    // Main content — FULL: stretches to fill all remaining width
    const main = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.MEDIUM)
        .withClass(of('flex-1 p-3'));

    // Header row: title grows, action button stays at its natural size
    const header = new LayoutBuilder().asHorizontal().withGap(LayoutGap.MEDIUM);
    header.addSlot().withContent(box('Page Title'));
    header.addSlot().withSize(SlotSize.FIT).withContent(box('+ New'));
    main.addSlot().withContent(header);

    // Body: two-column split — chart on the left, feed on the right
    const body = new LayoutBuilder().asHorizontal().withGap(LayoutGap.MEDIUM);
    body.addSlot().withSize(SlotSize.TWO_THIRDS).withContent(box('Chart'));
    body.addSlot().withSize(SlotSize.THIRD).withContent(box('Feed'));
    main.addSlot().withContent(body);

    root.addSlot().withSize(SlotSize.FULL).withContent(main);

    return section('Nested Layouts — App Shell Pattern', root);
}

/**
 * Complex Layout — Dashboard Page Structure
 *
 * Typical read-heavy dashboard page:
 *   Row 1: four equal KPI cards (flex-1 each — no explicit size needed)
 *   Row 2: chart panel (TWO_THIRDS) + activity feed (THIRD)
 *
 * This pattern appears in most analytics, finance, and operations dashboards.
 * Use LARGE gap between rows for visual separation; MEDIUM within rows.
 */
export function createComplexLayoutExample(): LayoutBuilder {
    const page = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.LARGE);

    // KPI row: equal slots, no size annotation needed
    const kpiRow = new LayoutBuilder().asHorizontal().withGap(LayoutGap.MEDIUM);
    ['Revenue', 'Active Users', 'Orders', 'Conversion'].forEach(label =>
        kpiRow.addSlot().withContent(box(label))
    );
    page.addSlot().withContent(kpiRow);

    // Main row: chart dominates, activity panel is narrower
    const mainRow = new LayoutBuilder().asHorizontal().withGap(LayoutGap.MEDIUM);
    mainRow.addSlot().withSize(SlotSize.TWO_THIRDS).withContent(box('Sales Chart'));
    mainRow.addSlot().withSize(SlotSize.THIRD).withContent(box('Recent Activity'));
    page.addSlot().withContent(mainRow);

    return section('Complex Layout — Dashboard Page', page);
}
