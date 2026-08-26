import { LayoutBuilder, LayoutGap, LabelBuilder, LabelSize, SlotSize, ComponentBuilder } from '@tdq/ora-components';
import { of } from 'rxjs';

// Labels
import {
    createSmallLabelExample,
    createMediumLabelExample,
    createLargeLabelExample,
    createStyledLabelExample,
    createGlassLabelExample,
    createReactiveLabelExample,
} from './components/label';

// Text Fields
import {
    createTextFieldExample,
    createOutlinedTextFieldExample,
    createPasswordTextFieldExample,
    createPrefixTextFieldExample,
    createErrorTextFieldExample,
    createDisabledTextFieldExample,
    createReactiveTextFieldExample,
    createGlassTextFieldExample,
} from './components/textfield';

// Buttons
import {
    createFilledButtonExample,
    createTonalButtonExample,
    createOutlinedButtonExample,
    createElevatedButtonExample,
    createTextButtonExample,
    createIconButtonExample,
    createDisabledButtonExample,
    createGlassButtonExample,
} from './components/button';

// Panels
import {
    createPanelExample,
    createCompactPanelExample,
    createSpacedPanelExample,
    createGlassPanelExample,
    createChartPanelExample,
} from './components/panel';

// Charts
import {
    createLineChartExample,
    createBarChartExample,
    createAreaChartExample,
    createMultiSeriesChartExample,
    createDualAxisChartExample,
    createAxisConfigExample,
    createLiveChartExample,
    createChartLegendTooltipExample,
    createGlassChartExample,
} from './components/chart';

// Grids
import {
    createBasicGridExample,
    createColumnTypesExample,
    createSortableGridExample,
    createEditableGridExample,
    createActionsGridExample,
    createMultiSelectGridExample,
    createCustomColumnGridExample,
    createReactiveGridExample,
    createGroupedGridExample,
    createAutoHeightSelectEditorGridExample,
} from './components/grid';

// Layouts
import {
    createVerticalLayoutExample,
    createHorizontalLayoutExample,
    createSlotSizesExample,
    createGapVariationsExample,
    createAlignmentExample,
    createVisibilityExample,
    createNestedLayoutExample,
    createComplexLayoutExample,
    createGrowSlotExample,
} from './components/layout';

// Dialogs
import {
    createBeforeCloseDialogExample,
    createFixedHeightDialogExample,
} from './components/dialog';

// ComboBox
import {
    createAccountPickerExample,
} from './components/combobox';

// Sidebar
import {
    createSidebarExample,
    createSidebarWithFooterMenuExample,
} from './components/sidebar';

// Chat
import {
    createChatPanelExample,
    createChatSuggestionsExample,
    createChatTriggerExample,
} from './components/chatpanel';

// ─── helpers ────────────────────────────────────────────────────────────────

function sectionHeader(title: string): LabelBuilder {
    return new LabelBuilder()
        .withCaption(of(title))
        .withSize(LabelSize.LARGE)
        .withClass(of('font-bold uppercase tracking-widest opacity-50 text-[11px] block mt-6'));
}

function row(...builders: ComponentBuilder[]): LayoutBuilder {
    const layout = new LayoutBuilder().asHorizontal().withGap(LayoutGap.MEDIUM);
    builders.forEach(b => layout.addSlot().withSize(SlotSize.FIT).withContent(b));
    return layout;
}

// ─── page ───────────────────────────────────────────────────────────────────

const app = document.getElementById('app')!;

const page = new LayoutBuilder()
    .asVertical()
    .withGap(LayoutGap.LARGE)
    .withClass(of('p-8 max-w-4xl mx-auto'));

// Labels
page.addSlot().withContent(sectionHeader('Labels'));
page.addSlot().withContent(row(
    createSmallLabelExample(),
    createMediumLabelExample(),
    createLargeLabelExample(),
));
page.addSlot().withContent(row(
    createStyledLabelExample(),
    createGlassLabelExample(),
    createReactiveLabelExample(),
));

// Text Fields
page.addSlot().withContent(sectionHeader('Text Fields'));
page.addSlot().withContent(row(
    createTextFieldExample(),
    createOutlinedTextFieldExample(),
    createPasswordTextFieldExample(),
));
page.addSlot().withContent(row(
    createPrefixTextFieldExample(),
    createErrorTextFieldExample(),
    createDisabledTextFieldExample(),
));
page.addSlot().withContent(row(
    createReactiveTextFieldExample(),
    createGlassTextFieldExample(),
));

// Buttons
page.addSlot().withContent(sectionHeader('Buttons'));
page.addSlot().withContent(row(
    createFilledButtonExample(),
    createTonalButtonExample(),
    createOutlinedButtonExample(),
    createElevatedButtonExample(),
    createTextButtonExample(),
));
page.addSlot().withContent(row(
    createIconButtonExample(),
    createDisabledButtonExample(),
    createGlassButtonExample(),
));

// Panels
page.addSlot().withContent(sectionHeader('Panels'));
page.addSlot().withContent(createPanelExample());
page.addSlot().withContent(row(
    createCompactPanelExample(),
    createSpacedPanelExample(),
));
page.addSlot().withContent(row(
    createGlassPanelExample(),
    createChartPanelExample(),
));

// Charts
page.addSlot().withContent(sectionHeader('Charts'));
page.addSlot().withContent(createLineChartExample());
page.addSlot().withContent(createBarChartExample());
page.addSlot().withContent(createAreaChartExample());
page.addSlot().withContent(createMultiSeriesChartExample());
page.addSlot().withContent(createDualAxisChartExample());
page.addSlot().withContent(createAxisConfigExample());
page.addSlot().withContent(createLiveChartExample());
page.addSlot().withContent(createChartLegendTooltipExample());
page.addSlot().withContent(createGlassChartExample());

// Grids
page.addSlot().withContent(sectionHeader('Grids'));
page.addSlot().withContent(createBasicGridExample());
page.addSlot().withContent(createColumnTypesExample());
page.addSlot().withContent(createSortableGridExample());
page.addSlot().withContent(createEditableGridExample());
page.addSlot().withContent(createActionsGridExample());
page.addSlot().withContent(createMultiSelectGridExample());
page.addSlot().withContent(createCustomColumnGridExample());
page.addSlot().withContent(createReactiveGridExample());
page.addSlot().withContent(createGroupedGridExample());
page.addSlot().withContent(createAutoHeightSelectEditorGridExample());

// Layouts
page.addSlot().withContent(sectionHeader('Layouts'));
page.addSlot().withContent(createVerticalLayoutExample());
page.addSlot().withContent(createHorizontalLayoutExample());
page.addSlot().withContent(createSlotSizesExample());
page.addSlot().withContent(createGapVariationsExample());
page.addSlot().withContent(createAlignmentExample());
page.addSlot().withContent(createVisibilityExample());
page.addSlot().withContent(createNestedLayoutExample());
page.addSlot().withContent(createComplexLayoutExample());
page.addSlot().withContent(createGrowSlotExample());

// Dialogs
page.addSlot().withContent(sectionHeader('Dialogs'));
page.addSlot().withContent(row(
    createBeforeCloseDialogExample(),
    createFixedHeightDialogExample(),
));

// ComboBox
page.addSlot().withContent(sectionHeader('ComboBox'));
page.addSlot().withContent(createAccountPickerExample());

// Sidebar
page.addSlot().withContent(sectionHeader('Sidebar'));
page.addSlot().withContent(row(
    createSidebarExample(),
    createSidebarWithFooterMenuExample(),
));

// Chat
page.addSlot().withContent(sectionHeader('Chat'));
page.addSlot().withContent(row(
    createChatPanelExample(),
    createChatTriggerExample(),
));
page.addSlot().withContent(row(
    createChatSuggestionsExample(),
));

app.appendChild(page.build());
