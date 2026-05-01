import { NumberColumnBuilder } from './src/components/grid/columns/number-column.ts';
// Test rounding of decimals parameter
const builder = new NumberColumnBuilder('value').withDecimals(2.7);
console.log('_decimals:', builder._decimals);
// Test with a number that rounds up
const builder2 = new NumberColumnBuilder('value').withDecimals(3);
console.log('1.2345 ->', builder2.render({ value: 1.2345 }));
console.log('1.2355 ->', builder2.render({ value: 1.2355 }));
// Test with decimals 2.2 (rounds to 2)
const builder3 = new NumberColumnBuilder('value').withDecimals(2.2);
console.log('_decimals 2.2 ->', builder3._decimals);
console.log('1.2345 with 2 decimals ->', builder3.render({ value: 1.2345 }));
