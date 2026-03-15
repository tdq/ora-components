import type { StorybookConfig } from "@storybook/html-vite";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const config: StorybookConfig = {
    viteFinal: async (config) => {
        config.resolve ??= {};
        config.resolve.alias = {
            ...config.resolve.alias,
            'aura-components/style.css': resolve(__dirname, '../../aura-components/src/index.css'),
            'aura-components': resolve(__dirname, '../../aura-components/src/index.ts'),
            '@': resolve(__dirname, '../../aura-components/src'),
        };
        return config;
    },
    stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
    addons: [
        "@storybook/addon-links",
        "@storybook/addon-essentials",
    ],
    framework: {
        name: "@storybook/html-vite",
        options: {},
    },
    docs: {
        autodocs: "tag",
    },
};

export default config;
