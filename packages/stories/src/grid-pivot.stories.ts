import { Meta, StoryObj } from '@storybook/html';
import { GridBuilder } from 'ora-components';
import { of } from 'rxjs';
import { AggregationType } from 'ora-components';

const meta: Meta = {
  title: 'Components/Grid/Pivot',
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

const data = [
  { region: 'North', category: 'Electronics', product: 'Smartphone', sales: 1200, count: 1 },
  { region: 'North', category: 'Electronics', product: 'Laptop', sales: 2500, count: 1 },
  { region: 'North', category: 'Clothing', product: 'T-Shirt', sales: 500, count: 1 },
  { region: 'South', category: 'Electronics', product: 'Smartphone', sales: 1500, count: 1 },
  { region: 'South', category: 'Clothing', product: 'Jeans', sales: 800, count: 1 },
  { region: 'East', category: 'Electronics', product: 'Tablet', sales: 1800, count: 1 },
  { region: 'East', category: 'Clothing', product: 'Jacket', sales: 1100, count: 1 },
  { region: 'West', category: 'Electronics', product: 'Smartphone', sales: 1300, count: 1 },
  { region: 'West', category: 'Clothing', product: 'T-Shirt', sales: 600, count: 1 },
  { region: 'North', category: 'Electronics', product: 'Tablet', sales: 1900, count: 1 },
];

export const BasicPivot: StoryObj = {
  render: () => {
    const builder = new GridBuilder<any>()
      .withHeight(of(500))
      .withItems(of(data))
      .withPivot({
        rows: ['category'],
        columns: ['region'],
        values: [{ field: 'sales', aggregation: AggregationType.SUM, header: 'Total Sales' }],
        showGrandTotal: true
      });

    const columns = builder.withColumns();
    columns.addTextColumn('category').withHeader('Category').withWidth('150px');

    return builder.build();
  },
};

export const MultiValuePivot: StoryObj = {
  render: () => {
    const builder = new GridBuilder<any>()
      .withHeight(of(500))
      .withItems(of(data))
      .withPivot({
        rows: ['category'],
        columns: ['region'],
        values: [
          { field: 'sales', aggregation: AggregationType.SUM, header: 'Sales' },
          { field: 'count', aggregation: AggregationType.COUNT, header: 'Orders' }
        ],
        showGrandTotal: true
      });

    const columns = builder.withColumns();
    columns.addTextColumn('category').withHeader('Category').withWidth('150px');

    return builder.build();
  },
};

export const RowGroupingPivot: StoryObj = {
  render: () => {
    const builder = new GridBuilder<any>()
      .withHeight(of(600))
      .withItems(of(data))
      .withPivot({
        rows: ['category', 'product'],
        columns: ['region'],
        values: [{ field: 'sales', aggregation: AggregationType.SUM, header: 'Sales' }],
        showGrandTotal: true
      });

    const columns = builder.withColumns();
    columns.addTextColumn('category').withHeader('Category').withWidth('150px');
    columns.addTextColumn('product').withHeader('Product').withWidth('150px');

    // Also enable grid's own grouping on the pivoted row fields
    builder.withGrouping(of(['category']));

    return builder.build();
  },
};
