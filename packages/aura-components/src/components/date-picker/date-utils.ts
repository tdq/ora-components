export function isValidDate(d: any): d is Date {
    return d instanceof Date && !isNaN(d.getTime());
}

export function isSameDay(d1: Date, d2: Date): boolean {
    return (
        d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate()
    );
}

export function getDaysInMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate();
}

export function getFirstDayOfMonth(year: number, month: number): number {
    return new Date(year, month, 1).getDay();
}

export function formatDate(date: Date, format: string): string {
    if (!isValidDate(date)) return '';
    
    const yyyy = date.getFullYear().toString();
    const mm = (date.getMonth() + 1).toString().padStart(2, '0');
    const dd = date.getDate().toString().padStart(2, '0');
    
    return format
        .replace('YYYY', yyyy)
        .replace('MM', mm)
        .replace('DD', dd);
}

export function parseDate(str: string, format: string): Date | null {
    if (!str) return null;

    // Escape regex special characters except our placeholders
    const escapedFormat = format.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    const formatRegex = escapedFormat
        .replace('YYYY', '(?<year>\\d{4})')
        .replace('MM', '(?<month>\\d{2})')
        .replace('DD', '(?<day>\\d{2})');
    
    const match = new RegExp(`^${formatRegex}$`).exec(str);
    if (!match || !match.groups) return null;

    const year = parseInt(match.groups.year, 10);
    const month = parseInt(match.groups.month, 10) - 1;
    const day = parseInt(match.groups.day, 10);

    const date = new Date(year, month, day);
    
    // Validate that the date is actually what we parsed (e.g. not Feb 31)
    if (
        date.getFullYear() === year &&
        date.getMonth() === month &&
        date.getDate() === day
    ) {
        return date;
    }

    return null;
}
