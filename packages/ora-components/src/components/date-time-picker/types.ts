import { Observable } from 'rxjs';

export { DayOfWeek } from '../date-picker/types';
export type { DatePickerStyle as DateTimePickerStyle } from '../date-picker/types';

export interface Time {
    hour: number;
    minute: number;
}

export interface TimePickerOptions {
    selectedHours: Observable<number>;
    selectedMinutes: Observable<number>;
    onSelect: (hours: number, minutes: number) => void;
    timeFormat: '12h' | '24h';
    isGlass?: boolean;
    minHour$?: Observable<number | null>;
    maxHour$?: Observable<number | null>;
    minMinute$?: Observable<number | null>;
    maxMinute$?: Observable<number | null>;
}
