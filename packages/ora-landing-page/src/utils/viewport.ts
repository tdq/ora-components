const MOBILE_QUERY = '(max-width: 767px)';

export function isMobileViewport(): boolean {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return false;
    }
    return window.matchMedia(MOBILE_QUERY).matches;
}
