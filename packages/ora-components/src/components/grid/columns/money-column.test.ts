import { MoneyColumnBuilder } from './money-column';
import { Money } from '../../../types/money';
import { BehaviorSubject } from 'rxjs';

describe('MoneyColumnBuilder', () => {
    it('should render a Money object using CurrencyRegistry', () => {
        const builder = new MoneyColumnBuilder<any>('price');
        const item = {
            price: { amount: 100, currencyId: 'USD' } as Money
        };
        
        const rendered = builder.render(item);
        // It should contain $ and 100.
        expect(rendered).toContain('$');
        expect(rendered).toContain('100.00');
    });

    it('should return empty string if value is missing', () => {
        const builder = new MoneyColumnBuilder<any>('price');
        const item = {};
        
        const rendered = builder.render(item);
        expect(rendered).toBe('');
    });

    it('should handle different currencies', () => {
        const builder = new MoneyColumnBuilder<any>('price');
        const item = {
            price: { amount: 50, currencyId: 'EUR' } as Money
        };
        
        const rendered = builder.render(item);
        expect(rendered).toContain('€');
        expect(rendered).toContain('50.00');
    });

    it('should be right-aligned by default', () => {
        const builder = new MoneyColumnBuilder<any>('price');
        const column = builder.build();
        expect(column.align).toBe('right');
    });

    describe('alignment overrides', () => {
        it('should allow overriding alignment with withAlign("left")', () => {
            const builder = new MoneyColumnBuilder<any>('price').withAlign('left');
            const column = builder.build();
            expect(column.align).toBe('left');
        });

        it('should allow overriding alignment with withAlign("center")', () => {
            const builder = new MoneyColumnBuilder<any>('price').withAlign('center');
            const column = builder.build();
            expect(column.align).toBe('center');
        });

        it('should allow overriding alignment with withAlign("right")', () => {
            const builder = new MoneyColumnBuilder<any>('price').withAlign('right');
            const column = builder.build();
            expect(column.align).toBe('right');
        });
    });

    describe('currency support', () => {
        it('should set currencies via withCurrencies', () => {
            const builder = new MoneyColumnBuilder<any>('price')
                .withCurrencies(['USD', 'EUR'])
                .asEditable();
            const column = builder.build();
            const item = { price: { amount: 100, currencyId: 'USD' } };
            
            const editor = column.renderEditor!(item, false);
            // The editor should have a suffix container (currency selector)
            const suffixContainer = editor.element.querySelector('input')?.nextElementSibling as HTMLElement;
            expect(suffixContainer).toBeTruthy();
            // With multiple currencies, there should be a dropdown
            const dropdown = suffixContainer.querySelector('.currency-dropdown');
            expect(dropdown).toBeTruthy();
        });

        it('should show static currency symbol for single currency in editor', () => {
            const builder = new MoneyColumnBuilder<any>('price')
                .withCurrencies(['USD'])
                .asEditable();
            const column = builder.build();
            const item = { price: { amount: 100, currencyId: 'USD' } };
            
            const editor = column.renderEditor!(item, false);
            const suffixContainer = editor.element.querySelector('input')?.nextElementSibling as HTMLElement;
            expect(suffixContainer).toBeTruthy();
            // Single currency should show a span with symbol, not a dropdown
            const span = suffixContainer.querySelector('span');
            expect(span).toBeTruthy();
            expect(span?.textContent).toBe('$');
            const dropdown = suffixContainer.querySelector('.currency-dropdown');
            expect(dropdown).toBeFalsy();
        });

        it('should create dropdown for multiple currencies in editor', () => {
            const builder = new MoneyColumnBuilder<any>('price')
                .withCurrencies(['USD', 'EUR', 'GBP'])
                .asEditable();
            const column = builder.build();
            const item = { price: { amount: 100, currencyId: 'USD' } };
            
            const editor = column.renderEditor!(item, false);
            const suffixContainer = editor.element.querySelector('input')?.nextElementSibling as HTMLElement;
            expect(suffixContainer).toBeTruthy();
            const dropdown = suffixContainer.querySelector('.currency-dropdown');
            expect(dropdown).toBeTruthy();
        });

        it('should work with empty currencies array', () => {
            const builder = new MoneyColumnBuilder<any>('price')
                .withCurrencies([])
                .asEditable();
            const column = builder.build();
            const item = { price: { amount: 100, currencyId: 'USD' } };
            
            const editor = column.renderEditor!(item, false);
            // Should still render an editor (no currency selector)
            const input = editor.element.querySelector('input');
            expect(input).toBeTruthy();
            // No suffix container visible
            const suffixContainer = editor.element.querySelector('input')?.nextElementSibling as HTMLElement;
            // The suffix container might still exist but be hidden
            if (suffixContainer) {
                expect(suffixContainer.classList.contains('hidden')).toBe(true);
            }
        });

        it('withCurrencies is chainable', () => {
            const builder = new MoneyColumnBuilder<any>('price')
                .withCurrencies(['USD'])
                .withAlign('left')
                .asEditable();
            const column = builder.build();
            expect(column.align).toBe('left');
            // Verify editor works
            const item = { price: { amount: 100, currencyId: 'USD' } };
            const editor = column.renderEditor!(item, false);
            expect(editor.element.querySelector('input')).toBeTruthy();
        });
    });

    it('should use MoneyFieldBuilder for editor', () => {
        const builder = new MoneyColumnBuilder<any>('price').asEditable();
        const column = builder.build();
        const item = { price: { amount: 100, currencyId: 'USD' } };

        const editor = column.renderEditor!(item, false);
        const input = editor.element.querySelector('input');
        expect(input?.id).toContain('money-field');
    });

    describe('precision', () => {
        it('should render with default precision (2 decimal places)', () => {
            const builder = new MoneyColumnBuilder<any>('price');
            const item = { price: { amount: 100, currencyId: 'USD' } };
            const rendered = builder.render(item);
            expect(rendered).toContain('100.00');
        });

        it('should render with precision 0', () => {
            const builder = new MoneyColumnBuilder<any>('price').withPrecision(0);
            const item = { price: { amount: 100.75, currencyId: 'USD' } };
            const rendered = builder.render(item);
            expect(rendered).toContain('101');  // rounded
            expect(rendered).not.toContain('.');
        });

        it('should render with precision 4', () => {
            const builder = new MoneyColumnBuilder<any>('price').withPrecision(4);
            const item = { price: { amount: 1.5, currencyId: 'USD' } };
            const rendered = builder.render(item);
            expect(rendered).toContain('1.5000');
        });

        it('withPrecision is chainable', () => {
            const column = new MoneyColumnBuilder<any>('price')
                .withPrecision(3)
                .withAlign('left')
                .build();
            expect(column.align).toBe('left');
        });

        it('should pass precision to editor', () => {
            const builder = new MoneyColumnBuilder<any>('price')
                .withPrecision(0)
                .asEditable();
            const column = builder.build();
            const item = { price: { amount: 100, currencyId: 'USD' } };
            const editor = column.renderEditor!(item, false);
            // Editor element should exist
            expect(editor.element.querySelector('input')).toBeTruthy();
        });

        it('should clamp negative precision to 0', () => {
            const builder = new MoneyColumnBuilder<any>('price').withPrecision(-1);
            const item = { price: { amount: 100.75, currencyId: 'USD' } };
            const rendered = builder.render(item);
            expect(rendered).toContain('101');
            expect(rendered).not.toContain('.');
        });

        it('should round non-integer precision', () => {
            const builder = new MoneyColumnBuilder<any>('price').withPrecision(2.7);
            const item = { price: { amount: 100.1234, currencyId: 'USD' } };
            const rendered = builder.render(item);
            // Precision 2.7 -> 3
            expect(rendered).toContain('100.123');
        });

        it('should clamp precision to 20', () => {
            const builder = new MoneyColumnBuilder<any>('price').withPrecision(50);
            const item = { price: { amount: 100.1234, currencyId: 'USD' } };
            const rendered = builder.render(item);
            // Should have 20 decimal places
            const decimals = rendered.split('.')[1].replace(/[^0-9]/g, '');
            expect(decimals.length).toBe(20);
        });

        it('should ignore NaN precision', () => {
            const builder = new MoneyColumnBuilder<any>('price').withPrecision(NaN);
            const item = { price: { amount: 100.1234, currencyId: 'USD' } };
            const rendered = builder.render(item);
            // Default precision (usually 2)
            expect(rendered).toContain('100.12');
        });
    });

    describe('editor blur and keyboard navigation', () => {
        it('should not round 10.55 incorrectly on blur with 2 decimals', () => {
            const builder = new MoneyColumnBuilder<any>('price')
                .withPrecision(2)
                .asEditable();
            const column = builder.build();
            const item = { price: { amount: 10.55, currencyId: 'USD' } };

            const editor = column.renderEditor!(item, false);
            const input = editor.element.querySelector('input') as HTMLInputElement;
            
            // Simulate user typing 10.55 (already the same)
            input.value = '10.55';
            input.dispatchEvent(new Event('blur'));
            
            // Should stay 10.55, not round to 11
            expect(editor.getValue()?.amount).toBeCloseTo(10.55, 2);
            expect(input.value).toBe('10.55');
        });

        it('should use correct step for keyboard navigation with 2 decimals', () => {
            const builder = new MoneyColumnBuilder<any>('price')
                .withPrecision(2)
                .asEditable();
            const column = builder.build();
            const item = { price: { amount: 10.55, currencyId: 'USD' } };

            const editor = column.renderEditor!(item, false);
            const input = editor.element.querySelector('input') as HTMLInputElement;
            
            // Verify step attribute (should be 0.01)
            expect(input.getAttribute('aria-valuestep')).toBe('0.01');
            
            // Start at 10.55
            input.value = '10.55';
            input.dispatchEvent(new Event('input'));
            
            // ArrowUp should increment by 0.01
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
            expect(editor.getValue()?.amount).toBeCloseTo(10.56, 2);
            expect(input.value).toBe('10.56');
            
            // ArrowDown twice should go back to 10.54
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
            expect(editor.getValue()?.amount).toBeCloseTo(10.54, 2);
            expect(input.value).toBe('10.54');
        });
    });

    describe('minWidth', () => {
        it('editable money column has minWidth = "160px" in built GridColumn', () => {
            const column = new MoneyColumnBuilder<any>('price').asEditable().build();
            expect(column.minWidth).toBe('160px');
        });

        it('non-editable money column has minWidth undefined', () => {
            const column = new MoneyColumnBuilder<any>('price').build();
            expect(column.minWidth).toBeUndefined();
        });

        it('withMinWidth overrides the default for editable column', () => {
            const column = new MoneyColumnBuilder<any>('price')
                .withMinWidth('200px')
                .asEditable()
                .build();
            expect(column.minWidth).toBe('200px');
        });

        it('withMinWidth overrides the default when called after asEditable', () => {
            const column = new MoneyColumnBuilder<any>('price')
                .asEditable()
                .withMinWidth('200px')
                .build();
            expect(column.minWidth).toBe('200px');
        });
    });
});
