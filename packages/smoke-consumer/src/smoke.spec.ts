import { test, expect } from '@playwright/test';

// Consumes the *packed* @tdq/ora-components tarball (installed by `npm run
// smoke` from the root, see ../scripts/prepare.mjs and ../package.json) — the
// only place in the repo that exercises the published dist output rather than
// source aliased in by packages/examples. See docs/superpowers/plans/
// 2026-09-02-bakeoff-findings-fixes.md Task 2 for the defects this guards
// against (shipped CSS globals, virtualization, router outlet sizing,
// dialog toolbar placement), and Task 5 Step 7 for the `withTestId` selectors.

test('ora shell renders cleanly from the packed tarball', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(String(err)));

    await page.goto('/');
    await page.waitForSelector('[data-testid="grid"]');

    // 1. No console errors and no leaked global body rule (Task 1 regression guard —
    //    the library must not ship a `body { display: flex; place-items: center;
    //    min-width: 320px; min-height: 100vh }` dev-page reset).
    //    This mirrors the property list scripts/check-css-globals.mjs forbids on
    //    body/html/:root/#app/#root, but from the other end: that script proves the
    //    declarations are absent from the shipped stylesheet *text*, this proves that
    //    nothing in the packaged CSS actually applies them to a real consumer's page.
    //    index.html + app.css set nothing on `body`, so every value below is whatever
    //    the library (plus its Preflight) computed — any non-initial one is a leak.
    expect(consoleErrors).toEqual([]);
    const bodyStyle = await page.evaluate(() => {
        const s = getComputedStyle(document.body);
        return {
            display: s.display,
            placeItems: s.placeItems,
            alignItems: s.alignItems,
            justifyContent: s.justifyContent,
            minWidth: s.minWidth,
            minHeight: s.minHeight,
        };
    });
    expect(bodyStyle.display).toBe('block');
    // `place-items: center` is the shorthand the leaked reset used. Its computed value
    // is the resolved `<align> <justify>` pair ("normal"/"normal legacy" when unset),
    // so assert that no part of it centers the page, and check the longhands too — a
    // reset written as `align-items`/`justify-content` is the same defect.
    expect(bodyStyle.placeItems).not.toContain('center');
    expect(bodyStyle.alignItems).not.toBe('center');
    expect(bodyStyle.justifyContent).not.toBe('center');
    // `min-width: 320px` / `min-height: 100vh`. getComputedStyle resolves lengths to
    // px — `100vh` comes back as e.g. "720px", never the literal "100vh" — so the
    // literal strings cannot be compared; parse instead. An unconstrained body
    // computes to `auto`/`0px` (parseFloat → NaN/0), and check-css-globals.mjs forbids
    // min-width/min-height on body outright, so anything non-zero here is the defect.
    expect(parseFloat(bodyStyle.minWidth) || 0).toBe(0);
    expect(parseFloat(bodyStyle.minHeight) || 0).toBe(0);

    // 2. The sidebar is a real `<nav>` landmark, not a decorative div
    //    (sidebar-viewport.ts buildSidebarViewport). Asserted through the packed
    //    tarball because the tag is part of the published DOM contract consumers
    //    rely on for landmark navigation, and `withTestId` puts the id on the host.
    const sidebar = page.locator('[data-testid="nav"]');
    await expect(sidebar).toBeVisible();
    const sidebarTag = await sidebar.evaluate((el) => el.tagName.toLowerCase());
    expect(sidebarTag).toBe('nav');

    // 3. Grid virtualization: 1 000 rows, far fewer than 100 row nodes rendered.
    // `role="row"` is set on both the header row (grid-header.ts) and every data row
    // (grid-row.ts), so it alone would let a regression that renders zero data rows
    // pass (the header satisfies `> 0`). Scope to rows containing a `[role="gridcell"]`
    // — only data rows have cells with that role, header cells are `columnheader` —
    // and assert a floor: the test viewport (~640px content height / 52px rows) must
    // render a full screen of real rows, not just survive on the header.
    // The floor is 10, not 5: grid-viewport.ts renders `buffer = 5` extra rows on each
    // side of the visible window, so a *collapsed* grid (viewportHeight 0 — exactly the
    // outlet-height defect assertion 4 guards) still emits rows 0..5, i.e. 6 nodes. Any
    // floor at or below 6 would therefore pass on a zero-height grid and prove nothing;
    // 10 can only be met by a viewport with real height. A 1280x720 Playwright viewport
    // fits ~11 rows + 5 buffer, so this leaves comfortable headroom.
    const dataRowCount = await page.locator('[data-testid="grid"] [role="row"]:has([role="gridcell"])').count();
    expect(dataRowCount).toBeGreaterThanOrEqual(10);
    expect(dataRowCount).toBeLessThan(100);

    // 4. Router outlet has real, non-zero height (Task 2's outlet-height regression).
    const outlet = page.locator('[data-testid="outlet"]');
    const outletHeight = await outlet.evaluate((el) => el.getBoundingClientRect().height);
    expect(outletHeight).toBeGreaterThan(0);

    // 5. Router swaps outlet content: clicking the settings nav item replaces the
    // grid page with the settings page inside the same outlet, and navigating back
    // to the ledger route restores the grid (deferred S2 QA assertion, plan Task 5
    // Step 7).
    await page.locator('[data-testid="nav-settings"]').click();
    await expect(outlet.locator('[data-testid="settings-page"]')).toBeVisible();

    await page.locator('[data-testid="nav-ledger"]').click();
    await expect(outlet.locator('[data-testid="grid"]')).toBeVisible();

    // 6. Dialog: toolbar buttons are visible and sit below the content container.
    // Located structurally (dialog.ts always appends header, then content, then the
    // toolbar wrapper last, when a toolbar is configured) rather than via internal
    // Tailwind classes, which would break on a harmless restyle.
    await page.locator('[data-testid="nav-open-dialog"]').click();
    const dialogEl = page.locator('[data-testid="entry-dialog"]');
    await expect(dialogEl).toBeVisible();

    const saveButton = dialogEl.locator('[data-testid="dialog-save"]');
    const cancelButton = dialogEl.locator('[data-testid="dialog-cancel"]');
    await expect(saveButton).toBeVisible();
    await expect(cancelButton).toBeVisible();

    // Located via the save button's own container, not by index arithmetic (a prior
    // `nth(childCount - 2)` approach breaks the moment an optional header slot like the
    // description is added or removed, silently shifting which child is "content").
    // `> *:has([data-testid="dialog-save"])` finds the one direct child of the dialog
    // that contains the save button — the toolbar wrapper — however deep the button
    // itself sits inside it. `ora-lifecycle-boundary` is a zero-size marker element the
    // library appends for teardown bookkeeping (see reactive.md / sidebar.md's DOM
    // contract), not a visual container, so it is skipped when walking to the toolbar's
    // preceding sibling for the content box.
    const toolbarContainer = dialogEl.locator('> *:has([data-testid="dialog-save"])');
    const toolbarBox = await toolbarContainer.boundingBox();
    const contentBox = await toolbarContainer.evaluate((el) => {
        let sibling = el.previousElementSibling;
        while (sibling && sibling.tagName.toLowerCase() === 'ora-lifecycle-boundary') {
            sibling = sibling.previousElementSibling;
        }
        return sibling ? sibling.getBoundingClientRect().toJSON() : null;
    });
    expect(contentBox).not.toBeNull();
    expect(toolbarBox).not.toBeNull();
    expect(toolbarBox!.y).toBeGreaterThanOrEqual(contentBox!.y + contentBox!.height - 1);

    const saveBox = await saveButton.boundingBox();
    expect(saveBox).not.toBeNull();
    expect(saveBox!.y).toBeGreaterThanOrEqual(contentBox!.y + contentBox!.height - 1);

    await cancelButton.click();
    await expect(dialogEl).toBeHidden();

    // 7. Still no console errors after the settings/ledger navigation and the dialog
    // open/close round trip — not just on initial load (a leak or a listener error on
    // teardown would only show up here).
    expect(consoleErrors).toEqual([]);
});

test('ora theming contract: CSS variables drive colours, fonts, and component styling (Task 8 Step 7)', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForSelector('[data-testid="grid-ledger"]');

    const getThemeValues = async () => {
        return await page.evaluate(() => {
            const root = document.documentElement;
            const body = document.body;

            // Find header wrapper by selector: sticky top-0 within grid
            const getHeaderBg = (gridTestId: string) => {
                const grid = document.querySelector(`[data-testid="${gridTestId}"]`);
                if (!grid) return null;
                // headerWrapper: 'flex-none sticky top-0 z-30 w-full bg-[var(--ora-grid-header-bg)] overflow-hidden'
                const header = grid.querySelector('.sticky.top-0');
                return header ? getComputedStyle(header).backgroundColor : null;
            };

            return {
                primaryColorVar: getComputedStyle(root).getPropertyValue('--md-sys-color-primary').trim(),
                fontFamily: getComputedStyle(body).fontFamily,
                defaultHeaderBg: getHeaderBg('grid'),
                ledgerHeaderBg: getHeaderBg('grid-ledger'),
            };
        });
    };

    // 1. Light theme — verify primary color override (case-insensitive hex comparison)
    let values = await getThemeValues();
    expect(values.primaryColorVar.toUpperCase()).toBe('#0F766E');
    // The color should compute to rgb(15, 118, 110)
    const lightPrimaryMatch = await page.evaluate(() => {
        const root = document.documentElement;
        const style = getComputedStyle(root);
        const primaryVar = style.getPropertyValue('--md-sys-color-primary').trim().toUpperCase();
        // Parse hex to RGB: #0F766E = rgb(15, 118, 110)
        return primaryVar === '#0F766E' ? 'rgb(15, 118, 110)' : 'mismatch';
    });
    expect(lightPrimaryMatch).toBe('rgb(15, 118, 110)');

    // 2. Light theme — verify font family is applied
    values = await getThemeValues();
    expect(values.fontFamily).toContain('IBM Plex Sans');

    // 3. Light theme — verify both grids have different header backgrounds, and the
    //    default grid (without .ledger-grid) shows the global recipe colour, proving
    //    the per-instance override via .ledger-grid is scoped to class only (negative
    //    control: if .ledger-grid was global, both grids would be identical).
    values = await getThemeValues();
    expect(values.defaultHeaderBg).toBeTruthy();
    expect(values.ledgerHeaderBg).toBeTruthy();
    // Negative control: default grid (no override) differs from ledger-grid (with override)
    expect(values.defaultHeaderBg).not.toBe(values.ledgerHeaderBg);

    // 4. Toggle to dark theme and verify changes
    await page.locator('[data-testid="toggle-theme-dark"]').click();
    await page.waitForTimeout(100); // Allow CSS to update

    // Dark theme — verify primary color changed (case-insensitive hex comparison)
    const darkValues = await getThemeValues();
    expect(darkValues.primaryColorVar.toUpperCase()).toBe('#5EEAD4');
    // The color should compute to rgb(94, 234, 212)
    const darkPrimaryMatch = await page.evaluate(() => {
        const root = document.documentElement;
        const style = getComputedStyle(root);
        const primaryVar = style.getPropertyValue('--md-sys-color-primary').trim().toUpperCase();
        return primaryVar === '#5EEAD4' ? 'rgb(94, 234, 212)' : 'mismatch';
    });
    expect(darkPrimaryMatch).toBe('rgb(94, 234, 212)');

    // Dark theme — font family persists
    expect(darkValues.fontFamily).toContain('IBM Plex Sans');

    // Dark theme — grid headers still differ from each other
    expect(darkValues.defaultHeaderBg).toBeTruthy();
    expect(darkValues.ledgerHeaderBg).toBeTruthy();
    expect(darkValues.defaultHeaderBg).not.toBe(darkValues.ledgerHeaderBg);

    // 5. Toggle back to light and verify round trip (case-insensitive hex comparison)
    await page.locator('[data-testid="toggle-theme-light"]').click();
    await page.waitForTimeout(100);

    const lightAgain = await getThemeValues();
    expect(lightAgain.primaryColorVar.toUpperCase()).toBe('#0F766E');
    expect(lightAgain.fontFamily).toContain('IBM Plex Sans');
    expect(lightAgain.defaultHeaderBg).toBeTruthy();
    expect(lightAgain.ledgerHeaderBg).toBeTruthy();
    expect(lightAgain.defaultHeaderBg).not.toBe(lightAgain.ledgerHeaderBg);
});
