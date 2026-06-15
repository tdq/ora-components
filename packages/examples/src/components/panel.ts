import { PanelBuilder, PanelGap, LayoutBuilder, LayoutGap, LabelBuilder, LabelSize } from '@tdq/ora-components';
import { of } from 'rxjs';

/**
 * Default panel — surface card with MEDIUM internal gap.
 * Wrap any LayoutBuilder or ComponentBuilder as content.
 * PanelGap controls spacing between the panel border and its content,
 * not spacing between child elements (that's LayoutGap inside the content).
 */
export function createPanelExample() {
    const content = new LayoutBuilder().asVertical().withGap(LayoutGap.MEDIUM);
    content.addSlot().withContent(
        new LabelBuilder().withCaption(of('Panel Title')).withSize(LabelSize.LARGE)
    );
    content.addSlot().withContent(
        new LabelBuilder().withCaption(of('Panel body text goes here.'))
    );

    return new PanelBuilder().withContent(content);
}

/**
 * SMALL gap — compact panels for dense UIs: data tables, form sections,
 * inline cards where visual space is at a premium.
 */
export function createCompactPanelExample() {
    const content = new LayoutBuilder().asVertical().withGap(LayoutGap.SMALL);
    content.addSlot().withContent(
        new LabelBuilder().withCaption(of('Compact Panel')).withSize(LabelSize.MEDIUM)
    );
    content.addSlot().withContent(
        new LabelBuilder().withCaption(of('Tight spacing.')).withSize(LabelSize.SMALL)
    );

    return new PanelBuilder()
        .withGap(PanelGap.SMALL)
        .withContent(content);
}

/**
 * LARGE gap — spacious cards for KPI tiles, feature cards, hero stats.
 * The extra padding improves scannability for high-value numbers.
 */
export function createSpacedPanelExample() {
    const content = new LayoutBuilder().asVertical().withGap(LayoutGap.MEDIUM);
    content.addSlot().withContent(
        new LabelBuilder().withCaption(of('Revenue')).withSize(LabelSize.SMALL)
    );
    content.addSlot().withContent(
        new LabelBuilder()
            .withCaption(of('$48,291'))
            .withClass(of('text-[28px] font-bold tabular-nums'))
    );

    return new PanelBuilder()
        .withGap(PanelGap.LARGE)
        .withContent(content);
}

/**
 * Glass panel — frosted translucent card.
 * Use over gradient, image, or dark-themed backgrounds.
 * `.asGlass()` optionally accepts a boolean for conditional glass toggling.
 */
export function createGlassPanelExample() {
    return new PanelBuilder()
        .asGlass()
        .withContent(
            new LabelBuilder().withCaption(of('Glass Panel')).withSize(LabelSize.MEDIUM)
        )
        .withClass(of('w-64 h-24'));
}

/**
 * Chart panel — ChartBuilder has `.withHeight(px)` to set explicit height,
 * so no special panel sizing is needed. Just wrap the chart in a panel normally.
 * Omit `.withHeight()` to let the chart fill its container via 100%.
 */
export function createChartPanelExample() {
    return new PanelBuilder()
        .withContent(
            new LabelBuilder()
                .withCaption(of('Wrap a ChartBuilder here — use .withHeight(400) on the chart'))
                .withSize(LabelSize.SMALL)
        )
        .withGap(PanelGap.LARGE);
}
