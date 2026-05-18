import { GridBuilder } from '@tdq/ora-components';
import { BehaviorSubject, of } from 'rxjs';
import { createButton, createControlStrip, generateGroupedProducts } from './story-helpers';
import type { GroupedProduct } from './story-helpers';

export default {
    title: 'Components/Grid/Grouping',
    tags: ['autodocs', 'stable'],
    parameters: {
        layout: 'fullscreen',
    },
};

const data = generateGroupedProducts(50);

export const MultiLevelGrouping = () => {
    const container = document.createElement('div');
    container.className = 'p-8 flex flex-col gap-4 h-screen';

    const grouping$ = new BehaviorSubject<string[]>(['category', 'subcategory']);
    const items$ = new BehaviorSubject<GroupedProduct[]>(data);

    const controls = createControlStrip([
        createButton('No Grouping', () => grouping$.next([])).build(),
        createButton('Group by Category', () => grouping$.next(['category'])).build(),
        createButton('Group by Category & Subcategory', () => grouping$.next(['category', 'subcategory'])).build(),
    ]);

    container.appendChild(controls);

    const builder = new GridBuilder<GroupedProduct>();
    builder.withItems(items$)
        .withHeight(of(600))
        .withGrouping(grouping$)
        .asMultiSelect();

    const columns = builder.withColumns();
    columns.addTextColumn('name').withHeader('Product Name').withWidth('2fr').asSortable();
    columns.addTextColumn('category').withHeader('Category').withWidth('150px').asSortable();
    columns.addTextColumn('subcategory').withHeader('Subcategory').withWidth('150px').asSortable();
    columns.addMoneyColumn('price').withHeader('Price').withWidth('100px').asSortable();
    columns.addTextColumn('status').withHeader('Status').withWidth('120px').asSortable();

    container.appendChild(builder.build());

    return container;
};
