const counters: Record<string, number> = {};

export function generateFieldId(prefix: string): string {
    if (!(prefix in counters)) {
        counters[prefix] = 0;
    }
    return `${prefix}-${counters[prefix]++}`;
}
