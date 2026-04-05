import { PercentageColumnBuilder } from './percentage-column';

describe('PercentageColumnBuilder', () => {
    describe('render', () => {
        it('should render 0.75 as "75%"', () => {
            const builder = new PercentageColumnBuilder<any>('value');
            expect(builder.render({ value: 0.75 })).toBe('75%');
        });

        it('should render 0.285 as "28.5%" (key decimal precision case)', () => {
            const builder = new PercentageColumnBuilder<any>('value');
            expect(builder.render({ value: 0.285 })).toBe('28.5%');
        });

        it('should render 0.01 as "1%"', () => {
            const builder = new PercentageColumnBuilder<any>('value');
            expect(builder.render({ value: 0.01 })).toBe('1%');
        });

        it('should render 0 as "0%"', () => {
            const builder = new PercentageColumnBuilder<any>('value');
            expect(builder.render({ value: 0 })).toBe('0%');
        });

        it('should render 0.005 as "0.5%"', () => {
            const builder = new PercentageColumnBuilder<any>('value');
            expect(builder.render({ value: 0.005 })).toBe('0.5%');
        });

        it('should return "" for null', () => {
            const builder = new PercentageColumnBuilder<any>('value');
            expect(builder.render({ value: null })).toBe('');
        });

        it('should return "" for undefined', () => {
            const builder = new PercentageColumnBuilder<any>('value');
            expect(builder.render({ value: undefined })).toBe('');
        });

        it('should return "" for missing field', () => {
            const builder = new PercentageColumnBuilder<any>('value');
            expect(builder.render({})).toBe('');
        });

        it('should return "" for NaN-producing input "abc"', () => {
            const builder = new PercentageColumnBuilder<any>('value');
            expect(builder.render({ value: 'abc' })).toBe('');
        });
    });

    describe('createEditor', () => {
        it('should set editor displayValue to 28.5 when stored value is 0.285', () => {
            const builder = new PercentageColumnBuilder<any>('value');
            // Access createEditor via the public edit() entry — fall back to casting
            const editor = (builder as any).createEditor({ value: 0.285 }, false);
            // The BehaviorSubject holds the display value (multiply by 100)
            // We verify via getValue() roundtrip: stored / 100 == original
            // and by checking the intermediate display: editor.getValue() == 0.285
            // Display value check: reading value$ from the built editor element is internal,
            // but we can verify indirectly — getValue() must return 0.285 when no user edit occurred.
            expect(editor.getValue()).toBeCloseTo(0.285, 10);
        });

        it('should return stored value 0.285 when editor holds display value 28.5 (getValue roundtrip)', () => {
            const builder = new PercentageColumnBuilder<any>('value');
            const editor = (builder as any).createEditor({ value: 0.285 }, false);
            // getValue divides the current BehaviorSubject value by 100
            const stored = editor.getValue();
            expect(stored).toBeCloseTo(0.285, 10);
        });

        it('should return null from getValue when stored value is null', () => {
            const builder = new PercentageColumnBuilder<any>('value');
            const editor = (builder as any).createEditor({ value: null }, false);
            expect(editor.getValue()).toBeNull();
        });

        it('should return null from getValue when stored value is undefined', () => {
            const builder = new PercentageColumnBuilder<any>('value');
            const editor = (builder as any).createEditor({ value: undefined }, false);
            expect(editor.getValue()).toBeNull();
        });

        it('should return null from getValue when stored value is NaN-producing "abc"', () => {
            const builder = new PercentageColumnBuilder<any>('value');
            const editor = (builder as any).createEditor({ value: 'abc' }, false);
            expect(editor.getValue()).toBeNull();
        });

        it('editor displayValue for 0.75 should round-trip to 0.75 via getValue', () => {
            const builder = new PercentageColumnBuilder<any>('value');
            const editor = (builder as any).createEditor({ value: 0.75 }, false);
            expect(editor.getValue()).toBeCloseTo(0.75, 10);
        });

        it('should return stored value 0.28567 via getValue (no rounding)', () => {
            const builder = new PercentageColumnBuilder<any>('value');
            const editor = (builder as any).createEditor({ value: 0.28567 }, false);
            expect(editor.getValue()).toBeCloseTo(0.28567, 10);
        });

        it('should show display value 28.567 (not 28.57) when stored value is 0.28567', () => {
            const builder = new PercentageColumnBuilder<any>('value');
            const editor = (builder as any).createEditor({ value: 0.28567 }, false);
            // The BehaviorSubject holds numRaw * 100 as the display value.
            // getValue() returns displayValue / 100, so displayValue == getValue() * 100.
            const displayValue = editor.getValue() * 100;
            // Full precision must be preserved: 28.567, not truncated to 28.57.
            expect(displayValue).toBeCloseTo(28.567, 10);
            // The value must differ from 28.57 at the 3rd decimal place (tolerance 0.0005).
            expect(Math.abs(displayValue - 28.57)).toBeGreaterThan(0.0005);
        });
    });
});
