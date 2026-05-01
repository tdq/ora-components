import { GridHeader } from './grid-header';
import { GridColumn, SortDirection } from './types';
import { GridStyles } from './grid-styles';
import { ColumnsBuilder } from './columns/columns-builder';

describe('GridHeader', () => {
    let onSort: jest.Mock;
    let onSelectAll: jest.Mock;
    let onColumnsResized: jest.Mock;

    beforeEach(() => {
        onSort = jest.fn();
        onSelectAll = jest.fn();
        onColumnsResized = jest.fn();
    });

    const createColumns = (): GridColumn<any>[] => {
        const builder = new ColumnsBuilder<any>();
        builder.addTextColumn('id').withHeader('ID').withWidth('100px').asSortable().asResizable();
        builder.addTextColumn('name').withHeader('Name').withWidth('200px');
        return builder.build();
    };

    it('should render header with columns', () => {
        const columns = createColumns();
        const header = new GridHeader(columns, false, false, 0, onSort, onSelectAll, onColumnsResized);
        header.render([], new Set(), { field: '', direction: SortDirection.NONE });

        const element = header.getElement();
        const cells = element.querySelectorAll(`.${GridStyles.headerCell.split(' ')[0]}`);
        expect(cells.length).toBe(2);
        expect(cells[0].textContent).toContain('ID');
        expect(cells[1].textContent).toContain('Name');
    });

    it('should apply resizable-column class', () => {
        const columns = createColumns();
        const header = new GridHeader(columns, false, false, 0, onSort, onSelectAll, onColumnsResized);
        header.render([], new Set(), { field: '', direction: SortDirection.NONE });

        const cells = header.getElement().querySelectorAll('.resizable-column');
        expect(cells.length).toBe(1);
        expect(cells[0].textContent).toContain('ID');
    });

    it('should apply prev-resizable class', () => {
        const columns = createColumns();
        const header = new GridHeader(columns, false, false, 0, onSort, onSelectAll, onColumnsResized);
        header.render([], new Set(), { field: '', direction: SortDirection.NONE });

        const cells = header.getElement().querySelectorAll('.prev-resizable');
        expect(cells.length).toBe(1);
        expect(cells[0].textContent).toContain('Name');
    });

    it('should show sort icons for sortable columns', () => {
        const columns = createColumns();
        const header = new GridHeader(columns, false, false, 0, onSort, onSelectAll, onColumnsResized);
        header.render([], new Set(), { field: '', direction: SortDirection.NONE });

        const sortWrappers = header.getElement().querySelectorAll(`.${GridStyles.sortIcon.split(' ')[0]}`);
        expect(sortWrappers.length).toBe(1);
        expect(sortWrappers[0].querySelector('svg')).not.toBeNull();
    });

    it('should trigger onSort on click', () => {
        const columns = createColumns();
        const header = new GridHeader(columns, false, false, 0, onSort, onSelectAll, onColumnsResized);
        header.render([], new Set(), { field: '', direction: SortDirection.NONE });

        const sortableCell = header.getElement().querySelector(`.${GridStyles.headerCellSortable.split(' ')[0]}`) as HTMLElement;
        sortableCell.click();

        expect(onSort).toHaveBeenCalledWith('id', SortDirection.ASC);
    });

    it('should render action header cell with correct width when actionCount > 0', () => {
        const columns = createColumns();
        const header = new GridHeader(columns, false, false, 2, onSort, onSelectAll, onColumnsResized);
        header.render([], new Set(), { field: '', direction: SortDirection.NONE });

        const actionCell = header.getElement().querySelector(`.${GridStyles.actionHeaderCell.split(' ')[0]}`) as HTMLElement;
        expect(actionCell).not.toBeNull();
        expect(actionCell.style.width).toBe('80px');
    });

    it('should not render action header cell when actionCount is 0', () => {
        const columns = createColumns();
        const header = new GridHeader(columns, false, false, 0, onSort, onSelectAll, onColumnsResized);
        header.render([], new Set(), { field: '', direction: SortDirection.NONE });

        const actionCell = header.getElement().querySelector(`.${GridStyles.actionHeaderCell.split(' ')[0]}`);
        expect(actionCell).toBeNull();
    });
});
