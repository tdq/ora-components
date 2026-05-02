import { MoneyFieldBuilder, MoneyFieldStyle, Money, LayoutBuilder, LayoutGap, LabelBuilder, LabelSize } from '@tdq/ora-components';
import { BehaviorSubject, of } from 'rxjs';
import { map } from 'rxjs/operators';

export default {
    title: 'Components/MoneyField',
};

export const Default = () => {
    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.MEDIUM);

    const value$ = new BehaviorSubject<Money | null>({ amount: 1000, currencyId: 'USD' });

    layout.addSlot().withContent(
        new MoneyFieldBuilder()
            .withValue(value$)
            .withLabel(of('Transaction Amount'))
            .withPlaceholder(of('Enter amount'))
            .withPrecision(of(2))
            .withCurrencies(['USD', 'EUR', 'GBP', 'JPY'])
    );

    const container = layout.build();
    container.classList.add('p-8', 'max-w-md');

    // Add some controls
    const controls = document.createElement('div');
    controls.className = 'mt-4 flex gap-2';

    const setValueBtn = document.createElement('button');
    setValueBtn.textContent = 'Set to $5000';
    setValueBtn.className = 'px-4 py-2 bg-primary text-on-primary rounded-small';
    setValueBtn.onclick = () => value$.next({ amount: 5000, currencyId: 'USD' });

    const clearBtn = document.createElement('button');
    clearBtn.textContent = 'Clear';
    clearBtn.className = 'px-4 py-2 bg-surface-variant text-on-surface-variant rounded-small';
    clearBtn.onclick = () => value$.next(null);

    controls.appendChild(setValueBtn);
    controls.appendChild(clearBtn);
    container.appendChild(controls);

    return container;
};

export const Styles = () => {
    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.EXTRA_LARGE);

    layout.addSlot().withContent(
        new LabelBuilder()
            .withCaption(of('Tonal (Default)'))
            .withSize(LabelSize.MEDIUM)
    );

    layout.addSlot().withContent(
        new MoneyFieldBuilder()
            .withLabel(of('Tonal Style'))
            .withStyle(of(MoneyFieldStyle.TONAL))
            .withValue(new BehaviorSubject<Money | null>({ amount: 1000, currencyId: 'USD' }))
            .withCurrencies(['USD'])
    );

    layout.addSlot().withContent(
        new LabelBuilder()
            .withCaption(of('Outlined'))
            .withSize(LabelSize.MEDIUM)
    );

    layout.addSlot().withContent(
        new MoneyFieldBuilder()
            .withLabel(of('Outlined Style'))
            .withStyle(of(MoneyFieldStyle.OUTLINED))
            .withValue(new BehaviorSubject<Money | null>({ amount: 2000, currencyId: 'EUR' }))
            .withCurrencies(['EUR'])
    );

    const container = layout.build();
    container.classList.add('p-8', 'max-w-md');
    return container;
};

export const Currencies = () => {
    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.LARGE);

    layout.addSlot().withContent(
        new MoneyFieldBuilder()
            .withLabel(of('Single Currency (Static Symbol)'))
            .withValue(new BehaviorSubject<Money | null>({ amount: 2500, currencyId: 'EUR' }))
            .withCurrencies(['EUR'])
    );

    layout.addSlot().withContent(
        new MoneyFieldBuilder()
            .withLabel(of('Multiple Currencies (Dropdown)'))
            .withValue(new BehaviorSubject<Money | null>({ amount: 500, currencyId: 'USD' }))
            .withCurrencies(['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'])
    );

    const container = layout.build();
    container.classList.add('p-8', 'max-w-md');
    return container;
};

export const Glass = () => {
    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.EXTRA_LARGE);

    layout.addSlot().withContent(
        new MoneyFieldBuilder()
            .withLabel(of('Glass Tonal'))
            .asGlass()
            .withStyle(of(MoneyFieldStyle.TONAL))
            .withValue(new BehaviorSubject<Money | null>({ amount: 75000, currencyId: 'USD' }))
            .withCurrencies(['USD'])
    );

    layout.addSlot().withContent(
        new MoneyFieldBuilder()
            .withLabel(of('Glass Outlined'))
            .asGlass()
            .withStyle(of(MoneyFieldStyle.OUTLINED))
            .withValue(new BehaviorSubject<Money | null>({ amount: 120000, currencyId: 'EUR' }))
            .withCurrencies(['EUR'])
    );

    const container = layout.build();
    container.classList.add('p-8', 'bg-gradient-to-br', 'from-indigo-500', 'to-purple-600', 'min-h-[400px]');
    return container;
};

export const Errors = () => {
    const value$ = new BehaviorSubject<Money | null>({ amount: 50, currencyId: 'USD' });
    const error$ = value$.pipe(
        map(val => (val && val.amount < 100) ? `Minimum amount is 100 ${val.currencyId}` : '')
    );

    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.LARGE);

    layout.addSlot().withContent(
        new MoneyFieldBuilder()
            .withLabel(of('Standard Error'))
            .withValue(value$)
            .withError(error$)
            .withMinValue(of(100))
            .withCurrencies(['USD'])
    );

    layout.addSlot().withContent(
        new MoneyFieldBuilder()
            .withLabel(of('Inline Error'))
            .asInlineError()
            .withValue(new BehaviorSubject<Money | null>({ amount: -50, currencyId: 'EUR' }))
            .withError(of('Amount cannot be negative'))
            .withMinValue(of(0))
            .withCurrencies(['EUR'])
    );

    const container = layout.build();
    container.classList.add('p-8', 'max-w-md');
    return container;
};

export const Constraints = () => {
    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.LARGE);

    layout.addSlot().withContent(
        new MoneyFieldBuilder()
            .withLabel(of('Donation (Min $10, Max $1000, Step $10)'))
            .withValue(new BehaviorSubject<Money | null>({ amount: 100, currencyId: 'USD' }))
            .withMinValue(of(10))
            .withMaxValue(of(1000))
            .withStep(of(10))
            .withCurrencies(['USD'])
    );

    layout.addSlot().withContent(
        new MoneyFieldBuilder()
            .withLabel(of('Integer Only (No Decimals)'))
            .withValue(new BehaviorSubject<Money | null>({ amount: 50, currencyId: 'GBP' }))
            .withFormat(of('integer'))
            .withCurrencies(['GBP'])
    );

    const container = layout.build();
    container.classList.add('p-8', 'max-w-md');
    return container;
};
