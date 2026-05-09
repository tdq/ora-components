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

        it('should use fully opaque bg-surface-container-low on the wrapper (header itself is transparent)', () => {
            expect(GridStyles.headerWrapper).toContain('bg-surface-container-low');
            const match = GridStyles.headerWrapper.match(/bg-surface-container-low(\/\d+)?/);
            if (match && match[1]) {
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

    // ─── actionCellDefault ─────────────────────────────────────────────────
    describe('actionCellDefault', () => {
        it('should be a single fully opaque background class', () => {
            expect(GridStyles.actionCellDefault).toBe('bg-background');
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
        it('headerGlass should be transparent so the panel glass shows through', () => {
            expect(GridStyles.headerGlass).toBe('!bg-transparent');
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
