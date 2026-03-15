import { Observable } from 'rxjs';

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
}
