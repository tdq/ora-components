export function clamp(value: number, min: number = -Infinity, max: number = Infinity): number {
    return Math.max(min, Math.min(max, value));
}

/**
 * Rounds a number to a specific step, avoiding floating-point errors.
 */
export function roundToStep(value: number, step: number): number {
    if (!step || step <= 0) return value;
    
    const precision = getPrecision(step);
    
    const stepped = Math.round(value / step) * step;
    // Fix floating point errors by rounding to the step's precision
    return parseFloat(stepped.toFixed(precision));
}

/**
 * Gets the number of decimal places in a number.
 */
export function getPrecision(value: number): number {
    if (!isFinite(value)) return 0;
    const s = value.toString();
    const dot = s.indexOf('.');
    if (dot === -1) return 0;
    return s.length - dot - 1;
}

export interface LocaleSeparators {
    decimal: string;
    group: string;
    /**
     * The locale's own minus sign glyph. Several locales (`sv-SE`, `nb-NO`, `fi-FI`, …) use
     * U+2212 (MINUS SIGN, `\u2212`) rather than ASCII `-` — `Intl.NumberFormat` renders it, so a
     * value round-tripped through `formatNumber`/`syncInputValue` and back through
     * `parseFloat`/`normalizeLocaleNumberString` must recognize it or a negative value silently
     * becomes `NaN` (and the field discards it) the moment focus leaves without an edit.
     */
    minus: string;
}

const localeSeparatorsCache = new Map<string, LocaleSeparators>();

/**
 * Grouping/decimal/minus-sign characters for a locale, derived from
 * `Intl.NumberFormat(...).formatToParts` rather than a hand-rolled "de/fr/es/it/pt use
 * comma-decimal" heuristic — several real locales (`fr-FR`, `pt-PT`, `ru-RU`, …) group with a
 * narrow no-break space, `de-CH` groups with a right single quotation mark, and `sv-SE`/`nb-NO`/
 * `fi-FI` use U+2212 as their minus sign — none of which a `'.'/','/'-'` heuristic can represent.
 * Formats a *negative* sample so the `minusSign` part is present. Results are cached per locale
 * since this runs on every keystroke/blur.
 */
export function getLocaleSeparators(locale?: string): LocaleSeparators {
    const key = locale || '';
    let seps = localeSeparatorsCache.get(key);
    if (seps) return seps;

    let parts: Intl.NumberFormatPart[];
    try {
        parts = new Intl.NumberFormat(locale || undefined, { useGrouping: true }).formatToParts(-1234567.8);
    } catch (e) {
        parts = new Intl.NumberFormat('en-US', { useGrouping: true }).formatToParts(-1234567.8);
    }

    const decimal = parts.find(p => p.type === 'decimal')?.value ?? '.';
    const group = parts.find(p => p.type === 'group')?.value ?? ',';
    const minus = parts.find(p => p.type === 'minusSign')?.value ?? '-';
    seps = { decimal, group, minus };
    localeSeparatorsCache.set(key, seps);
    return seps;
}

/**
 * Escapes a string for safe use inside a `RegExp` character class/literal — including `-`, which
 * a bare (unescaped) hyphen can turn into an unintended range when spliced into the middle of a
 * caller-built `[...]` character class (`]`, `^` and `\` were already covered by the prior
 * pattern; `-` was the actual gap despite the doc comment claiming class-safety).
 */
export function escapeRegExp(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&');
}

/**
 * The character-class *content* (no enclosing `[...]`) for whitespace-like grouping —
 * a plain space, a no-break space (U+00A0), or the narrow no-break space (U+202F) several Intl
 * locales use for thousands grouping (`fr-FR`, `pt-PT`, …) — regardless of which exact one the
 * locale's own `group` separator is, since a user may type/paste a different whitespace variant
 * than the one Intl renders. Exported (content-only, no brackets) so callers building their own
 * larger character class — e.g. MoneyFieldLogic's "characters allowed while typing" allow-list —
 * can splice it in directly.
 */
export const WHITESPACE_GROUP_CLASS_CONTENT = '\\s\\u00A0\\u202F';
const WHITESPACE_GROUP_CLASS = `[${WHITESPACE_GROUP_CLASS_CONTENT}]`;

/**
 * The character-class *content* (no enclosing `[...]`) for U+2212 (MINUS SIGN) — several Intl
 * locales' (`sv-SE`, `nb-NO`, `fi-FI`, …) actual minus glyph, normalized to ASCII `-`
 * unconditionally regardless of what the *current* locale's own minus glyph is, since a value
 * may be typed, formatted, or copy-pasted from a different locale than the one currently active.
 * Exported (content-only, no brackets) for the same reason as `WHITESPACE_GROUP_CLASS_CONTENT` —
 * so callers building their own larger character class (MoneyFieldLogic's typing allow-list) can
 * splice it in directly.
 */
export const MINUS_SIGN_CLASS_CONTENT = '\\u2212';

/**
 * Strips a locale's grouping separator (including any whitespace variant) from `value`,
 * normalizes its decimal separator to `'.'` and its minus sign (including U+2212, several
 * locales' — `sv-SE`, `nb-NO`, `fi-FI` — actual minus glyph) to ASCII `-`, so the result is safe
 * to pass to `parseFloat`.
 */
export function normalizeLocaleNumberString(value: string, locale?: string): string {
    const { decimal, group, minus } = getLocaleSeparators(locale);
    const isWhitespaceGroup = /^\s$/.test(group);
    const groupPattern = isWhitespaceGroup ? WHITESPACE_GROUP_CLASS : escapeRegExp(group);

    let cleaned = value.replace(new RegExp(groupPattern, 'g'), '');
    if (!isWhitespaceGroup) {
        // Defensive: strip any stray whitespace even when the locale's own grouping character
        // isn't whitespace (e.g. a value copy-pasted from a locale that does group with spaces).
        cleaned = cleaned.replace(new RegExp(WHITESPACE_GROUP_CLASS, 'g'), '');
    }
    cleaned = cleaned.replace(decimal, '.');

    const minusClass = minus === '-' ? MINUS_SIGN_CLASS_CONTENT : `${escapeRegExp(minus)}${MINUS_SIGN_CLASS_CONTENT}`;
    cleaned = cleaned.replace(new RegExp(`[${minusClass}]`, 'g'), '-');

    const dotParts = cleaned.split('.');
    if (dotParts.length > 2) {
        cleaned = dotParts[0] + '.' + dotParts.slice(1).join('');
    }
    return cleaned;
}

/**
 * Formats a number using Intl.NumberFormat.
 *
 * `useGrouping` defaults to `false` here — callers that want thousands separators (e.g.
 * `MoneyFieldLogic.syncInputValue`, which always groups to match `MoneyColumn`/`MoneyKPICard`)
 * must pass `useGrouping: true` explicitly.
 */
export function formatNumber(
    value: number | null,
    options: {
        locale?: string;
        precision?: number;
        step?: number;
        format?: string;
        useGrouping?: boolean;
    } = {}
): string {
    if (value === null || isNaN(value)) return '';

    const { locale, precision, step, format } = options;
    const useGrouping = options.useGrouping ?? false;

    let minDigits = 0;
    let maxDigits = 20; // Default max

    if (format === 'integer') {
        minDigits = 0;
        maxDigits = 0;
    } else if (precision !== undefined) {
        minDigits = precision;
        maxDigits = precision;
    } else if (step !== undefined) {
        const stepPrecision = getPrecision(step);
        minDigits = stepPrecision;
        maxDigits = stepPrecision;
    }

    try {
        return new Intl.NumberFormat(locale || undefined, {
            minimumFractionDigits: minDigits,
            maximumFractionDigits: maxDigits,
            useGrouping,
        }).format(value);
    } catch (e) {
        return value.toString();
    }
}

/**
 * The value-format vocabulary shared by chart axis ticks and tooltip values (and available to
 * any other consumer that needs one number formatter for several presentations of a value).
 */
export type ValueFormatPreset =
    | 'number'                     // grouped, decimals as in the value (no rounding) — the default
    | 'money'                      // grouped, exactly 2 decimals
    | 'integer'                    // grouped, 0 decimals
    | 'compact'                    // 1.2K / 3.4M (Intl notation: 'compact')
    | 'percentage'                 // value is a fraction: 0.153 -> 15.3%
    | 'currency'                   // Intl currency; id comes from the `currency` argument (default 'EUR')
    | `currency:${string}`;        // 'currency:USD'

export type ValueFormat = ValueFormatPreset | ((value: number) => string);

const valueFormatterCache = new Map<string, Intl.NumberFormat>();
const brokenFormatterKeys = new Set<string>();
const warnedFormatIssues = new Set<string>();

function warnOnce(key: string, message: string): void {
    if (!warnedFormatIssues.has(key)) {
        warnedFormatIssues.add(key);
        console.warn(message);
    }
}

/** The non-currency `ValueFormatPreset` names, each mapped to its `Intl.NumberFormat` options. */
type PresetFormatOptions = Record<Exclude<ValueFormatPreset, 'currency' | `currency:${string}`>, Intl.NumberFormatOptions>;

/**
 * Typed as `PresetFormatOptions` (a `Record` over every non-currency preset) so omitting a
 * preset here — or adding one to `ValueFormatPreset` without updating this table — fails to
 * compile, instead of only failing at runtime the first time someone requests it.
 */
const PRESET_OPTION_VALUES: PresetFormatOptions = {
    number: { minimumFractionDigits: 0, maximumFractionDigits: 20 },
    money: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
    integer: { minimumFractionDigits: 0, maximumFractionDigits: 0 },
    compact: { notation: 'compact', compactDisplay: 'short' },
    percentage: { style: 'percent', minimumFractionDigits: 0, maximumFractionDigits: 1 },
};

/**
 * A null-prototype copy of `PRESET_OPTION_VALUES` so `Object.hasOwn`/property lookup can never
 * match an `Object.prototype` member (`'constructor'`, `'toString'`, ...) for an attacker- or
 * typo-supplied preset string. `Object.create(null)` itself is untyped (`any`) — the type safety
 * comes from `PRESET_OPTION_VALUES` above, not from this line.
 */
const PRESET_OPTIONS: PresetFormatOptions = Object.assign(Object.create(null), PRESET_OPTION_VALUES);

function getCachedFormatter(key: string, options: Intl.NumberFormatOptions, locale?: string): Intl.NumberFormat {
    let formatter = valueFormatterCache.get(key);
    if (!formatter) {
        formatter = new Intl.NumberFormat(locale || undefined, { useGrouping: true, ...options });
        valueFormatterCache.set(key, formatter);
    }
    return formatter;
}

const DEFAULT_LOCALE_FORMATTER_KEY = 'number:__runtime-default-locale__';

/**
 * The terminal fallback for `resolveValueFormat`: a grouped `'number'`-preset formatter. Never
 * recurses into `resolveValueFormat` itself (that was the cause of a stack overflow when the
 * *locale* — not just the preset — was what Intl rejected, e.g. `en_US`/POSIX form: the
 * fallback call would recompute the exact same broken `(preset, locale)` pair forever).
 *
 * Tries `locale` first; if that construction also fails, falls back to the runtime default
 * locale (`undefined`, always accepted by `Intl`); if that somehow throws too, formats via
 * plain `String(value)` so this can never throw.
 */
function getSafeNumberFormatter(locale?: string): (value: number) => string {
    const localeKey = locale || '';
    const key = `number:${localeKey}`;

    if (!brokenFormatterKeys.has(key)) {
        try {
            const formatter = getCachedFormatter(key, PRESET_OPTIONS.number, locale);
            return (value: number) => formatter.format(value);
        } catch (e) {
            brokenFormatterKeys.add(key);
            const reason = e instanceof Error ? e.message : String(e);
            warnOnce(`broken:${key}`, `resolveValueFormat: locale "${localeKey || 'default'}" is invalid (${reason}); falling back to the runtime default locale.`);
        }
    }

    let fallback = valueFormatterCache.get(DEFAULT_LOCALE_FORMATTER_KEY);
    if (!fallback) {
        try {
            fallback = new Intl.NumberFormat(undefined, { useGrouping: true, ...PRESET_OPTIONS.number });
            valueFormatterCache.set(DEFAULT_LOCALE_FORMATTER_KEY, fallback);
        } catch (e) {
            return (value: number) => String(value);
        }
    }
    const fallbackFormatter = fallback;
    return (value: number) => fallbackFormatter.format(value);
}

/**
 * `true` iff `format` is a real, recognized `ValueFormat` — a function, `'currency'` /
 * `'currency:<id>'`, or a known preset — as opposed to `undefined` or an unrecognized string
 * (e.g. a legacy `'$0,0'`-style format string) that `resolveValueFormat` silently falls back to
 * `'number'` for. Callers that need to distinguish "the consumer explicitly chose a format" from
 * "nothing recognized was requested, so the default kicked in" — e.g. `axis-renderer.ts` only
 * caps its own default tick precision in the latter case — should check this instead of a bare
 * `config.format !== undefined`, since an unrecognized string is `!== undefined` too.
 */
export function isRecognizedValueFormat(format: ValueFormat | undefined): boolean {
    if (format === undefined) return false;
    if (typeof format === 'function') return true;
    return format === 'currency' || format.startsWith('currency:') || Object.hasOwn(PRESET_OPTIONS, format);
}

/**
 * Resolves a `ValueFormat` (a preset string or a formatter function) into a plain
 * `(value: number) => string` function.
 *
 * - A function is returned as-is.
 * - A preset resolves to an `Intl.NumberFormat` with `useGrouping: true`; instances are cached
 *   per `(preset, locale, currency)` so this is cheap to call on every render/resize.
 * - An unrecognized preset string, an invalid currency id, or an invalid locale each
 *   `console.warn`s once and falls back to a `'number'`-preset formatter (see
 *   `getSafeNumberFormatter`) — never by recursing into this function.
 */
export function resolveValueFormat(
    format: ValueFormat | undefined,
    locale?: string,
    currency?: string
): (value: number) => string {
    if (typeof format === 'function') return format;

    const preset = format ?? 'number';
    const localeKey = locale || '';

    let key: string;
    let options: Intl.NumberFormatOptions;
    if (preset === 'currency' || preset.startsWith('currency:')) {
        const currencyId = preset.includes(':') ? preset.slice(preset.indexOf(':') + 1) : (currency || 'EUR');
        key = `currency:${currencyId}:${localeKey}`;
        options = { style: 'currency', currency: currencyId };
    } else if (Object.hasOwn(PRESET_OPTIONS, preset)) {
        key = `${preset}:${localeKey}`;
        options = PRESET_OPTIONS[preset as keyof typeof PRESET_OPTIONS];
    } else {
        warnOnce(`unknown:${preset}`, `resolveValueFormat: unknown format preset "${preset}", falling back to 'number'.`);
        return getSafeNumberFormatter(locale);
    }

    // A malformed currency id (not a valid 3-letter ISO 4217-shaped code, e.g. 'currency:ZZ' or
    // 'currency:') throws a RangeError out of the Intl.NumberFormat constructor. Cache the
    // failure so we don't retry-and-throw on every subsequent call (e.g. every chart resize).
    if (brokenFormatterKeys.has(key)) {
        return getSafeNumberFormatter(locale);
    }

    let formatter: Intl.NumberFormat;
    try {
        formatter = getCachedFormatter(key, options, locale);
    } catch (e) {
        brokenFormatterKeys.add(key);
        const reason = e instanceof Error ? e.message : String(e);
        warnOnce(`broken:${key}`, `resolveValueFormat: invalid format "${preset}" for locale "${localeKey || 'default'}" (${reason}), falling back to 'number'.`);
        return getSafeNumberFormatter(locale);
    }
    return (value: number) => formatter.format(value);
}
