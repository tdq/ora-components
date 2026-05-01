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

/**
 * Formats a number using Intl.NumberFormat
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
