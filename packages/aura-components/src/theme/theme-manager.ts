import { Theme } from './types';
import { BehaviorSubject, Observable } from 'rxjs';

export class ThemeManager {
  private static instance: ThemeManager;
  private currentTheme: Theme = 'system';
  private mediaQuery: MediaQueryList;
  private themeSubject = new BehaviorSubject<Theme>('system');

  public readonly theme$: Observable<Theme> = this.themeSubject.asObservable();

  private constructor() {
    this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.init();
  }

  public static getInstance(): ThemeManager {
    if (!ThemeManager.instance) {
      ThemeManager.instance = new ThemeManager();
    }
    return ThemeManager.instance;
  }

  private init(): void {
    const storedTheme = localStorage.getItem('theme') as Theme | null;
    if (storedTheme) {
      this.currentTheme = storedTheme;
    } else {
      this.currentTheme = 'system';
    }
    this.themeSubject.next(this.currentTheme);
    this.applyTheme();

    this.mediaQuery.addEventListener('change', () => {
      if (this.currentTheme === 'system') {
        this.applyTheme();
      }
    });
  }

  public setTheme(theme: Theme): void {
    this.currentTheme = theme;
    this.themeSubject.next(theme);
    localStorage.setItem('theme', theme);
    this.applyTheme();
  }

  public getTheme(): Theme {
    return this.currentTheme;
  }

  private applyTheme(): void {
    let themeToApply = this.currentTheme;

    if (this.currentTheme === 'system') {
      themeToApply = this.mediaQuery.matches ? 'dark' : 'light';
    }

    document.documentElement.setAttribute('data-theme', themeToApply);
  }
}

export const themeManager = ThemeManager.getInstance();
