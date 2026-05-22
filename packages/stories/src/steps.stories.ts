import { StepsBuilder, ButtonBuilder, ButtonStyle } from '@tdq/ora-components';
import { of, BehaviorSubject } from 'rxjs';

export default {
    title: 'Components/Steps',
    tags: ['stable', 'glass', 'reactive'],
    parameters: {
        layout: 'padded',
    },
};

// ---------------------------------------------------------------------------
// Default — horizontal, three steps, internal state, no click
// ---------------------------------------------------------------------------

export const Default = () => {
    const steps = new StepsBuilder();

    steps.addStep().withCaption(of('Personal'));
    steps.addStep().withCaption(of('Address'));
    steps.addStep().withCaption(of('Confirm'));

    return steps.build();
};

// ---------------------------------------------------------------------------
// WithDescriptions — active step shows secondary text
// ---------------------------------------------------------------------------

export const WithDescriptions = () => {
    const container = document.createElement('div');
    container.className = 'flex flex-col gap-4';

    const active$ = new BehaviorSubject(1);

    const controls = document.createElement('div');
    controls.className = 'flex gap-2';

    ['Step 1', 'Step 2', 'Step 3'].forEach((label, i) => {
        const btn = new ButtonBuilder()
            .withCaption(of(label))
            .withStyle(of(ButtonStyle.TONAL))
            .withClick(() => active$.next(i))
            .build();
        controls.appendChild(btn);
    });

    const steps = new StepsBuilder().withActiveStep(active$);

    steps.addStep()
        .withCaption(of('Personal'))
        .withDescription(of('Your name and email'));

    steps.addStep()
        .withCaption(of('Address'))
        .withDescription(of('Where do you live?'));

    steps.addStep()
        .withCaption(of('Confirm'))
        .withDescription(of('Review and submit'));

    container.appendChild(controls);
    container.appendChild(steps.build());
    return container;
};

// ---------------------------------------------------------------------------
// Clickable — internal state, click advances / navigates
// ---------------------------------------------------------------------------

export const Clickable = () => {
    const steps = new StepsBuilder()
        .withStepClick(() => {});

    steps.addStep()
        .withCaption(of('Personal'))
        .withDescription(of('Your name and email'));

    steps.addStep()
        .withCaption(of('Address'))
        .withDescription(of('Where do you live?'));

    steps.addStep()
        .withCaption(of('Confirm'))
        .withDescription(of('Review and submit'));

    return steps.build();
};

// ---------------------------------------------------------------------------
// ExternalControl — parent BehaviorSubject drives active step
// ---------------------------------------------------------------------------

export const ExternalControl = () => {
    const container = document.createElement('div');
    container.className = 'flex flex-col gap-4';

    const active$ = new BehaviorSubject(0);

    const controls = document.createElement('div');
    controls.className = 'flex gap-2';

    const backBtn = new ButtonBuilder()
        .withCaption(of('← Back'))
        .withStyle(of(ButtonStyle.OUTLINED))
        .withClick(() => { if (active$.value > 0) active$.next(active$.value - 1); })
        .build();

    const nextBtn = new ButtonBuilder()
        .withCaption(of('Next →'))
        .withStyle(of(ButtonStyle.FILLED))
        .withClick(() => { if (active$.value < 2) active$.next(active$.value + 1); })
        .build();

    controls.appendChild(backBtn);
    controls.appendChild(nextBtn);

    const steps = new StepsBuilder()
        .withActiveStep(active$)
        .withStepClick(i => {
            if (i < active$.value) active$.next(i);
        });

    steps.addStep()
        .withCaption(of('Personal'))
        .withDescription(of('Your name and email'));

    steps.addStep()
        .withCaption(of('Address'))
        .withDescription(of('Where do you live?'));

    steps.addStep()
        .withCaption(of('Confirm'))
        .withDescription(of('Review and submit'));

    container.appendChild(controls);
    container.appendChild(steps.build());
    return container;
};

// ---------------------------------------------------------------------------
// Vertical — top-to-bottom orientation with side captions
// ---------------------------------------------------------------------------

export const Vertical = () => {
    const container = document.createElement('div');
    container.className = 'flex flex-col gap-4';

    const active$ = new BehaviorSubject(1);

    const controls = document.createElement('div');
    controls.className = 'flex gap-2';

    ['Step 1', 'Step 2', 'Step 3'].forEach((label, i) => {
        const btn = new ButtonBuilder()
            .withCaption(of(label))
            .withStyle(of(ButtonStyle.TONAL))
            .withClick(() => active$.next(i))
            .build();
        controls.appendChild(btn);
    });

    const steps = new StepsBuilder()
        .asVertical()
        .withActiveStep(active$);

    steps.addStep()
        .withCaption(of('Personal'))
        .withDescription(of('Your name and email'));

    steps.addStep()
        .withCaption(of('Address'))
        .withDescription(of('Where do you live?'));

    steps.addStep()
        .withCaption(of('Confirm'))
        .withDescription(of('Review and submit'));

    container.appendChild(controls);
    container.appendChild(steps.build());
    return container;
};

// ---------------------------------------------------------------------------
// GlassEffect — glass variant on gradient background, inside a Panel
// ---------------------------------------------------------------------------

export const GlassEffect = () => {
    const wrapper = document.createElement('div');
    wrapper.className = 'w-full min-h-screen p-12 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center';

    const active$ = new BehaviorSubject(1);

    const stepsEl = new StepsBuilder()
        .asGlass()
        .withActiveStep(active$)
        .withStepClick(i => {
            if (i < active$.value) active$.next(i);
        });

    stepsEl.addStep()
        .withCaption(of('Personal'))
        .withDescription(of('Your name and email'));

    stepsEl.addStep()
        .withCaption(of('Address'))
        .withDescription(of('Where do you live?'));

    stepsEl.addStep()
        .withCaption(of('Confirm'))
        .withDescription(of('Review and submit'));

    const controls = document.createElement('div');
    controls.className = 'flex gap-2 justify-center';

    const backBtn = new ButtonBuilder()
        .withCaption(of('Back'))
        .withStyle(of(ButtonStyle.OUTLINED))
        .withClick(() => { if (active$.value > 0) active$.next(active$.value - 1); })
        .build();

    const nextBtn = new ButtonBuilder()
        .withCaption(of('Next'))
        .withStyle(of(ButtonStyle.FILLED))
        .withClick(() => { if (active$.value < 2) active$.next(active$.value + 1); })
        .build();

    controls.appendChild(backBtn);
    controls.appendChild(nextBtn);

    const inner = document.createElement('div');
    inner.className = 'w-full max-w-lg flex flex-col gap-6';
    inner.appendChild(stepsEl.build());
    inner.appendChild(controls);

    wrapper.appendChild(inner);
    return wrapper;
};

GlassEffect.parameters = { layout: 'fullscreen' };

// ---------------------------------------------------------------------------
// WithVisibilityToggle — one step can be hidden at runtime
// ---------------------------------------------------------------------------

export const WithVisibilityToggle = () => {
    const container = document.createElement('div');
    container.className = 'flex flex-col gap-4';

    const visible$ = new BehaviorSubject(true);
    const active$ = new BehaviorSubject(0);

    const controls = document.createElement('div');
    controls.className = 'flex gap-2';

    const toggleBtn = new ButtonBuilder()
        .withCaption(of('Toggle "Address" Step'))
        .withStyle(of(ButtonStyle.TONAL))
        .withClick(() => visible$.next(!visible$.value))
        .build();

    ['Step 1', 'Step 2', 'Step 3'].forEach((label, i) => {
        const btn = new ButtonBuilder()
            .withCaption(of(label))
            .withStyle(of(ButtonStyle.OUTLINED))
            .withClick(() => active$.next(i))
            .build();
        controls.appendChild(btn);
    });

    controls.appendChild(toggleBtn);

    const steps = new StepsBuilder().withActiveStep(active$);

    steps.addStep().withCaption(of('Personal'));
    steps.addStep().withCaption(of('Address')).withVisible(visible$);
    steps.addStep().withCaption(of('Confirm'));

    container.appendChild(controls);
    container.appendChild(steps.build());
    return container;
};

// ---------------------------------------------------------------------------
// ManySteps — five steps to verify connector layout
// ---------------------------------------------------------------------------

export const ManySteps = () => {
    const container = document.createElement('div');
    container.className = 'flex flex-col gap-4';

    const active$ = new BehaviorSubject(2);

    const controls = document.createElement('div');
    controls.className = 'flex gap-2 flex-wrap';

    for (let i = 0; i < 5; i++) {
        const btn = new ButtonBuilder()
            .withCaption(of(`Step ${i + 1}`))
            .withStyle(of(ButtonStyle.TONAL))
            .withClick(() => active$.next(i))
            .build();
        controls.appendChild(btn);
    }

    const steps = new StepsBuilder()
        .withActiveStep(active$)
        .withStepClick(i => {
            if (i < active$.value) active$.next(i);
        });

    steps.addStep().withCaption(of('Account'));
    steps.addStep().withCaption(of('Profile'));
    steps.addStep().withCaption(of('Plan'));
    steps.addStep().withCaption(of('Payment'));
    steps.addStep().withCaption(of('Confirm'));

    container.appendChild(controls);
    container.appendChild(steps.build());
    return container;
};
