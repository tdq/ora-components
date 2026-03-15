import { PanelBuilder, LayoutBuilder, LayoutGap, LabelBuilder, LabelSize } from 'aura-components';
import { of } from 'rxjs';

/**
 * Basic Panel Example
 * Demonstrates a panel containing a vertical layout with some content.
 */
export function createPanelExample() {
  const content = new LayoutBuilder()
    .asVertical()
    .withGap(LayoutGap.MEDIUM);
    content.addSlot().withContent(new LabelBuilder().withCaption(of('Panel Title')).withSize(LabelSize.LARGE));
    content.addSlot().withContent(new LabelBuilder().withCaption(of('This is the panel content.')).withSize(LabelSize.MEDIUM));

  return new PanelBuilder()
    .withContent(content)
    .withClass(of('p-4 rounded-lg bg-surface shadow-md'));
}

/**
 * Glass Panel Example
 * Demonstrates a panel with glass effect.
 */
export function createGlassPanelExample() {
  return new PanelBuilder()
    .asGlass()
    .withClass(of('w-64 h-32 p-4 border border-white/20'));
}
