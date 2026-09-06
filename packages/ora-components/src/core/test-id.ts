/**
 * Sets `data-testid` on `el`; a null/empty id is a no-op.
 *
 * Static string only — test ids never change at runtime, so this is called once at the
 * end of `build()`, never from inside a subscription.
 */
export function applyTestId(el: HTMLElement, testId: string | undefined | null): void {
    if (!testId) return;
    el.setAttribute('data-testid', testId);
}
