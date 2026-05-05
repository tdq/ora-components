import { create } from 'storybook/theming/create';
import { addons } from 'storybook/manager-api';

addons.setConfig({
    theme: create({
        base: 'dark',
        brandTitle: 'Ora Components',
        brandUrl: '/',
        colorPrimary: '#D0BCFF',
        colorSecondary: '#4F378B',
        appBg: '#141218',
        appContentBg: '#141218',
        appPreviewBg: '#141218',
        barBg: '#1D1B20',
        barTextColor: '#E6E1E5',
        barSelectedColor: '#D0BCFF',
        barHoverColor: '#4F378B',
        textColor: '#E6E1E5',
        textMutedColor: '#CAC4D0',
        textInverseColor: '#141218',
        inputBg: '#1D1B20',
        inputBorder: '#49454F',
        inputTextColor: '#E6E1E5',
        booleanBg: '#1D1B20',
        booleanSelectedBg: '#4F378B',
        buttonBg: '#4F378B',
        buttonBorder: '#49454F',
        gridCellSize: 12,
        fontBase: '"Inter", system-ui, -apple-system, sans-serif',
        fontCode: '"Fira Code", "Fira Mono", Menlo, monospace',
    }),
});
