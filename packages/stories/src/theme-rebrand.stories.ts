import type { StoryObj } from '@storybook/web-components';
import { of } from 'rxjs';
import { ButtonBuilder, ButtonStyle, GridBuilder, MoneyKPICardBuilder, ColumnType } from '@tdq/ora-components';

export default {
  title: 'System/Theme/Rebrand',
};

export const Rebrand: StoryObj = {
  render: () => {
    const container = document.createElement('div');
    container.id = 'theme-rebrand-demo';
    container.style.padding = '24px';
    container.style.backgroundColor = 'var(--md-sys-color-background)';
    container.style.color = 'var(--md-sys-color-on-background)';
    container.style.fontFamily = 'var(--ora-font-family)';

    // Inject consumer recipe as <style> — applies to all demos
    const styleEl = document.createElement('style');
    styleEl.textContent = `
      :root {
        --md-sys-color-primary: #0F766E;
        --ora-font-family: "IBM Plex Sans", system-ui, sans-serif;
        --ora-grid-header-bg: color-mix(in srgb, var(--md-sys-color-primary) 8%, transparent);
      }
      [data-theme="dark"] {
        --md-sys-color-primary: #5EEAD4;
      }
      .ledger-grid {
        --ora-grid-header-bg: color-mix(in srgb, var(--md-sys-color-tertiary) 12%, transparent);
      }
      #theme-rebrand-demo > div {
        display: inline-block;
        margin-right: 32px;
        vertical-align: top;
      }
    `;
    document.head.appendChild(styleEl);

    // Build demo components with teal rebrand applied
    const btn = new ButtonBuilder()
      .withCaption(of('Save'))
      .withStyle(of(ButtonStyle.FILLED))
      .build();

    const wrapper1 = document.createElement('div');
    wrapper1.appendChild(btn);
    container.appendChild(wrapper1);

    // Grid with per-instance theme override
    const gridWrapper = document.createElement('div');
    gridWrapper.style.minHeight = '300px';
    const gridBuilder = new GridBuilder<{ id: number; name: string; amount: number }>();
    const cols = gridBuilder.withColumns();
    cols.addTextColumn('name').withHeader('Account');
    cols.addTextColumn('amount').withHeader('Amount');
    const grid = gridBuilder
      .withItems(of([
        { id: 1, name: 'Ledger', amount: 1500 },
        { id: 2, name: 'AR', amount: 3200 },
      ]))
      .withClass(of('ledger-grid'))
      .build();
    gridWrapper.appendChild(grid);
    container.appendChild(gridWrapper);

    // KPI card
    const kpiWrapper = document.createElement('div');
    const kpi = new MoneyKPICardBuilder()
      .withLabel(of('Total Receivable'))
      .withValue(of({ amount: 12500, currency: 'USD' }))
      .build();
    kpiWrapper.appendChild(kpi);
    container.appendChild(kpiWrapper);

    // Cleanup on story unmount
    return () => {
      document.head.removeChild(styleEl);
    };
  },
};
