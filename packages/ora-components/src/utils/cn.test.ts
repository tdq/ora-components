import { cn, __ORA_SCALES_FOR_TESTS__ } from './cn';
// eslint-disable-next-line @typescript-eslint/no-var-requires
import tailwindConfig from '../../tailwind.config.mjs';

describe('cn', () => {
    it('lets a later padding class override the custom p-px-* utility', () => {
        expect(cn('p-px-8', 'p-0')).toBe('p-0');
        expect(cn('p-px-4', 'p-px-16')).toBe('p-px-16');
    });

    it('merges custom px-px-* and gap-px-* utilities within their groups', () => {
        expect(cn('px-px-8', 'px-2')).toBe('px-2');
        expect(cn('gap-px-16', 'gap-0')).toBe('gap-0');
    });

    it('A5b: py-px-* and m-px-* are overridden by a later class in the same group', () => {
        expect(cn('py-px-8', 'py-0')).toBe('py-0');
        expect(cn('py-px-4', 'py-px-24')).toBe('py-px-24');
        expect(cn('m-px-8', 'm-0')).toBe('m-0');
        expect(cn('m-px-4', 'm-px-16')).toBe('m-px-16');
        expect(cn('mt-px-8', 'mt-0')).toBe('mt-0');
    });

    it('A5b: axis padding does not clobber the shorthand from a different axis', () => {
        expect(cn('px-px-8', 'py-px-16')).toBe('px-px-8 py-px-16');
    });

    it('returns an empty string for no input or only falsy input', () => {
        expect(cn()).toBe('');
        expect(cn(null, undefined, false, '')).toBe('');
    });

    it('A5b: dialog classes survive merging together', () => {
        expect(cn('rounded-large text-body-medium w-[50vw] max-w-[720px]', 'max-w-[900px]'))
            .toBe('rounded-large text-body-medium w-[50vw] max-w-[900px]');
    });

    it('keeps unrelated classes and drops falsy inputs', () => {
        expect(cn('w-full', false, undefined, 'rounded-large')).toBe('w-full rounded-large');
    });

    it('A5b: a later color class overrides an earlier one within the same color scale', () => {
        expect(cn('text-on-surface', 'text-on-error')).toBe('text-on-error');
        expect(cn('bg-surface', 'bg-primary')).toBe('bg-primary');
    });

    it('A5b: custom fontSize and color scales are registered as separate groups so neither drops the other', () => {
        expect(cn('text-body-medium', 'text-on-surface')).toBe('text-body-medium text-on-surface');
        expect(cn('text-on-surface', 'text-body-medium')).toBe('text-on-surface text-body-medium');
    });

    it('A5b: a later rounded class overrides an earlier one', () => {
        expect(cn('rounded-large', 'rounded-none')).toBe('rounded-none');
    });

    it('A5b: a later shadow class overrides an earlier one', () => {
        expect(cn('shadow-level-1', 'shadow-level-3')).toBe('shadow-level-3');
    });

    it('A5b: config parity — every custom spacing/color/fontSize/borderRadius/boxShadow key in tailwind.config.mjs is registered here', () => {
        const extend = tailwindConfig.default?.theme?.extend ?? tailwindConfig.theme?.extend;
        // Order-insensitive: reordering tokens in the config is not a drift, only
        // adding/removing one is. Compare sorted key sets.
        const sorted = (keys: string[]) => [...keys].sort();
        expect(sorted(Object.keys(extend.spacing))).toEqual(sorted(__ORA_SCALES_FOR_TESTS__.spacing));
        expect(sorted(Object.keys(extend.colors))).toEqual(sorted(__ORA_SCALES_FOR_TESTS__.colors));
        expect(sorted(Object.keys(extend.fontSize))).toEqual(sorted(__ORA_SCALES_FOR_TESTS__.fontSize));
        expect(sorted(Object.keys(extend.borderRadius))).toEqual(sorted(__ORA_SCALES_FOR_TESTS__.borderRadius));
        expect(sorted(Object.keys(extend.boxShadow))).toEqual(sorted(__ORA_SCALES_FOR_TESTS__.boxShadow));
    });
});
