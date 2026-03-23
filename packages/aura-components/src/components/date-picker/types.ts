import { Observable } from 'rxjs';

export enum DayOfWeek {
    SUNDAY = 0,
    MONDAY = 1,
    TUESDAY = 2,
    WEDNESDAY = 3,
    THURSDAY = 4,
    FRIDAY = 5,
    SATURDAY = 6
}

export interface DatePickerStyle {
    primaryColor?: string;
    surfaceColor?: string;
    onSurfaceColor?: string;
    borderRadius?: string;
    fontFamily?: string;
}

export interface CalendarOptions {
    selectedDate$: Observable<Date | null>;
    isExpanded$?: Observable<boolean>;
    minDate$?: Observable<Date>;
    maxDate$?: Observable<Date>;
    onSelect: (date: Date) => void;
    onClose?: () => void;
    isGlass?: boolean;
    firstDayOfWeek?: DayOfWeek;
}
