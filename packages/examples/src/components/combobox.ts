import {
    ComboBoxBuilder,
    ButtonBuilder, ButtonStyle,
    LayoutBuilder, LayoutGap, SlotSize,
    ComponentBuilder,
    registerDestroy,
} from '@tdq/ora-components';
import { BehaviorSubject, of } from 'rxjs';

// ─── shared data ─────────────────────────────────────────────────────────────

interface Account {
    code: string;
    name: string;
}

const ACCOUNTS: Account[] = [
    { code: '1000', name: 'Cash and Cash Equivalents' },
    { code: '1100', name: 'Accounts Receivable' },
    { code: '1200', name: 'Inventory' },
    { code: '2000', name: 'Accounts Payable' },
    { code: '3000', name: 'Retained Earnings' },
    { code: '4000', name: 'Sales Revenue' },
    { code: '5000', name: 'Cost of Goods Sold' },
    { code: '6000', name: 'Operating Expenses' },
    { code: '6100', name: 'Payroll Expenses' },
    { code: '6200', name: 'Office Rent' },
];

/**
 * withMaxHeight + select() — bounded dropdown, programmatic selection
 *
 * `.withMaxHeight(px)` sets the *preferred* dropdown height; it is clamped
 * to whatever space is actually available above/below the anchor, so the
 * popup never gets clipped near the bottom of the viewport.
 *
 * `build()` returns a `ComboBoxElement<ITEM>` — the container plus a small
 * imperative API (`select`, `open`, `close`) for driving the ComboBox from
 * outside code, e.g. a "clear" action or a default-selection button.
 */
export function createAccountPickerExample(): ComponentBuilder {
    return {
        build(): HTMLElement {
            const value$ = new BehaviorSubject<Account | null>(null);

            const combobox = new ComboBoxBuilder<Account>()
                .withCaption(of('Ledger account'))
                .withItems(of(ACCOUNTS))
                .withItemIdProvider(a => a.code)
                .withItemCaptionProvider(a => `${a.code} · ${a.name}`)
                .withValue(value$)
                .withMaxHeight(200);  // preferred; clamped to available viewport space

            const comboEl = combobox.build();

            const defaultBtn = new ButtonBuilder()
                .withCaption(of('Default to Cash (1000)'))
                .withStyle(of(ButtonStyle.TEXT))
                .withClick(() => comboEl.select(ACCOUNTS[0]))  // programmatic select — no click on the option needed
                .build();

            const layout = new LayoutBuilder().asVertical().withGap(LayoutGap.SMALL);
            layout.addSlot().withSize(SlotSize.FIT).withContent({ build: () => comboEl });
            layout.addSlot().withSize(SlotSize.FIT).withContent({ build: () => defaultBtn });

            const element = layout.build();
            registerDestroy(element, () => value$.complete());
            return element;
        },
    };
}
