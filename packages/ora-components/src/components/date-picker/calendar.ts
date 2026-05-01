import { BehaviorSubject, combineLatest, take } from 'rxjs';
import { getDaysInMonth, getFirstDayOfMonth, isSameDay, isValidDate } from './date-utils';
import { CalendarOptions, DayOfWeek } from './types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Icons } from '@/core/icons';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function renderCalendar(options: CalendarOptions): HTMLElement {
    const container = document.createElement('div');
    container.className = 'flex flex-col outline-none';
    container.tabIndex = -1;

    const viewDate$ = new BehaviorSubject<Date>(new Date());
    const focusedDate$ = new BehaviorSubject<Date | null>(null);
    
    const syncView = (date: Date | null) => {
        if (isValidDate(date)) {
            const vd = new Date(date.getFullYear(), date.getMonth(), 1);
            viewDate$.next(vd);
            focusedDate$.next(new Date(date));
        } else {
            const now = new Date();
            viewDate$.next(new Date(now.getFullYear(), now.getMonth(), 1));
            focusedDate$.next(now);
        }
    };

    // Initial sync
    options.selectedDate$.pipe(take(1)).subscribe(syncView);

    // Sync when calendar expands
    if (options.isExpanded$) {
        options.isExpanded$.subscribe(expanded => {
            if (expanded) {
                options.selectedDate$.pipe(take(1)).subscribe(syncView);
            }
        });
    }

    // Header
    const header = document.createElement('div');
    header.className = 'flex items-center justify-between mb-px-16';
    
    const prevBtn = document.createElement('button');
    prevBtn.className = 'p-px-8 hover:bg-surface-variant rounded-full text-on-surface focus:outline-primary';
    prevBtn.setAttribute('aria-label', 'Previous Month');
    const prevIconWrapper = document.createElement('span');
    prevIconWrapper.className = 'w-5 h-5 inline-flex items-center justify-center [&_svg]:w-full [&_svg]:h-full [&_svg]:block';
    prevIconWrapper.innerHTML = Icons.CHEVRON_LEFT;
    prevBtn.appendChild(prevIconWrapper);
    prevBtn.onclick = (e) => {
        e.stopPropagation();
        const current = viewDate$.value;
        viewDate$.next(new Date(current.getFullYear(), current.getMonth() - 1, 1));
    };

    const nextBtn = document.createElement('button');
    nextBtn.className = 'p-px-8 hover:bg-surface-variant rounded-full text-on-surface focus:outline-primary';
    nextBtn.setAttribute('aria-label', 'Next Month');
    const nextIconWrapper = document.createElement('span');
    nextIconWrapper.className = 'w-5 h-5 inline-flex items-center justify-center [&_svg]:w-full [&_svg]:h-full [&_svg]:block';
    nextIconWrapper.innerHTML = Icons.CHEVRON_RIGHT;
    nextBtn.appendChild(nextIconWrapper);
    nextBtn.onclick = (e) => {
        e.stopPropagation();
        const current = viewDate$.value;
        viewDate$.next(new Date(current.getFullYear(), current.getMonth() + 1, 1));
    };

    const title = document.createElement('span');
    title.className = cn(
        'md-label-large',
        options.isGlass ? 'text-gray-900 dark:text-white' : 'text-on-surface'
    );

    header.appendChild(prevBtn);
    header.appendChild(title);
    header.appendChild(nextBtn);
    container.appendChild(header);

    // Weekday headers
    const grid = document.createElement('div');
    grid.role = 'grid';
    grid.className = 'grid grid-cols-7 gap-px-2 text-center outline-none';
    grid.tabIndex = 0;
    
    const firstDayOfWeek = options.firstDayOfWeek ?? DayOfWeek.MONDAY;
    const allWeekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    const weekdays = [...allWeekdays.slice(firstDayOfWeek), ...allWeekdays.slice(0, firstDayOfWeek)];
    weekdays.forEach(day => {
        const d = document.createElement('div');
        d.className = cn(
            'text-px-12 font-medium py-px-4',
            options.isGlass ? 'text-gray-600 dark:text-white/60' : 'text-on-surface-variant'
        );
        d.textContent = day;
        grid.appendChild(d);
    });

    const daysContainer = document.createElement('div');
    daysContainer.className = 'contents';
    grid.appendChild(daysContainer);
    container.appendChild(grid);

    // Keyboard Navigation for Grid
    grid.onkeydown = (e) => {
        const currentFocus = focusedDate$.value;
        if (!currentFocus) return;

        let nextFocus: Date | null = null;

        switch (e.key) {
            case 'ArrowLeft':
                nextFocus = new Date(currentFocus.getFullYear(), currentFocus.getMonth(), currentFocus.getDate() - 1);
                break;
            case 'ArrowRight':
                nextFocus = new Date(currentFocus.getFullYear(), currentFocus.getMonth(), currentFocus.getDate() + 1);
                break;
            case 'ArrowUp':
                nextFocus = new Date(currentFocus.getFullYear(), currentFocus.getMonth(), currentFocus.getDate() - 7);
                break;
            case 'ArrowDown':
                nextFocus = new Date(currentFocus.getFullYear(), currentFocus.getMonth(), currentFocus.getDate() + 7);
                break;
            case 'Enter':
            case ' ':
                e.preventDefault();
                options.onSelect(currentFocus);
                return;
            case 'Escape':
                options.onClose?.();
                return;
            default:
                return;
        }

        if (nextFocus) {
            e.preventDefault();
            focusedDate$.next(nextFocus);
            // Update view if month changed
            if (nextFocus.getMonth() !== viewDate$.value.getMonth() || nextFocus.getFullYear() !== viewDate$.value.getFullYear()) {
                viewDate$.next(new Date(nextFocus.getFullYear(), nextFocus.getMonth(), 1));
            }
        }
    };

    // Subscriptions
    const minDate$ = options.minDate$ || new BehaviorSubject<Date>(new Date(1900, 0, 1));
    const maxDate$ = options.maxDate$ || new BehaviorSubject<Date>(new Date(2100, 11, 31));

    combineLatest([viewDate$, options.selectedDate$, focusedDate$, minDate$, maxDate$]).subscribe(([viewDate, selectedDate, focusedDate, minDate, maxDate]) => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        title.textContent = `${monthNames[month]} ${year}`;

        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);
        const offset = (firstDay - firstDayOfWeek + 7) % 7;

        const fragment = document.createDocumentFragment();

        // Empty cells for first week
        for (let i = 0; i < offset; i++) {
            const empty = document.createElement('div');
            fragment.appendChild(empty);
        }

        // Day cells
        const today = new Date();
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const isToday = isSameDay(date, today);
            const isSelected = selectedDate && isSameDay(date, selectedDate);
            const isFocused = focusedDate && isSameDay(date, focusedDate);
            
            // Set time to midnight for robust comparison
            const compareDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const compareMin = minDate ? new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate()) : null;
            const compareMax = maxDate ? new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate()) : null;

            const isDisabled = (compareMin && compareDate < compareMin) || (compareMax && compareDate > compareMax);

            const cell = document.createElement('button');
            cell.role = 'gridcell';
            cell.tabIndex = -1; // Managed via grid focus
            cell.className = `w-px-40 h-px-40 flex items-center justify-center rounded-full text-px-14 transition-colors focus:outline-none`;
            
            if (isDisabled) {
                cell.className += options.isGlass ? ' text-gray-400 dark:text-white/30 cursor-not-allowed' : ' text-outline-variant cursor-not-allowed';
                cell.disabled = true;
            } else if (isSelected) {
                cell.className += options.isGlass ? ' bg-gray-900 text-white dark:bg-white dark:text-gray-900' : ' bg-primary text-on-primary';
            } else if (isFocused) {
                cell.className += options.isGlass 
                    ? ' bg-gray-900/10 dark:bg-white/20 text-gray-900 dark:text-white outline outline-2 outline-primary/50 dark:outline-white/50 outline-offset-[-2px]' 
                    : ' bg-surface-variant text-on-surface outline outline-2 outline-primary outline-offset-[-2px]';
            } else if (isToday) {
                cell.className += options.isGlass
                    ? ' text-primary font-bold outline outline-1 outline-primary/30 outline-offset-[-2px]'
                    : ' text-primary font-bold outline outline-1 outline-primary/30 outline-offset-[-2px]';
            } else {
                cell.className += options.isGlass ? ' text-gray-900 hover:bg-white/20 dark:text-white' : ' text-on-surface hover:bg-surface-variant';
            }

            cell.textContent = day.toString();
            cell.onclick = (e) => {
                e.stopPropagation();
                options.onSelect(date);
            };

            fragment.appendChild(cell);
        }

        daysContainer.replaceChildren(fragment);
    });

    return container;
}
