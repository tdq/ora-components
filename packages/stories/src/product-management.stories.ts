import { BehaviorSubject, combineLatest, of, Subject } from 'rxjs';
import { map } from 'rxjs/operators';
import { GridBuilder, Money, MoneyFieldStyle } from 'ora-components';
import { FormBuilder } from 'ora-components';
import { PanelBuilder, PanelGap } from 'ora-components';
import { LayoutBuilder, LayoutGap, Alignment } from 'ora-components';
import { DialogBuilder, DialogSize } from 'ora-components';
import { TextFieldBuilder, TextFieldStyle } from 'ora-components';
import { NumberFieldStyle } from 'ora-components';
import { ComboBoxBuilder, ComboBoxStyle } from 'ora-components';
import { ButtonBuilder, ButtonStyle } from 'ora-components';
import { Icons } from 'ora-components';

export default {
    title: 'Examples/Product Management',
};

interface Product {
    id: number;
    name: string;
    category: 'Electronics' | 'Clothing' | 'Food' | 'Furniture';
    price: Money;
    stock: number;
    active: boolean;
}

const CATEGORIES = ['Electronics', 'Clothing', 'Food', 'Furniture'];

const generateProducts = (count: number): Product[] => {
    return Array.from({ length: count }).map((_, i) => ({
        id: i + 1,
        name: `Product ${i + 1}`,
        category: CATEGORIES[i % CATEGORIES.length] as any,
        price: {
            amount: Math.floor(Math.random() * 1000) + 10,
            currencyId: 'USD'
        },
        stock: Math.floor(Math.random() * 100),
        active: i % 5 !== 0,
    }));
};

export const ProductManagement = () => {
    // State
    const products$ = new BehaviorSubject<Product[]>(generateProducts(20));
    const filterName$ = new BehaviorSubject<string>('');
    const filterCategory$ = new BehaviorSubject<string | null>('');

    // Derived State
    const filteredProducts$ = combineLatest([products$, filterName$, filterCategory$]).pipe(
        map(([products, name, category]) => {
            return products.filter(p => {
                const matchesName = p.name.toLowerCase().includes(name.toLowerCase());
                const matchesCategory = category ? p.category === category : true;
                return matchesName && matchesCategory;
            });
        })
    );

    // Actions
    const addProduct = (product: Omit<Product, 'id'>) => {
        const current = products$.value;
        const maxId = current.length > 0 ? Math.max(...current.map(p => p.id)) : 0;
        products$.next([...current, { ...product, id: maxId + 1 }]);
    };

    const updateProduct = (product: Product) => {
        const current = products$.value;
        const index = current.findIndex(p => p.id === product.id);
        if (index !== -1) {
            const updated = [...current];
            updated[index] = product;
            products$.next(updated);
        }
    };

    const deleteProduct = (product: Product) => {
        if (confirm(`Are you sure you want to delete ${product.name}?`)) {
            const current = products$.value;
            products$.next(current.filter(p => p.id !== product.id));
        }
    };

    const openProductDialog = (product?: Product) => {
        const isEdit = !!product;
        const name$ = new BehaviorSubject(product?.name || '');
        const category$ = new BehaviorSubject(product?.category || CATEGORIES[0]);
        const price$ = new BehaviorSubject<Money | null>(product?.price ?? null);
        const stock$ = new BehaviorSubject<number | null>(product?.stock ?? null);
        const active$ = new BehaviorSubject(product?.active ?? true);

        // Validation
        const nameError$ = name$.pipe(map(v => v.trim() ? '' : 'Name is required'));
        const priceError$ = price$.pipe(map(v => v !== null && v.amount > 0 ? '' : 'Invalid price'));
        const stockError$ = stock$.pipe(map(v => v !== null && v >= 0 ? '' : 'Invalid stock'));

        const isValid$ = combineLatest([nameError$, priceError$, stockError$]).pipe(
            map(errors => errors.every(e => !e))
        );

        const form = new FormBuilder()
            .withCaption(of(isEdit ? 'Edit Product' : 'Add Product'));

        const fields = form.withFields(2);

        fields.addTextField(1, 2)
            .withLabel(of('Product Name'))
            .withValue(name$)
            .withError(nameError$)
            .withStyle(of(TextFieldStyle.OUTLINED));

        // Use ComboBox for Category if available, otherwise Text or Select logic
        // For now, let's use ComboBox logic from generic Builder
        const categoryCombo = fields.addComboBoxField(1, 1);
        categoryCombo.withCaption(of('Category'))
            .withItems(of(CATEGORIES))
            .withValue(category$ as any);

        fields.addCheckBox(2, 1)
            .withCaption(of('Active Product'))
            .withValue(active$);

        fields.addMoneyField(1, 1)
            .withLabel(of('Price'))
            .withValue(price$)
            .withError(priceError$)
            .withStyle(of(MoneyFieldStyle.TONAL))
            .withCurrencies(['USD', 'EUR', 'GBP']);

        fields.addNumberField(2, 1)
            .withLabel(of('Stock'))
            .withValue(stock$)
            .withError(stockError$)
            .withStyle(of(NumberFieldStyle.OUTLINED))
            .withSuffix(of('qty'));

        const dialog = new DialogBuilder()
            .withCaption(of(isEdit ? `Edit ${product?.name}` : 'New Product'))
            .withContent(form)
            .withSize(DialogSize.MEDIUM);

        const saveClick$ = new Subject<void>();
        saveClick$.subscribe(() => {
            const data = {
                name: name$.value,
                category: category$.value as any,
                price: {
                    amount: price$.value || 0,
                    currencyId: 'USD'
                } as Money,
                stock: stock$.value || 0,
                active: active$.value
            };

            if (isEdit && product) {
                updateProduct({ ...data, id: product.id });
            } else {
                addProduct(data);
            }
            dialog.close();
        });

        const cancelClick$ = new Subject<void>();
        cancelClick$.subscribe(() => dialog.close());

        const toolbar = dialog.withToolbar();
        toolbar.addSecondaryButton()
            .withCaption(of('Cancel'))
            .withClick(() => cancelClick$.next());

        toolbar.withPrimaryButton()
            .withCaption(of('Save'))
            .withEnabled(isValid$)
            .withClick(() => saveClick$.next());

        dialog.show();
    };

    // UI Construction

    // 1. Filter Panel
    const filterPanel = new PanelBuilder()
        .withGap(PanelGap.MEDIUM);

    const filterLayout = new LayoutBuilder()
        .asHorizontal()
        .withGap(LayoutGap.LARGE)
        .withAlignment(of(Alignment.CENTER));

    // Name Filter
    const nameFilter = new TextFieldBuilder()
        .withPlaceholder(of('Filter by name...'))
        .withValue(filterName$)
        .withStyle(of(TextFieldStyle.OUTLINED))
        .asInlineError();

    // Category Filter
    const categoryFilter = new ComboBoxBuilder<string>()
        .withItems(of(['', ...CATEGORIES]))
        .withItemCaptionProvider(item => item === '' ? 'All Categories' : item)
        .withValue(filterCategory$)
        .withStyle(of(ComboBoxStyle.OUTLINED));

    // Add Button
    const addBtnClick$ = new Subject<void>();
    addBtnClick$.subscribe(() => openProductDialog());

    const addButton = new ButtonBuilder()
        .withCaption(of('Add Product'))
        .withClick(() => addBtnClick$.next())
        .withStyle(of(ButtonStyle.FILLED))
        .withClass(of('ml-auto'));

    filterLayout.addSlot().withContent(nameFilter);
    filterLayout.addSlot().withContent(categoryFilter);
    filterLayout.addSlot().withContent(addButton).withAlignment(of(Alignment.RIGHT));

    filterPanel.withContent(filterLayout);

    // 2. Grid
    const grid = new GridBuilder<Product>()
        .withItems(filteredProducts$)
        .withHeight(of(500));

    const columns = grid.withColumns();
    columns.addTextColumn('name').withHeader('Name').withWidth('200px');
    columns.addTextColumn('category').withHeader('Category').withWidth('150px');
    columns.addMoneyColumn('price').withHeader('Price').withWidth('100px');
    columns.addNumberColumn('stock').withHeader('Stock').withWidth('100px');
    columns.addBooleanColumn('active').withHeader('Active').withWidth('80px');

    const actions = grid.withActions();
    actions.addAction(Icons.EDIT, 'Edit', (product) => openProductDialog(product));
    actions.addAction(Icons.DELETE, 'Delete', (product) => deleteProduct(product));

    // 3. Main Layout
    const mainLayout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.LARGE)
        .withClass(of('p-8 bg-gray-50 min-h-screen'));

    mainLayout.addSlot().withContent(filterPanel);
    mainLayout.addSlot().withContent(grid);

    return mainLayout.build();
};
