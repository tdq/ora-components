import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ComboBoxStyle } from './types';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export const STYLE_MAP: Record<ComboBoxStyle, string> = {
    [ComboBoxStyle.TONAL]: 'bg-secondary-container text-on-secondary-container rounded-small hover:bg-on-surface/15 focus-within:bg-on-surface/20',
    [ComboBoxStyle.OUTLINED]: 'bg-transparent rounded-small ring-1 ring-inset ring-outline focus-within:ring-2 focus-within:ring-inset focus-within:ring-primary',
};
