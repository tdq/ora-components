/**
 * Numeric value of a data point field, or `null` when it is a gap.
 *
 * A gap is null/undefined, an empty/blank string, NaN, or anything else that
 * is not a plain number or a numeric string (booleans, arrays, objects all
 * count as gaps rather than silently coercing to 0/1 via `Number(...)`).
 */
export function readValue(item: any, field: string | number | symbol): number | null {
    const raw = item?.[field];
    if (raw === null || raw === undefined) return null;
    if (typeof raw === 'number') return Number.isNaN(raw) ? null : raw;
    if (typeof raw === 'string') {
        if (raw.trim() === '') return null;
        const n = Number(raw);
        return Number.isNaN(n) ? null : n;
    }
    return null;
}
