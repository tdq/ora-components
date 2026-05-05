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

const preview: Preview = {
    parameters: {
        layout: 'fullscreen',
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
    },
    decorators: [
        (story, context) => {
            applyTheme(context.globals.theme as ThemeValue);
            return story();
        },
    ],
};

export default preview;
