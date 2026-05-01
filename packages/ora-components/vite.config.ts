import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    resolve: {
        alias: {
            '@': resolve(__dirname, './src'),
        },
    },
    build: {
        lib: {
            entry: {
                index: resolve(__dirname, 'src/index.ts'),
                button: resolve(__dirname, 'src/components/button/index.ts'),
                chart: resolve(__dirname, 'src/components/chart/index.ts'),
                checkbox: resolve(__dirname, 'src/components/checkbox/index.ts'),
                combobox: resolve(__dirname, 'src/components/combobox/index.ts'),
                datepicker: resolve(__dirname, 'src/components/date-picker/index.ts'),
                dialog: resolve(__dirname, 'src/components/dialog/index.ts'),
                form: resolve(__dirname, 'src/components/form/index.ts'),
                grid: resolve(__dirname, 'src/components/grid/index.ts'),
                label: resolve(__dirname, 'src/components/label/index.ts'),
                layout: resolve(__dirname, 'src/components/layout/index.ts'),
                listbox: resolve(__dirname, 'src/components/listbox/index.ts'),
                numberfield: resolve(__dirname, 'src/components/number-field/index.ts'),
                panel: resolve(__dirname, 'src/components/panel/index.ts'),
                tabs: resolve(__dirname, 'src/components/tabs/index.ts'),
                textfield: resolve(__dirname, 'src/components/text-field/index.ts'),
                toolbar: resolve(__dirname, 'src/components/toolbar/index.ts')
            },
            name: 'ora-components',
            formats: ['es']
        },
        rollupOptions: {
            external: ['rxjs'],
            output: {
                entryFileNames: ({ name }) => name === "index" ? "index.js" : `${name}/index.js`
            },
        },
    },
});
