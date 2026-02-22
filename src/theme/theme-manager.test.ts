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

  it('should apply dark class when system preference is dark and theme is system', () => {
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

    const manager = ThemeManager.getInstance();
    
    // In init(), applyTheme() is called.
    // It checks currentTheme ('system') and mediaQuery.matches (true).
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('should not apply dark class when system preference is light and theme is system', () => {
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

    const manager = ThemeManager.getInstance();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('should explicitly set dark theme', () => {
    const manager = ThemeManager.getInstance();
    manager.setTheme('dark');
    expect(manager.getTheme()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('should explicitly set light theme', () => {
    const manager = ThemeManager.getInstance();
    // First set to dark to ensure change happens
    manager.setTheme('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    
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
    expect(document.documentElement.classList.contains('dark')).toBe(true);
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
