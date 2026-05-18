import type { Preview } from "@storybook/html";
import '../../ora-components/src/index.css';
import './storybook-layout.css';
import './storybook-theme.css';

type ThemeValue = 'light' | 'dark' | 'system';

export const globalTypes = {
    theme: {
        name: 'Theme',
        description: 'Component colour theme',
        defaultValue: 'system' as ThemeValue,
        toolbar: {
            icon: 'mirror',
            items: [
                { value: 'light', icon: 'sun', title: 'Light' },
                { value: 'dark', icon: 'moon', title: 'Dark' },
                { value: 'system', icon: 'mirror', title: 'System' },
            ],
            dynamicTitle: true,
        },
    },
};

const prefersDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

const applyTheme = (theme: ThemeValue) => {
    const isDark = theme === 'dark' || (theme === 'system' && prefersDark());
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', isDark);
};

const getBgClass = (theme: ThemeValue): string => {
    if (theme === 'light') return 'bg-white';
    if (theme === 'dark') return 'bg-black';
    return prefersDark() ? 'bg-black' : 'bg-white';
};

const preview: Preview = {
    parameters: {
        layout: 'fullscreen',
        backgrounds: { disable: true },
        actions: { argTypesRegex: "^on[A-Z].*" },
        controls: {
            matchers: {
                color: /(background|color)$/i,
                date: /Date$/i,
            },
        },
        docs: {
            source: {
                type: 'code',
                language: 'ts',
            },
        },
        viewport: {
            viewports: {
                desktop1280: { name: 'Desktop 1280', styles: { width: '1280px', height: '800px' }, type: 'desktop' },
                desktop1440: { name: 'Desktop 1440', styles: { width: '1440px', height: '900px' }, type: 'desktop' },
                desktop1920: { name: 'Full HD', styles: { width: '1920px', height: '1080px' }, type: 'desktop' },
                desktopWide: { name: 'Ultrawide 2560', styles: { width: '2560px', height: '1080px' }, type: 'desktop' },
            },
            defaultViewport: 'desktop1440',
        },
    },
    decorators: [
        (story, context) => {
            const theme = context.globals.theme as ThemeValue;
            applyTheme(theme);
            const wrapper = document.createElement('div');
            const isDocs = context.viewMode === 'docs';
            const isFullscreen = context.parameters.layout === 'fullscreen';
            const bg = getBgClass(theme);
            if (isDocs) {
                wrapper.className = 'bg-surface text-on-surface p-6';
            } else if (isFullscreen) {
                wrapper.className = `min-h-full w-full flex flex-col ${bg}`;
            } else {
                wrapper.className = `min-h-full w-full ${bg} text-on-surface p-6`;
            }
            const storyElement = story();
            if (storyElement instanceof HTMLElement) {
                wrapper.appendChild(storyElement);
            }
            return wrapper;
        },
    ],
};

export default preview;
