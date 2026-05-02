import { GridBuilder, Money } from '@tdq/ora-components';
import { BehaviorSubject, of } from 'rxjs';

export default {
    title: 'Components/Grid/Grouping',
    parameters: {
        layout: 'fullscreen',
    },
};

interface Product {
    id: number;
    name: string;
    category: string;
    subcategory: string;
    price: Money;
    status: 'In Stock' | 'Low Stock' | 'Out of Stock';
}

const CATEGORIES = ['Electronics', 'Home & Garden', 'Apparel'];
const SUBCATEGORIES: Record<string, string[]> = {
    'Electronics': ['Smartphones', 'Laptops', 'Audio'],
    'Home & Garden': ['Furniture', 'Kitchen', 'Decor'],
    'Apparel': ['Menswear', 'Womenswear', 'Accessories']
};

const createMockData = (count: number): Product[] => {
    return Array.from({ length: count }, (_, i) => {
        const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
        const subcategory = SUBCATEGORIES[category][Math.floor(Math.random() * SUBCATEGORIES[category].length)];
        return {
            id: i + 1,
            name: `${subcategory} Item ${i + 1}`,
            category,
            subcategory,
            price: { 
                amount: Math.floor(Math.random() * 1000) + 10, 
                currencyId: 'USD' 
            },
            status: ['In Stock', 'Low Stock', 'Out of Stock'][Math.floor(Math.random() * 3)] as any
        };
    });
};

const data = createMockData(50);

export const MultiLevelGrouping = () => {
    const container = document.createElement('div');
    container.className = 'p-8 flex flex-col gap-4 h-screen';

    const grouping$ = new BehaviorSubject<string[]>(['category', 'subcategory']);
    const items$ = new BehaviorSubject<Product[]>(data);

    const controls = document.createElement('div');
    controls.className = 'flex gap-2 mb-4';

    const btnGroupNone = document.createElement('button');
    btnGroupNone.textContent = 'No Grouping';
    btnGroupNone.className = 'px-4 py-2 bg-surface-container-high rounded-md hover:bg-surface-container-highest transition-colors';
    btnGroupNone.onclick = () => grouping$.next([]);
    controls.appendChild(btnGroupNone);

    const btnGroupCategory = document.createElement('button');
    btnGroupCategory.textContent = 'Group by Category';
    btnGroupCategory.className = 'px-4 py-2 bg-surface-container-high rounded-md hover:bg-surface-container-highest transition-colors';
    btnGroupCategory.onclick = () => grouping$.next(['category']);
    controls.appendChild(btnGroupCategory);

    const btnGroupMulti = document.createElement('button');
    btnGroupMulti.textContent = 'Group by Category & Subcategory';
    btnGroupMulti.className = 'px-4 py-2 bg-surface-container-high rounded-md hover:bg-surface-container-highest transition-colors';
    btnGroupMulti.onclick = () => grouping$.next(['category', 'subcategory']);
    controls.appendChild(btnGroupMulti);

    container.appendChild(controls);

    const builder = new GridBuilder<Product>();
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
