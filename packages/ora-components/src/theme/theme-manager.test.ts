import { ThemeManager } from './theme-manager';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    clear: () => {
      store = {};
    },
    removeItem: (key: string) => {
      delete store[key];
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('ThemeManager', () => {
  let matchMediaMock: jest.Mock;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    document.documentElement.removeAttribute('data-theme');

    // Reset the singleton instance for each test
    // @ts-ignore
    ThemeManager.instance = undefined;

    matchMediaMock = jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
    window.matchMedia = matchMediaMock;
  });

  it('should initialize with system theme by default', () => {
    const manager = ThemeManager.getInstance();
    expect(manager.getTheme()).toBe('system');
  });

  it('should set data-theme to dark when system preference is dark and theme is system', () => {
    matchMediaMock.mockImplementation((query) => ({
      matches: true, // User prefers dark mode
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
    window.matchMedia = matchMediaMock;

    ThemeManager.getInstance();

    // In init(), applyTheme() is called.
    // It checks currentTheme ('system') and mediaQuery.matches (true).
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('should set data-theme to light when system preference is light and theme is system', () => {
    matchMediaMock.mockImplementation((query) => ({
        matches: false, // User prefers light mode
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));
      window.matchMedia = matchMediaMock;

    ThemeManager.getInstance();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('should explicitly set dark theme', () => {
    const manager = ThemeManager.getInstance();
    manager.setTheme('dark');
    expect(manager.getTheme()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('should explicitly set light theme', () => {
    const manager = ThemeManager.getInstance();
    // First set to dark to ensure change happens
    manager.setTheme('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    manager.setTheme('light');
    expect(manager.getTheme()).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('theme')).toBe('light');
  });

  it('should load theme from localStorage on initialization', () => {
    localStorage.setItem('theme', 'dark');
    const manager = ThemeManager.getInstance();
    expect(manager.getTheme()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('should explicitly set green theme', () => {
    const manager = ThemeManager.getInstance();
    manager.setTheme('green');
    expect(manager.getTheme()).toBe('green');
    expect(document.documentElement.getAttribute('data-theme')).toBe('green');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('theme')).toBe('green');
  });
});

describe('ThemeManager — data-theme is the only theming contract (dark class untouched)', () => {
  /** A controllable matchMedia: `matches` is mutable and `change` listeners are captured. */
  const installMatchMedia = (initialMatches: boolean) => {
    const listeners: Array<(e: MediaQueryListEvent) => void> = [];
    const mql = {
      matches: initialMatches,
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn((type: string, cb: (e: MediaQueryListEvent) => void) => {
        if (type === 'change') listeners.push(cb);
      }),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    };
    window.matchMedia = jest.fn().mockReturnValue(mql) as unknown as typeof window.matchMedia;
    return {
      mql,
      listeners,
      /** Simulate the OS flipping the colour scheme. */
      emitChange(matches: boolean) {
        mql.matches = matches;
        listeners.forEach((cb) => cb({ matches } as MediaQueryListEvent));
      },
    };
  };

  const html = () => document.documentElement;

  beforeEach(() => {
    localStorage.clear();
    html().classList.remove('dark');
    html().removeAttribute('data-theme');
    // @ts-ignore — reset the singleton so each test builds a fresh manager
    ThemeManager.instance = undefined;
  });

  afterEach(() => {
    html().classList.remove('dark');
    html().removeAttribute('data-theme');
    // @ts-ignore
    ThemeManager.instance = undefined;
  });

  it('flips only data-theme when the system theme change event fires', () => {
    const media = installMatchMedia(false);
    const manager = ThemeManager.getInstance();

    expect(manager.getTheme()).toBe('system');
    expect(html().getAttribute('data-theme')).toBe('light');
    expect(html().classList.contains('dark')).toBe(false);

    media.emitChange(true);
    expect(html().getAttribute('data-theme')).toBe('dark');
    expect(html().classList.contains('dark')).toBe(false);

    media.emitChange(false);
    expect(html().getAttribute('data-theme')).toBe('light');
    expect(html().classList.contains('dark')).toBe(false);
  });

  it('ignores the system theme change event once an explicit theme is set', () => {
    const media = installMatchMedia(false);
    const manager = ThemeManager.getInstance();
    manager.setTheme('light');

    media.emitChange(true);

    expect(manager.getTheme()).toBe('light');
    expect(html().getAttribute('data-theme')).toBe('light');
    expect(html().classList.contains('dark')).toBe(false);
  });

  it('updates only data-theme across dark -> light -> dark', () => {
    installMatchMedia(false);
    const manager = ThemeManager.getInstance();

    manager.setTheme('dark');
    expect(html().getAttribute('data-theme')).toBe('dark');
    expect(html().classList.contains('dark')).toBe(false);

    manager.setTheme('light');
    expect(html().getAttribute('data-theme')).toBe('light');
    expect(html().classList.contains('dark')).toBe(false);

    manager.setTheme('dark');
    expect(html().getAttribute('data-theme')).toBe('dark');
    expect(html().classList.contains('dark')).toBe(false);
  });

  it('resolves a stored system theme against a dark media query on initialization', () => {
    installMatchMedia(true);
    localStorage.setItem('theme', 'system');

    const manager = ThemeManager.getInstance();

    expect(manager.getTheme()).toBe('system');
    expect(html().getAttribute('data-theme')).toBe('dark');
    expect(html().classList.contains('dark')).toBe(false);
  });

  it('never adds the dark class for a named non-dark theme after being dark', () => {
    installMatchMedia(true);
    const manager = ThemeManager.getInstance();
    expect(html().getAttribute('data-theme')).toBe('dark');
    expect(html().classList.contains('dark')).toBe(false);

    manager.setTheme('green');
    expect(html().getAttribute('data-theme')).toBe('green');
    expect(html().classList.contains('dark')).toBe(false);
  });

  it('leaves a pre-existing host-managed dark class alone across theme changes', () => {
    // Simulate a consumer app managing its own Tailwind `dark` class independently.
    html().classList.add('dark');
    const media = installMatchMedia(false);
    const manager = ThemeManager.getInstance();

    expect(html().getAttribute('data-theme')).toBe('light');
    expect(html().classList.contains('dark')).toBe(true);

    manager.setTheme('dark');
    expect(html().getAttribute('data-theme')).toBe('dark');
    expect(html().classList.contains('dark')).toBe(true);

    manager.setTheme('light');
    expect(html().getAttribute('data-theme')).toBe('light');
    expect(html().classList.contains('dark')).toBe(true);

    media.emitChange(true);
    expect(html().classList.contains('dark')).toBe(true);
  });
});
