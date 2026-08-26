import {
    DialogBuilder, DialogSize,
    CheckboxBuilder, CheckboxValue,
    ButtonBuilder, ButtonStyle,
    ComponentBuilder,
    registerDestroy,
} from '@tdq/ora-components';
import { BehaviorSubject, of } from 'rxjs';
import { map } from 'rxjs/operators';

// ─── shared data ─────────────────────────────────────────────────────────────

interface DraftInvoice {
    id: string;
    customer: string;
    total: number;
}

const DRAFT_INVOICE: DraftInvoice = { id: 'INV-1042', customer: 'Northwind Traders', total: 4820.00 };

/**
 * withBeforeClose — guarded close
 *
 * `.withBeforeClose(() => boolean | Promise<boolean>)` is consulted by `close()`,
 * the native Escape (`cancel`) event, and the backdrop click. Returning `false`
 * (or a promise that resolves to `false`) cancels the close — it is fail-closed,
 * so a throwing guard also blocks the close rather than losing the user's edits.
 *
 * Here the guard blocks closing an unsaved invoice edit until the user ticks an
 * acknowledgement checkbox. `acknowledged$` is created fresh on every open (and
 * completed when that dialog instance tears down), so re-opening never starts
 * pre-ticked from a previous session.
 */
export function createBeforeCloseDialogExample(): ComponentBuilder {
    return {
        build(): HTMLElement {
            const openDialog = () => {
                const acknowledged$ = new BehaviorSubject<CheckboxValue>(false);

                const checkboxEl = new CheckboxBuilder()
                    .withCaption(of('Discard unsaved changes to this invoice'))
                    .withValue(acknowledged$)
                    .build();
                registerDestroy(checkboxEl, () => acknowledged$.complete());

                const dialog = new DialogBuilder()
                    .withCaption(of(`Close ${DRAFT_INVOICE.id}?`))
                    .withDescription(of(`${DRAFT_INVOICE.customer} — unsaved edits will be lost.`))
                    .withSize(DialogSize.SMALL)
                    .withContent({ build: () => checkboxEl })
                    .withBeforeClose(() => acknowledged$.value === true);

                dialog.withToolbar()
                    .withPrimaryButton()
                    .withCaption(of('Close'))
                    .withClick(() => dialog.close());

                dialog.show();
            };

            return new ButtonBuilder()
                .withCaption(of(`Edit ${DRAFT_INVOICE.id}`))
                .withStyle(of(ButtonStyle.TONAL))
                .withClick(openDialog)
                .build();
        },
    };
}

/**
 * withFixedHeight — constant-height wizard
 *
 * `.withFixedHeight(Observable<number>)` pins the dialog to an exact pixel
 * height (clamped to 90vh) with the toolbar staying fixed while the content
 * area scrolls internally — use it whenever step content differs in length
 * so the dialog doesn't jump between steps.
 *
 * `step$` is created fresh on every open (and completed when that dialog
 * instance tears down), so re-opening the wizard always starts at step 1.
 */
export function createFixedHeightDialogExample(): ComponentBuilder {
    return {
        build(): HTMLElement {
            const TOTAL_STEPS = 3;
            const stepTitles = ['Payee & amount', 'Cost center', 'Review & submit'];

            const openDialog = () => {
                const step$ = new BehaviorSubject(1);

                const body = document.createElement('div');
                body.className = 'text-body-medium';

                // A dedicated text node so registerDestroy's lifecycle-boundary child (inserted
                // as a sibling of this node below) is never wiped: `body.textContent = …` would
                // clear ALL of body's children, including the boundary, before it ever connects
                // to the DOM — silently disabling the teardown and leaking `step$` on every open.
                const stepText = document.createElement('span');
                body.appendChild(stepText);
                registerDestroy(body, () => step$.complete());

                const renderStep = () => {
                    stepText.textContent = `Step ${step$.value} of ${TOTAL_STEPS}: ${stepTitles[step$.value - 1]}`;
                };
                renderStep();

                const dialog = new DialogBuilder()
                    .withCaption(of('New Expense'))
                    .withDescription(of('withFixedHeight(of(320)) keeps the dialog the same height across every step.'))
                    .withSize(DialogSize.MEDIUM)
                    .withFixedHeight(of(320))
                    .withContent({ build: () => body });

                const toolbar = dialog.withToolbar();
                toolbar.addSecondaryButton()
                    .withCaption(of('Back'))
                    .withClick(() => {
                        if (step$.value > 1) {
                            step$.next(step$.value - 1);
                            renderStep();
                        }
                    });
                toolbar.withPrimaryButton()
                    .withCaption(step$.pipe(map(s => s === TOTAL_STEPS ? 'Submit' : 'Next')))
                    .withClick(() => {
                        if (step$.value < TOTAL_STEPS) {
                            step$.next(step$.value + 1);
                            renderStep();
                        } else {
                            dialog.close();
                        }
                    });

                dialog.show();
            };

            return new ButtonBuilder()
                .withCaption(of('New Expense'))
                .withStyle(of(ButtonStyle.FILLED))
                .withClick(openDialog)
                .build();
        },
    };
}
