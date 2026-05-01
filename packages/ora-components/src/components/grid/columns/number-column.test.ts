import { NumberColumnBuilder } from './number-column';

describe('NumberColumnBuilder', () => {
    describe('render', () => {
        it('should render a number with default 2 decimals', () => {
            const builder = new NumberColumnBuilder<any>('value');
            expect(builder.render({ value: 123.456 })).toBe('123.46');
        });

        it('should render with custom decimals', () => {
            const builder = new NumberColumnBuilder<any>('value').withDecimals(4);
            expect(builder.render({ value: 123.456 })).toBe('123.4560');
        });

        it('should return empty string for null', () => {
            const builder = new NumberColumnBuilder<any>('value');
            expect(builder.render({ value: null })).toBe('');
        });

        it('should return empty string for undefined', () => {
            const builder = new NumberColumnBuilder<any>('value');
            expect(builder.render({ value: undefined })).toBe('');
        });

        it('should convert string to number', () => {
            const builder = new NumberColumnBuilder<any>('value');
            expect(builder.render({ value: '123.456' })).toBe('123.46');
        });

        it('should handle NaN values', () => {
            const builder = new NumberColumnBuilder<any>('value');
            expect(builder.render({ value: NaN })).toBe('');
        });

        it('should validate decimals is >= 0', () => {
            const builder = new NumberColumnBuilder<any>('value').withDecimals(-1);
            expect(builder.render({ value: 1.2345 })).toBe('1');
        });

        it('should clamp decimals to 100', () => {
            const builder = new NumberColumnBuilder<any>('value').withDecimals(150);
            const rendered = builder.render({ value: 1.2345 });
            // Should have 100 decimal places
            const decimals = rendered.split('.')[1];
            expect(decimals.length).toBe(100);
        });

        it('should round decimal value', () => {
            const builder = new NumberColumnBuilder<any>('value').withDecimals(2.7);
            expect(builder.render({ value: 1.2346 })).toBe('1.235');
        });

        it('should ignore NaN decimals', () => {
            const builder = new NumberColumnBuilder<any>('value').withDecimals(NaN);
            expect(builder.render({ value: 1.2345 })).toBe('1.23'); // Default 2
        });
    });

    describe('alignment', () => {
        it('should be right-aligned by default', () => {
            const builder = new NumberColumnBuilder<any>('value');
            const column = builder.build();
            expect(column.align).toBe('right');
        });

        it('should allow overriding alignment with withAlign("left")', () => {
            const builder = new NumberColumnBuilder<any>('value').withAlign('left');
            const column = builder.build();
            expect(column.align).toBe('left');
        });

        it('should allow overriding alignment with withAlign("center")', () => {
            const builder = new NumberColumnBuilder<any>('value').withAlign('center');
            const column = builder.build();
            expect(column.align).toBe('center');
        });

        it('should allow overriding alignment with withAlign("right")', () => {
            const builder = new NumberColumnBuilder<any>('value').withAlign('right');
            const column = builder.build();
            expect(column.align).toBe('right');
        });
    });

    describe('editor', () => {
        it('should use NumberFieldBuilder for editor', () => {
            const builder = new NumberColumnBuilder<any>('value').asEditable();
            const column = builder.build();
            const item = { value: 123.45 };

            const editor = column.renderEditor!(item, false);
            const input = editor.element.querySelector('input');
            expect(input?.id).toContain('number-field');
        });

        it('should handle NaN values in editor', () => {
            const builder = new NumberColumnBuilder<any>('value').asEditable();
            const column = builder.build();
            const item = { value: NaN };

            const editor = column.renderEditor!(item, false);
            const input = editor.element.querySelector('input') as HTMLInputElement;
            expect(input.value).toBe('');
            expect(editor.getValue()).toBeNull();
        });

        it('should pass precision and step to editor', () => {
            const builder = new NumberColumnBuilder<any>('value')
                .withDecimals(3)
                .asEditable();
            const column = builder.build();
            const item = { value: 1.2346 };

            const editor = column.renderEditor!(item, false);
            const input = editor.element.querySelector('input') as HTMLInputElement;
            
            expect(input.getAttribute('aria-valuestep')).toBe('0.001');
            expect(input.value).toBe('1.235');
        });

        it('should not round 10.55 incorrectly on blur with 2 decimals', () => {
            const builder = new NumberColumnBuilder<any>('value')
                .withDecimals(2)
                .asEditable();
            const column = builder.build();
            const item = { value: 10.55 };

            const editor = column.renderEditor!(item, false);
            const input = editor.element.querySelector('input') as HTMLInputElement;
            
            // Simulate user typing 10.55 (already the same)
            input.value = '10.55';
            input.dispatchEvent(new Event('blur'));
            
            // Should stay 10.55, not round to 11
            expect(editor.getValue()).toBeCloseTo(10.55, 2);
            expect(input.value).toBe('10.55');
        });

        it('should use correct step for keyboard navigation with 2 decimals', () => {
            const builder = new NumberColumnBuilder<any>('value')
                .withDecimals(2)
                .asEditable();
            const column = builder.build();
            const item = { value: 10.55 };

            const editor = column.renderEditor!(item, false);
            const input = editor.element.querySelector('input') as HTMLInputElement;
            
            expect(input.getAttribute('aria-valuestep')).toBe('0.01');
            
            // Start at 10.55
            input.value = '10.55';
            input.dispatchEvent(new Event('input'));
            
            // ArrowUp should increment by 0.01
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
            expect(editor.getValue()).toBeCloseTo(10.56, 2);
            expect(input.value).toBe('10.56');
            
            // ArrowDown twice should go back to 10.54
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
            expect(editor.getValue()).toBeCloseTo(10.54, 2);
            expect(input.value).toBe('10.54');
        });
    });

    describe('minWidth', () => {
        it('editable number column has minWidth = "120px"', () => {
            const column = new NumberColumnBuilder<any>('value').asEditable().build();
            expect(column.minWidth).toBe('120px');
        });

        it('non-editable number column has no minWidth', () => {
            const column = new NumberColumnBuilder<any>('value').build();
            expect(column.minWidth).toBeUndefined();
        });

        it('withMinWidth overrides the default for editable column', () => {
            const column = new NumberColumnBuilder<any>('value')
                .withMinWidth('180px')
                .asEditable()
                .build();
            expect(column.minWidth).toBe('180px');
        });

        it('withMinWidth overrides the default when called after asEditable', () => {
            const column = new NumberColumnBuilder<any>('value')
                .asEditable()
                .withMinWidth('180px')
                .build();
            expect(column.minWidth).toBe('180px');
        });
    });
});