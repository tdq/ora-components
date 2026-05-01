import { CurrencyRegistry } from './currency-registry';

describe('CurrencyRegistry', () => {
    it('should return correct symbol for known currencies', () => {
        expect(CurrencyRegistry.getSymbol('USD')).toBe('$');
        expect(CurrencyRegistry.getSymbol('EUR')).toBe('€');
        expect(CurrencyRegistry.getSymbol('RUB')).toBe('₽');
    });

    it('should return currency ID if symbol is unknown', () => {
        expect(CurrencyRegistry.getSymbol('XYZ')).toBe('XYZ');
    });

    it('should format money correctly using Intl.NumberFormat', () => {
        const money = { amount: 1234.56, currencyId: 'USD' };
        // We use toContain because Intl.NumberFormat might include non-breaking spaces
        const formatted = CurrencyRegistry.format(money);
        expect(formatted).toContain('$');
        expect(formatted).toContain('1,234.56');
    });

    it('should handle unknown currencies in format', () => {
        const money = { amount: 100, currencyId: 'XYZ' };
        const formatted = CurrencyRegistry.format(money);
        expect(formatted).toContain('XYZ');
        expect(formatted).toContain('100.00');
    });

    it('should allow registering new symbols', () => {
        CurrencyRegistry.register('KKT', 'K');
        expect(CurrencyRegistry.getSymbol('KKT')).toBe('K');
        
        const money = { amount: 50, currencyId: 'KKT' };
        expect(CurrencyRegistry.format(money)).toContain('K');
        expect(CurrencyRegistry.format(money)).toContain('50.00');
    });
});
