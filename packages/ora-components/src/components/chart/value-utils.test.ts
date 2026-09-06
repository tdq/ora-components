import { readValue } from './value-utils';

// ---------------------------------------------------------------------------
// readValue: the single gate deciding "is this data point a value or a gap?".
// Everything downstream (domain, path, markers, bars, hover) keys off it, so
// the contract is pinned here as a table.
// ---------------------------------------------------------------------------

describe('readValue (A1 coverage)', () => {
    describe('numeric values pass through', () => {
        const cases: Array<[string, any, number]> = [
            ['positive integer', 10, 10],
            ['negative integer', -10, -10],
            ['zero', 0, 0],
            ['negative zero', -0, -0],
            ['float', 1.5, 1.5],
            ['very large number', Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
            ['numeric string', '42', 42],
            ['negative numeric string', '-42', -42],
            ['float string', '1.5', 1.5],
            ['whitespace-padded numeric string', '  42  ', 42],
            ['exponent string', '1e3', 1000],
            ['zero string', '0', 0],
        ];

        it.each(cases)('%s -> %p', (_name, raw, expected) => {
            expect(readValue({ v: raw }, 'v')).toBe(expected);
        });
    });

    describe('gaps return null', () => {
        const cases: Array<[string, any]> = [
            ['null', null],
            ['undefined', undefined],
            ['NaN', NaN],
            ['empty string', ''],
            ['blank string', '   '],
            ['non-numeric string', 'abc'],
            ['true', true],
            ['false', false],
            ['empty array', []],
            ['single-element array', [5]],
            ['multi-element array', [1, 2]],
            ['plain object', { a: 1 }],
            ['function', () => 5],
            ['bigint', BigInt(5)],
        ];

        it.each(cases)('%s -> null', (_name, raw) => {
            expect(readValue({ v: raw }, 'v')).toBeNull();
        });
    });

    describe('missing containers', () => {
        it('returns null for a null item', () => {
            expect(readValue(null, 'v')).toBeNull();
        });

        it('returns null for an undefined item', () => {
            expect(readValue(undefined, 'v')).toBeNull();
        });

        it('returns null for a field absent on the item', () => {
            expect(readValue({ other: 1 }, 'v')).toBeNull();
        });
    });

    describe('field key types', () => {
        it('reads a numeric field key (array-like item)', () => {
            expect(readValue([7, 8], 1)).toBe(8);
        });

        it('reads a symbol field key', () => {
            const key = Symbol('k');
            expect(readValue({ [key]: 3 }, key)).toBe(3);
        });
    });

    // Current behaviour, pinned deliberately: Infinity is `typeof 'number'` and
    // not NaN, so it is treated as a real value rather than a gap. See the
    // [NIT] in the QA report — a data source emitting Infinity will stretch the
    // Y domain to Infinity rather than being skipped like NaN.
    describe('infinities (documented current behaviour)', () => {
        it('numeric Infinity is NOT treated as a gap', () => {
            expect(readValue({ v: Infinity }, 'v')).toBe(Infinity);
        });

        it('numeric -Infinity is NOT treated as a gap', () => {
            expect(readValue({ v: -Infinity }, 'v')).toBe(-Infinity);
        });

        it('the string "Infinity" is NOT treated as a gap either', () => {
            expect(readValue({ v: 'Infinity' }, 'v')).toBe(Infinity);
        });
    });
});
