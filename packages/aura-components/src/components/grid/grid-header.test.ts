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
        const header = new GridHeader(columns, false, false, false, onSort, onSelectAll, onColumnsResized);
        header.render([], new Set(), { field: '', direction: SortDirection.NONE });

        const element = header.getElement();
        const cells = element.querySelectorAll(`.${GridStyles.headerCell.split(' ')[0]}`);
        expect(cells.length).toBe(2);
        expect(cells[0].textContent).toContain('ID');
        expect(cells[1].textContent).toContain('Name');
    });

    it('should apply resizable-column class', () => {
        const columns = createColumns();
        const header = new GridHeader(columns, false, false, false, onSort, onSelectAll, onColumnsResized);
        header.render([], new Set(), { field: '', direction: SortDirection.NONE });

        const cells = header.getElement().querySelectorAll('.resizable-column');
        expect(cells.length).toBe(1);
        expect(cells[0].textContent).toContain('ID');
    });

    it('should apply prev-resizable class', () => {
        const columns = createColumns();
        const header = new GridHeader(columns, false, false, false, onSort, onSelectAll, onColumnsResized);
        header.render([], new Set(), { field: '', direction: SortDirection.NONE });

        const cells = header.getElement().querySelectorAll('.prev-resizable');
        expect(cells.length).toBe(1);
        expect(cells[0].textContent).toContain('Name');
    });

    it('should show sort icons for sortable columns', () => {
        const columns = createColumns();
        const header = new GridHeader(columns, false, false, false, onSort, onSelectAll, onColumnsResized);
        header.render([], new Set(), { field: '', direction: SortDirection.NONE });

        const sortIcons = header.getElement().querySelectorAll('.fa-sort');
        expect(sortIcons.length).toBe(1);
    });

    it('should trigger onSort on click', () => {
        const columns = createColumns();
        const header = new GridHeader(columns, false, false, false, onSort, onSelectAll, onColumnsResized);
        header.render([], new Set(), { field: '', direction: SortDirection.NONE });

        const sortableCell = header.getElement().querySelector(`.${GridStyles.headerCellSortable.split(' ')[0]}`) as HTMLElement;
        sortableCell.click();

        expect(onSort).toHaveBeenCalledWith('id', SortDirection.ASC);
    });
});
