import { router } from '../routes';
import { ThemeManager } from 'aura-components';

export function createHeader(): HTMLElement {
    const header = document.createElement('header');
    header.className = 'sticky top-0 z-50 px-px-24 py-px-16 flex flex-wrap items-center justify-between';
    header.style.cssText = 'position: relative; background: rgba(255, 255, 255, 0.75); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-bottom: 1px solid rgba(121, 116, 126, 0.12);';

    // Theme-specific accent values
    const getThemeAccents = (theme: string | null) => {
        if (theme === 'dark') return { bg: 'rgba(20, 18, 24, 0.75)', gradient: 'linear-gradient(135deg, #4F378B, #633B48)', shadow: 'rgba(79,55,139,0.3)' };
        if (theme === 'pink') return { bg: 'rgba(255, 240, 245, 0.75)', gradient: 'linear-gradient(135deg, #7D2950, #5F1138)', shadow: 'rgba(125,41,80,0.3)' };
        return { bg: 'rgba(255, 255, 255, 0.75)', gradient: 'linear-gradient(135deg, #4f46e5, #6366f1)', shadow: 'rgba(79,70,229,0.3)' };
    };

    // Update glass background + accent colors when theme changes
    const updateGlass = () => {
        const theme = document.documentElement.getAttribute('data-theme');
        const accents = getThemeAccents(theme);
        header.style.cssText = `position: relative; background: ${accents.bg}; backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-bottom: 1px solid rgba(121, 116, 126, 0.12);`;
        logoIcon.style.background = accents.gradient;
        ctaBtn.style.cssText = `background: ${accents.gradient}; box-shadow: 0 2px 12px ${accents.shadow};`;
        mobileDemoBtn.style.cssText = `background: ${accents.gradient};`;
    };

    // Logo
    const logo = document.createElement('div');
    logo.className = 'flex items-center gap-px-12 cursor-pointer group';
    logo.innerHTML = `
        <div class="logo-icon relative w-9 h-9 rounded-large flex items-center justify-center flex-shrink-0 overflow-hidden" style="background: linear-gradient(135deg, #4f46e5, #6366f1);">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 2L15.5 14H2.5L9 2Z" fill="white" fill-opacity="0.9"/>
                <circle cx="9" cy="10" r="2.5" fill="white" fill-opacity="0.6"/>
            </svg>
            <div class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style="background: linear-gradient(135deg, rgba(255,255,255,0.2), transparent);"></div>
        </div>
        <span class="text-title-large text-on-surface font-semibold tracking-tight group-hover:text-primary transition-colors duration-200">Aura Components</span>
    `;
    logo.onclick = () => router.navigate('/');
    const logoIcon = logo.querySelector('.logo-icon') as HTMLElement;

    // Nav
    const nav = document.createElement('nav');
    nav.className = 'hidden md:flex items-center gap-px-8';

    const navLinks = [
        { label: 'Features', href: '#features' },
        { label: 'Playground', href: '#playground' },
        { label: 'Get Started', href: '#get-started' },
    ];

    navLinks.forEach(link => {
        const a = document.createElement('a');
        a.href = link.href;
        a.className = 'relative px-px-16 py-px-8 text-label-large text-on-surface-variant hover:text-on-surface transition-colors duration-200 rounded-medium hover:bg-surface-variant-alpha-40 group';
        a.innerHTML = `
            ${link.label}
            <span class="absolute bottom-1 left-1/2 -translate-x-1/2 w-0 group-hover:w-3/5 h-0.5 rounded-full bg-primary transition-all duration-300" style=""></span>
        `;
        nav.appendChild(a);
    });

    // Actions
    const actions = document.createElement('div');
    actions.className = 'flex items-center gap-px-12';

    const themeToggle = createThemeToggle(updateGlass);

    const githubBtn = document.createElement('a');
    githubBtn.href = 'https://github.com';
    githubBtn.target = '_blank';
    githubBtn.className = 'hidden md:flex items-center justify-center w-9 h-9 rounded-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-variant-alpha-40 transition-all duration-200';
    githubBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
        </svg>
    `;

    const ctaBtn = document.createElement('button');
    ctaBtn.className = 'px-px-16 py-px-8 text-label-large text-white rounded-large font-medium transition-all duration-200 hover:shadow-level-3 hover:scale-105 active:scale-95';
    ctaBtn.style.cssText = 'background: linear-gradient(135deg, #4f46e5, #6366f1); box-shadow: 0 2px 12px rgba(79,70,229,0.3);';
    ctaBtn.textContent = 'View Demo';
    ctaBtn.onmouseenter = () => {
        const theme = document.documentElement.getAttribute('data-theme');
        const { gradient, shadow } = getThemeAccents(theme);
        ctaBtn.style.cssText = `background: ${gradient}; box-shadow: 0 4px 20px ${shadow.replace('0.3', '0.45')}; transform: scale(1.05);`;
    };
    ctaBtn.onmouseleave = () => {
        const theme = document.documentElement.getAttribute('data-theme');
        const { gradient, shadow } = getThemeAccents(theme);
        ctaBtn.style.cssText = `background: ${gradient}; box-shadow: 0 2px 12px ${shadow}; transform: scale(1);`;
    };
    ctaBtn.onclick = () => router.navigate('/dashboard');

    // Hamburger button (mobile only)
    const hamburger = document.createElement('button');
    hamburger.className = 'md:hidden flex flex-col justify-center items-center w-9 h-9 gap-1.5 rounded-medium text-on-surface-variant hover:bg-surface-variant-alpha-40 transition-all duration-200';
    hamburger.setAttribute('aria-label', 'Open menu');
    hamburger.innerHTML = `
        <span class="ham-line w-5 h-0.5 rounded-full bg-current transition-all duration-300"></span>
        <span class="ham-line w-5 h-0.5 rounded-full bg-current transition-all duration-300"></span>
        <span class="ham-line w-5 h-0.5 rounded-full bg-current transition-all duration-300"></span>
    `;

    // Mobile menu drawer
    const mobileMenu = document.createElement('div');
    mobileMenu.className = 'absolute top-full left-0 right-0 md:hidden overflow-hidden';
    mobileMenu.style.cssText = 'max-height: 0; transition: max-height 0.3s ease; background: var(--md-sys-color-surface); border-bottom: 1px solid rgba(121, 116, 126, 0.12); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);';

    const mobileNav = document.createElement('nav');
    mobileNav.className = 'flex flex-col px-px-16 py-px-8';

    navLinks.forEach(link => {
        const a = document.createElement('a');
        a.href = link.href;
        a.className = 'px-px-16 py-px-12 text-body-large text-on-surface-variant hover:text-on-surface hover:bg-surface-variant-alpha-40 rounded-large transition-colors duration-200';
        a.textContent = link.label;
        a.onclick = () => closeMobileMenu();
        mobileNav.appendChild(a);
    });

    // Mobile "View Demo" CTA
    const mobileDemoBtnWrap = document.createElement('div');
    mobileDemoBtnWrap.className = 'px-px-16 py-px-12';
    const mobileDemoBtn = document.createElement('button');
    mobileDemoBtn.className = 'w-full py-px-12 text-label-large text-white rounded-large font-medium transition-all duration-200';
    mobileDemoBtn.style.cssText = 'background: linear-gradient(135deg, #4f46e5, #6366f1);';
    mobileDemoBtn.textContent = 'View Demo';
    mobileDemoBtn.onclick = () => {
        closeMobileMenu();
        router.navigate('/dashboard');
    };
    mobileDemoBtnWrap.appendChild(mobileDemoBtn);
    mobileNav.appendChild(mobileDemoBtnWrap);

    mobileMenu.appendChild(mobileNav);

    let menuOpen = false;

    const openMobileMenu = () => {
        menuOpen = true;
        mobileMenu.style.maxHeight = '320px';
        hamburger.setAttribute('aria-label', 'Close menu');
        const lines = hamburger.querySelectorAll('.ham-line') as NodeListOf<HTMLElement>;
        lines[0].style.cssText = 'transform: translateY(8px) rotate(45deg); width: 20px;';
        lines[1].style.cssText = 'opacity: 0; transform: scaleX(0);';
        lines[2].style.cssText = 'transform: translateY(-8px) rotate(-45deg); width: 20px;';
    };

    const closeMobileMenu = () => {
        menuOpen = false;
        mobileMenu.style.maxHeight = '0';
        hamburger.setAttribute('aria-label', 'Open menu');
        const lines = hamburger.querySelectorAll('.ham-line') as NodeListOf<HTMLElement>;
        lines[0].style.cssText = '';
        lines[1].style.cssText = '';
        lines[2].style.cssText = '';
    };

    hamburger.onclick = () => menuOpen ? closeMobileMenu() : openMobileMenu();

    actions.appendChild(themeToggle);
    actions.appendChild(githubBtn);
    actions.appendChild(ctaBtn);
    actions.appendChild(hamburger);

    header.appendChild(logo);
    header.appendChild(nav);
    header.appendChild(actions);
    header.appendChild(mobileMenu);

    return header;
}

function createThemeToggle(onThemeChange?: () => void): HTMLElement {
    const container = document.createElement('div');
    container.className = 'flex items-center rounded-full p-0.5 gap-0.5';
    container.style.cssText = 'background: rgba(231, 224, 235, 0.6); border: 1px solid rgba(121, 116, 126, 0.15);';

    const themes = [
        { name: 'light', label: 'Light', icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .38-.39.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.38.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41.39.38 1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41.39.39 1.03.39 1.41 0l1.06-1.06z"/></svg>` },
        { name: 'dark', label: 'Dark', icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/></svg>` },
        { name: 'pink', label: 'Pink', icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>` },
    ];

    const themeManager = ThemeManager.getInstance();
    let activeTheme = 'light';

    const buttons: HTMLButtonElement[] = [];

    themes.forEach(t => {
        const btn = document.createElement('button');
        btn.className = 'w-7 h-7 flex items-center justify-center rounded-full transition-all duration-200 text-on-surface-variant';
        btn.innerHTML = t.icon;
        btn.title = t.label;

        const updateActive = () => {
            const theme = document.documentElement.getAttribute('data-theme');
            const activeColor = theme === 'dark' ? '#D0BCFF' : theme === 'pink' ? '#FFB3D1' : '#4f46e5';
            buttons.forEach((b, i) => {
                const isActive = themes[i].name === activeTheme;
                b.style.cssText = isActive
                    ? `background: white; color: ${activeColor}; box-shadow: 0 1px 4px rgba(0,0,0,0.15);`
                    : '';
            });
        };

        btn.onclick = () => {
            activeTheme = t.name;
            themeManager.setTheme(t.name as any);
            document.documentElement.setAttribute('data-theme', t.name);
            updateActive();
            if (onThemeChange) onThemeChange();
        };

        buttons.push(btn);
        container.appendChild(btn);
    });

    // Set initial state
    buttons[0].style.cssText = 'background: white; color: #4f46e5; box-shadow: 0 1px 4px rgba(0,0,0,0.15);';

    return container;
}
