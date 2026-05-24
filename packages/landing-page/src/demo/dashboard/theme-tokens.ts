import { themeManager } from '@tdq/ora-components';
import { Observable } from 'rxjs';
import { map, distinctUntilChanged } from 'rxjs/operators';

type ResolvedTheme = 'light' | 'dark' | 'pink';

function resolve(theme: string): ResolvedTheme {
    if (theme === 'system') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return (theme as ResolvedTheme);
}

const resolvedTheme$: Observable<ResolvedTheme> = themeManager.theme$.pipe(
    map(t => resolve(t as string)),
    distinctUntilChanged()
);

/**
 * Hex palette per resolved theme. Used wherever a color must be passed as a
 * concrete string (e.g. SVG `fill`/`stroke` attributes that don't accept
 * `var()`). For CSS contexts use `var(--dashboard-accent)` etc. directly.
 */
export const PALETTE: Record<ResolvedTheme, {
    accent: string;
    accentSoft: string;
    accentBorder: string;
    sky: string;
    green: string;
    amber: string;
    pink: string;
    red: string;
    violet: string;
}> = {
    light: {
        accent: '#4f46e5',
        accentSoft: 'rgba(79,70,229,0.1)',
        accentBorder: 'rgba(79,70,229,0.25)',
        sky: '#0EA5E9',
        green: '#10B981',
        amber: '#F59E0B',
        pink: '#EC4899',
        red: '#EF4444',
        violet: '#8B5CF6',
    },
    dark: {
        accent: '#D0BCFF',
        accentSoft: 'rgba(208,188,255,0.14)',
        accentBorder: 'rgba(208,188,255,0.35)',
        sky: '#38BDF8',
        green: '#34D399',
        amber: '#FBBF24',
        pink: '#F472B6',
        red: '#F87171',
        violet: '#A78BFA',
    },
    pink: {
        accent: '#7D2950',
        accentSoft: 'rgba(125,41,80,0.1)',
        accentBorder: 'rgba(125,41,80,0.25)',
        sky: '#0EA5E9',
        green: '#10B981',
        amber: '#F59E0B',
        pink: '#DB2777',
        red: '#EF4444',
        violet: '#9333EA',
    },
};

export function themedColor$(key: keyof typeof PALETTE['light']): Observable<string> {
    return resolvedTheme$.pipe(map(t => PALETTE[t][key]));
}
