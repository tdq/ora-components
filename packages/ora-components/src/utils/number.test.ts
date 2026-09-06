import { resolveValueFormat, getLocaleSeparators, normalizeLocaleNumberString } from './number';

describe('resolveValueFormat', () => {
    let warnSpy: jest.SpyInstance;

    beforeEach(() => {
        warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
        warnSpy.mockRestore();
    });

    describe('number preset', () => {
        test('groups without rounding', () => {
            const fmt = resolveValueFormat('number');
            expect(fmt(611944.4)).toBe('611,944.4');
            expect(fmt(1234.567)).toBe('1,234.567');
        });

        test('is the default when format is undefined', () => {
            const fmt = resolveValueFormat(undefined);
            expect(fmt(611944.4)).toBe('611,944.4');
        });
    });

    describe('money preset', () => {
        test('groups with exactly 2 decimals', () => {
            const fmt = resolveValueFormat('money');
            expect(fmt(611944.4)).toBe('611,944.40');
            expect(fmt(1234.567)).toBe('1,234.57');
        });
    });

    describe('integer preset', () => {
        test('groups with 0 decimals', () => {
            const fmt = resolveValueFormat('integer');
            expect(fmt(611944.4)).toBe('611,944');
        });
    });

    describe('compact preset', () => {
        test('uses Intl compact notation', () => {
            const fmt = resolveValueFormat('compact');
            expect(fmt(611944.4)).toBe('612K');
        });
    });

    describe('percentage preset', () => {
        test('treats the value as a fraction', () => {
            const fmt = resolveValueFormat('percentage');
            expect(fmt(0.153)).toBe('15.3%');
        });
    });

    describe('currency preset', () => {
        test('currency:EUR formats with the euro symbol', () => {
            const fmt = resolveValueFormat('currency:EUR');
            expect(fmt(611944.4)).toBe('€611,944.40');
        });

        test('bare currency uses the currency argument', () => {
            const fmt = resolveValueFormat('currency', undefined, 'USD');
            expect(fmt(1234.5)).toBe('$1,234.50');
        });

        test('bare currency defaults to EUR when no currency argument is given', () => {
            const fmt = resolveValueFormat('currency');
            expect(fmt(1234.5)).toBe('€1,234.50');
        });
    });

    describe('function passthrough', () => {
        test('returns the function unchanged', () => {
            const fn = (value: number) => `${value} units`;
            const fmt = resolveValueFormat(fn);
            expect(fmt).toBe(fn);
            expect(fmt(5)).toBe('5 units');
        });
    });

    describe('unknown preset', () => {
        test('warns once and falls back to number formatting', () => {
            const fmt1 = resolveValueFormat('bogus' as any);
            const fmt2 = resolveValueFormat('bogus' as any);
            expect(fmt1(611944.4)).toBe('611,944.4');
            expect(fmt2(611944.4)).toBe('611,944.4');
            expect(warnSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe('locale', () => {
        test('de-DE number and money use dot grouping / comma decimal', () => {
            expect(resolveValueFormat('number', 'de-DE')(611944.4)).toBe('611.944,4');
            expect(resolveValueFormat('money', 'de-DE')(611944.4)).toBe('611.944,40');
        });

        test('de-DE currency:EUR formats with locale-appropriate separators', () => {
            const result = resolveValueFormat('currency:EUR', 'de-DE')(611944.4);
            expect(result).toContain('611.944,40');
        });
    });

    describe('invalid currency id', () => {
        test('an invalid currency:<id> preset does not throw — warns once and falls back to number formatting', () => {
            const fmt1 = resolveValueFormat('currency:ZZ' as any);
            const fmt2 = resolveValueFormat('currency:ZZ' as any);
            expect(fmt1(611944.4)).toBe('611,944.4');
            expect(fmt2(611944.4)).toBe('611,944.4');
            expect(warnSpy).toHaveBeenCalledTimes(1);
        });

        test('a bare currency preset with an invalid explicit currency argument does not throw', () => {
            // A distinct invalid id from the previous test, so this exercises its own
            // (uncached) failure path rather than the warn-once short-circuit.
            const fmt = resolveValueFormat('currency', undefined, 'YY');
            expect(fmt(611944.4)).toBe('611,944.4');
            expect(warnSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe('invalid locale (no infinite recursion)', () => {
        test('a POSIX-style locale ("en_US") does not throw, does not recurse forever, and falls back to the number preset', () => {
            // The fallback path always uses the 'number' preset's options (not the originally
            // requested preset's) once the locale itself is what Intl rejected.
            const fmt = resolveValueFormat('money', 'en_US');
            expect(fmt(611944.4)).toBe('611,944.4');
        });

        test('a malformed locale tag ("xx-INVALID") does not throw', () => {
            const fmt = resolveValueFormat('number', 'xx-INVALID');
            expect(fmt(611944.4)).toBe('611,944.4');
        });

        test('an invalid currency id together with an invalid locale does not recurse forever', () => {
            const fmt = resolveValueFormat('currency:ZZ' as any, 'en_US');
            expect(fmt(611944.4)).toBe('611,944.4');
        });
    });

});

describe('getLocaleSeparators', () => {
    test('en-US: comma group, dot decimal, ASCII minus', () => {
        expect(getLocaleSeparators('en-US')).toEqual({ decimal: '.', group: ',', minus: '-' });
    });

    test('de-DE: dot group, comma decimal, ASCII minus', () => {
        expect(getLocaleSeparators('de-DE')).toEqual({ decimal: ',', group: '.', minus: '-' });
    });

    test('fr-FR: narrow no-break space group, comma decimal', () => {
        const seps = getLocaleSeparators('fr-FR');
        expect(seps.decimal).toBe(',');
        expect(/^\s$/.test(seps.group)).toBe(true);
        expect(seps.minus).toBe('-');
    });

    test('pt-PT: whitespace group, comma decimal', () => {
        const seps = getLocaleSeparators('pt-PT');
        expect(seps.decimal).toBe(',');
        expect(/^\s$/.test(seps.group)).toBe(true);
        expect(seps.minus).toBe('-');
    });

    test('de-CH: apostrophe-like group, dot decimal', () => {
        const seps = getLocaleSeparators('de-CH');
        expect(seps.decimal).toBe('.');
        expect(seps.group).not.toBe(',');
        expect(seps.group).not.toBe('.');
        expect(seps.minus).toBe('-');
    });

    test('en-IN: comma group (lakh grouping), dot decimal, ASCII minus', () => {
        expect(getLocaleSeparators('en-IN')).toEqual({ decimal: '.', group: ',', minus: '-' });
    });

    test('sv-SE / nb-NO / fi-FI: U+2212 (MINUS SIGN) as the locale minus, not ASCII "-"', () => {
        for (const locale of ['sv-SE', 'nb-NO', 'fi-FI']) {
            const seps = getLocaleSeparators(locale);
            expect(seps.minus).toBe('\u2212');
            expect(seps.decimal).toBe(',');
        }
    });
});

describe('normalizeLocaleNumberString — minus sign', () => {
    test('sv-SE: U+2212-prefixed grouped/decimal input parses to a negative number', () => {
        const normalized = normalizeLocaleNumberString('\u22129\u00A0876,54', 'sv-SE');
        expect(parseFloat(normalized)).toBeCloseTo(-9876.54, 2);
    });

    test('nb-NO: U+2212-prefixed input parses to a negative number', () => {
        const normalized = normalizeLocaleNumberString('\u22121\u00A0234,5', 'nb-NO');
        expect(parseFloat(normalized)).toBeCloseTo(-1234.5, 2);
    });

    test('fi-FI: U+2212-prefixed input parses to a negative number', () => {
        const normalized = normalizeLocaleNumberString('\u2212500', 'fi-FI');
        expect(parseFloat(normalized)).toBe(-500);
    });

    test('U+2212 is always normalized to ASCII "-" even for a locale whose own minus is ASCII', () => {
        // Defensive: a value may have been formatted/copy-pasted from a different locale.
        const normalized = normalizeLocaleNumberString('\u22121,234.50', 'en-US');
        expect(parseFloat(normalized)).toBeCloseTo(-1234.5, 2);
    });

    test('a plain ASCII minus still round-trips for every locale', () => {
        expect(parseFloat(normalizeLocaleNumberString('-1234.5', 'en-US'))).toBe(-1234.5);
        expect(parseFloat(normalizeLocaleNumberString('-1234,5', 'de-DE'))).toBe(-1234.5);
    });
});
