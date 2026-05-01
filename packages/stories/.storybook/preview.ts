import type { Preview } from "@storybook/html";
import '../../ora-components/src/index.css';
import './storybook-layout.css';

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
    },
};

export default preview;
