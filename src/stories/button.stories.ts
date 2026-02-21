import { ButtonBuilder, ButtonStyle } from '../components/button';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { LayoutBuilder, LayoutGap } from '../components/layout';

export default {
    title: 'Components/Button',
};

export const Styles = () => {
    const layout = new LayoutBuilder()
        .asHorizontal()
        .withGap(LayoutGap.LARGE);

    const styles = Object.values(ButtonStyle);

    styles.forEach(style => {
        layout.addSlot().withContent(
            new ButtonBuilder()
                .withCaption(of(style.toUpperCase()))
                .withStyle(of(style))
        );
    });

    const container = layout.build();
    container.classList.add('flex-wrap', 'p-4');

    return container;
};

export const Interactive = () => {
    const caption$ = new BehaviorSubject('Click Me');
    const enabled$ = new BehaviorSubject(true);
    const click$ = new Subject<void>();
    let count = 0;

    click$.subscribe(() => {
        count++;
        caption$.next(`Clicked ${count} times`);
    });

    const toggleClick$ = new Subject<void>();
    toggleClick$.subscribe(() => enabled$.next(!enabled$.value));

    const resetCountClick$ = new Subject<void>();
    resetCountClick$.subscribe(() => {
        count = 0;
        caption$.next('Click Me');
    });

    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.LARGE);

    layout.addSlot().withContent(
        new ButtonBuilder()
            .withCaption(caption$)
            .withEnabled(enabled$)
            .withClick(click$)
    );

    const controls = new LayoutBuilder()
        .asHorizontal()
        .withGap(LayoutGap.MEDIUM);

    controls.addSlot().withContent(
        new ButtonBuilder()
            .withCaption(of('Toggle Enabled'))
            .withStyle(of(ButtonStyle.OUTLINED))
            .withClick(toggleClick$)
    );

    controls.addSlot().withContent(
        new ButtonBuilder()
            .withCaption(of('Reset Count'))
            .withStyle(of(ButtonStyle.OUTLINED))
            .withClick(resetCountClick$)
    );

    layout.addSlot().withContent(controls);

    const container = layout.build();
    container.classList.add('p-4');

    return container;
};

export const DynamicStyle = () => {
    const style$ = new BehaviorSubject(ButtonStyle.FILLED);

    const layout = new LayoutBuilder()
        .asVertical()
        .withGap(LayoutGap.LARGE);

    layout.addSlot().withContent(
        new ButtonBuilder()
            .withCaption(of('Style Changer'))
            .withStyle(style$)
    );

    const select = document.createElement('select');
    select.className = 'p-2 border rounded w-max bg-surface text-on-surface';
    Object.values(ButtonStyle).forEach(style => {
        const option = document.createElement('option');
        option.value = style;
        option.textContent = style;
        select.appendChild(option);
    });

    select.onchange = (e) => {
        style$.next((e.target as HTMLSelectElement).value as ButtonStyle);
    };

    layout.addSlot().withContent({
        build: () => select
    });

    const container = layout.build();
    container.classList.add('p-4');

    return container;
};

export const Glass = () => {
    const layout = new LayoutBuilder()
        .asHorizontal()
        .withGap(LayoutGap.LARGE);

    const styles = Object.values(ButtonStyle);

    styles.forEach(style => {
        layout.addSlot().withContent(
            new ButtonBuilder()
                .withCaption(of(`GLASS ${style.toUpperCase()}`))
                .withStyle(of(style))
                .asGlass()
        );
    });

    const container = layout.build();
    container.classList.add('flex-wrap', 'p-8', 'bg-gradient-to-br', 'from-blue-500', 'to-purple-600');

    return container;
};
