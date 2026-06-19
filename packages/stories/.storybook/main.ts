import type { StorybookConfig } from "@storybook/html-vite";
import { resolve } from "path";
import { fileURLToPath } from "url";
import remarkGfm from "remark-gfm";

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const config: StorybookConfig = {
    stories: [
        "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"
    ],
    viteFinal: async (config) => {
        config.resolve ??= {};
        config.resolve.alias = {
            ...config.resolve.alias,
            '@tdq/ora-components/style.css': resolve(__dirname, '../../ora-components/src/index.css'),
            '@tdq/ora-components': resolve(__dirname, '../../ora-components/src/index.ts'),
            '@': resolve(__dirname, '../../ora-components/src'),
        };
        return config;
    },
    addons: [
        "@storybook/addon-links",
        {
            name: "@storybook/addon-docs",
            options: {
                mdxPluginOptions: {
                    mdxCompileOptions: {
                        remarkPlugins: [remarkGfm],
                    },
                },
            },
        },
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
