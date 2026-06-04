// Re-export date utility functions from date-picker (canonical source)
import {
    isValidDate,
    isSameDay,
    getDaysInMonth,
    getFirstDayOfMonth,
    formatDate,
    parseDate,
} from '../date-picker/date-utils';

export {
    isValidDate,
    isSameDay,
    getDaysInMonth,
    getFirstDayOfMonth,
    formatDate,
    parseDate,
};

// ── Local helpers ──────────────────────────────────────────────────

function pad2(n: number): string {
    return n.toString().padStart(2, '0');
}

// ── Time-specific functions ────────────────────────────────────────

export function formatTime(hours: number, minutes: number, timeFormat: '12h' | '24h'): string {
    if (timeFormat === '24h') {
        return `${pad2(hours)}:${pad2(minutes)}`;
    }
    const period = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 || 12;
    return `${pad2(h12)}:${pad2(minutes)} ${period}`;
}

export function parseTime(
    str: string,
    timeFormat: '12h' | '24h',
): { hours: number; minutes: number } | null {
    if (timeFormat === '24h') {
        const match = /^(\d{1,2}):(\d{2})$/.exec(str);
        if (!match) return null;
        const hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2], 10);
        if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
        return { hours, minutes };
    }

    const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(str);
    if (!match) return null;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const period = match[3].toUpperCase();
    if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) return null;
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return { hours, minutes };
}

export function formatDateTime(
    date: Date,
    format: string,
    timeFormat: '12h' | '24h' = '24h',
): string {
    if (!isValidDate(date)) return '';

    const yyyy = date.getFullYear().toString();
    const mm = pad2(date.getMonth() + 1);
    const dd = pad2(date.getDate());
    const timeStr = formatTime(date.getHours(), date.getMinutes(), timeFormat);

    let result = format.replace('YYYY', yyyy).replace('MM', mm).replace('DD', dd);

    const timePlaceholder = timeFormat === '24h' ? 'HH:mm' : 'hh:mm A';
    result = result.replace(timePlaceholder, timeStr);

    return result;
}

export function parseDateTime(
    str: string,
    format: string,
    timeFormat: '12h' | '24h' = '24h',
): Date | null {
    if (!str) return null;

    const timePlaceholder = timeFormat === '24h' ? 'HH:mm' : 'hh:mm A';

    const timeIdx = format.indexOf(timePlaceholder);
    if (timeIdx !== -1) {
        const dateFmt = format.substring(0, timeIdx).trim();
        const dateStr = str.substring(0, timeIdx).trim();
        const timeStr = str.substring(timeIdx).trim();

        const timeParsed = parseTime(timeStr, timeFormat);
        if (!timeParsed) return null;

        const dateParsed = parseDate(dateStr, dateFmt);
        if (!dateParsed) return null;

        return new Date(
            dateParsed.getFullYear(),
            dateParsed.getMonth(),
            dateParsed.getDate(),
            timeParsed.hours,
            timeParsed.minutes,
        );
    }

    return parseDate(str, format);
}
