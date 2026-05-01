/**
 * GridStyles — unit tests
 *
 * Verifies that the static CSS class strings in GridStyles match the
 * specification requirements, particularly around opacity and backdrop-filter
 * usage.
 */
import { GridStyles } from './grid-styles';

describe('GridStyles', () => {
    // ─── header ────────────────────────────────────────────────────────────
    describe('header', () => {
        it('should NOT contain backdrop-blur (performance: no per-row composite layers)', () => {
            expect(GridStyles.header).not.toMatch(/backdrop-blur/);
        });

        it('should NOT contain /80 opacity suffix', () => {
            expect(GridStyles.header).not.toMatch(/\/80/);
        });

        it('should use fully opaque bg-surface-container-low', () => {
            expect(GridStyles.header).toContain('bg-surface-container-low');
            // Ensure there is no opacity modifier on the surface class
            const match = GridStyles.header.match(/bg-surface-container-low(\/\d+)?/);
            if (match && match[1]) {
                // If there is a modifier, it should not be /80
                expect(match[1]).not.toBe('/80');
            }
        });
    });

    // ─── actionHeaderCell ──────────────────────────────────────────────────
    describe('actionHeaderCell', () => {
        it('should NOT contain backdrop-blur', () => {
            expect(GridStyles.actionHeaderCell).not.toMatch(/backdrop-blur/);
        });

        it('should NOT contain /80 opacity suffix', () => {
            expect(GridStyles.actionHeaderCell).not.toMatch(/\/80/);
        });

        it('should use fully opaque bg-surface-container-low', () => {
            expect(GridStyles.actionHeaderCell).toContain('bg-surface-container-low');
            const match = GridStyles.actionHeaderCell.match(/bg-surface-container-low(\/\d+)?/);
            if (match && match[1]) {
                expect(match[1]).not.toBe('/80');
            }
        });
    });

    // ─── actionCellOdd ─────────────────────────────────────────────────────
    describe('actionCellOdd', () => {
        it('should be fully opaque (bg-surface-container-low, not /20)', () => {
            expect(GridStyles.actionCellOdd).toBe('bg-surface-container-low');
            expect(GridStyles.actionCellOdd).not.toMatch(/\/20/);
            expect(GridStyles.actionCellOdd).not.toMatch(/\/\d+/);
        });
    });

    // ─── actionCell (base) — no backdrop-blur, retains /80 opacity ────────
    describe('actionCell', () => {
        it('should NOT contain backdrop-blur (spec: per-row backdrop filters cause severe scroll lag)', () => {
            expect(GridStyles.actionCell).not.toMatch(/backdrop-blur/);
        });

        it('should contain bg-surface-container-low/80 for partial opacity on the sticky action column', () => {
            expect(GridStyles.actionCell).toContain('bg-surface-container-low/80');
        });
    });

    // ─── Glass variants — untouched ────────────────────────────────────────
    describe('glass variants', () => {
        it('headerGlass should remain unchanged', () => {
            expect(GridStyles.headerGlass).toBe('glass-effect !bg-white/20');
        });

        it('actionHeaderCellGlass should remain unchanged', () => {
            expect(GridStyles.actionHeaderCellGlass).toBe('glass-effect !bg-white/20');
        });

        it('actionCellGlass should remain unchanged', () => {
            expect(GridStyles.actionCellGlass).toBe('glass-effect !bg-white/10');
        });

        it('rowGlass should remain unchanged', () => {
            expect(GridStyles.rowGlass).toBe('hover:bg-white/10 dark:hover:bg-white/5');
        });

        it('headerGlass should NOT contain backdrop-blur', () => {
            expect(GridStyles.headerGlass).not.toMatch(/backdrop-blur/);
        });

        it('actionHeaderCellGlass should NOT contain backdrop-blur', () => {
            expect(GridStyles.actionHeaderCellGlass).not.toMatch(/backdrop-blur/);
        });

        it('actionCellGlass should NOT contain backdrop-blur', () => {
            expect(GridStyles.actionCellGlass).not.toMatch(/backdrop-blur/);
        });
    });

    // ─── Other key styles — structural smoketests ──────────────────────────
    describe('structural consistency', () => {
        it('container should exist and be a string', () => {
            expect(typeof GridStyles.container).toBe('string');
            expect(GridStyles.container.length).toBeGreaterThan(0);
        });

        it('cell should contain px-4', () => {
            expect(GridStyles.cell).toContain('px-4');
            expect(GridStyles.cell).toContain('truncate');
        });

        it('viewport should contain overflow-auto', () => {
            expect(GridStyles.viewport).toContain('overflow-auto');
        });
    });
});
