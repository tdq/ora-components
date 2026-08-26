/**
 * GridStyles — unit tests
 *
 * Verifies that the static CSS class strings in GridStyles match the
 * specification requirements, particularly around opacity and backdrop-filter
 * usage.
 */
import { GridStyles, GRID_ROW_HEIGHT, GRID_HEADER_HEIGHT, GRID_TOOLBAR_HEIGHT_ALLOWANCE } from './grid-styles';
import * as gridPublicApi from './index';

describe('GRID_ROW_HEIGHT / GRID_HEADER_HEIGHT / GRID_TOOLBAR_HEIGHT_ALLOWANCE', () => {
    it('GRID_ROW_HEIGHT is exported as the single source of truth (52px default)', () => {
        expect(GRID_ROW_HEIGHT).toBe(52);
    });

    it('GRID_HEADER_HEIGHT is exported and independent of the row height', () => {
        expect(GRID_HEADER_HEIGHT).toBe(52);
    });

    it('GRID_TOOLBAR_HEIGHT_ALLOWANCE is exported (button height 46px + breathing room)', () => {
        expect(GRID_TOOLBAR_HEIGHT_ALLOWANCE).toBe(56);
    });

    it('all three sizing constants are re-exported from the grid public entry point', () => {
        // Consumers computing their own layout around withAutoHeight() need these from the
        // package surface, not from the internal grid-styles module.
        expect(gridPublicApi.GRID_ROW_HEIGHT).toBe(GRID_ROW_HEIGHT);
        expect(gridPublicApi.GRID_HEADER_HEIGHT).toBe(GRID_HEADER_HEIGHT);
        expect(gridPublicApi.GRID_TOOLBAR_HEIGHT_ALLOWANCE).toBe(GRID_TOOLBAR_HEIGHT_ALLOWANCE);
    });
});

describe('GridStyles', () => {
    // ─── header ────────────────────────────────────────────────────────────
    describe('header', () => {
        it('should NOT contain backdrop-blur (performance: no per-row composite layers)', () => {
            expect(GridStyles.header).not.toMatch(/backdrop-blur/);
        });

        it('should NOT contain /80 opacity suffix', () => {
            expect(GridStyles.header).not.toMatch(/\/80/);
        });

        it('should use surface-container-low colour (possibly semi-transparent via color-mix) on the wrapper', () => {
            const usesSurfaceColor =
                GridStyles.headerWrapper.includes('bg-surface-container-low') ||
                GridStyles.headerWrapper.includes('--md-sys-color-surface-container-low');
            expect(usesSurfaceColor).toBe(true);
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
