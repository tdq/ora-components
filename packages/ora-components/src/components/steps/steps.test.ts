import { StepsBuilder } from './steps';
import { of, BehaviorSubject } from 'rxjs';

// Helper: get all circle elements (first child of each step wrapper that has
// the rounded-full class, which is the circle div).
function getCircles(container: HTMLElement): HTMLElement[] {
    return Array.from(container.querySelectorAll('.rounded-full')) as HTMLElement[];
}

function buildThreeSteps(builder: StepsBuilder): void {
    builder.addStep()
        .withCaption(of('Step One'))
        .withDescription(of('First description'));
    builder.addStep()
        .withCaption(of('Step Two'))
        .withDescription(of('Second description'));
    builder.addStep()
        .withCaption(of('Step Three'))
        .withDescription(of('Third description'));
}

describe('StepsBuilder', () => {
    it('renders the correct count of steps', () => {
        const builder = new StepsBuilder();
        buildThreeSteps(builder);
        const el = builder.build();
        document.body.appendChild(el);

        const circles = getCircles(el);
        expect(circles.length).toBe(3);

        document.body.removeChild(el);
    });

    it('renders each step caption text', () => {
        const builder = new StepsBuilder();
        buildThreeSteps(builder);
        const el = builder.build();
        document.body.appendChild(el);

        expect(document.body.textContent).toContain('Step One');
        expect(document.body.textContent).toContain('Step Two');
        expect(document.body.textContent).toContain('Step Three');

        document.body.removeChild(el);
    });

    it('applies active state styling based on activeStep$', () => {
        const activeStep$ = new BehaviorSubject(1);
        const builder = new StepsBuilder().withActiveStep(activeStep$);
        buildThreeSteps(builder);
        const el = builder.build();
        document.body.appendChild(el);

        const circles = getCircles(el);

        // Step 0: completed
        expect(circles[0].classList.contains('bg-secondary')).toBe(true);
        expect(circles[0].textContent).toBe('✓');

        // Step 1: active
        expect(circles[1].classList.contains('bg-primary')).toBe(true);
        expect(circles[1].textContent).toBe('2');

        // Step 2: upcoming
        expect(circles[2].classList.contains('border-outline/30')).toBe(true);
        expect(circles[2].textContent).toBe('3');

        // Advance to step 2
        activeStep$.next(2);

        // Step 1 becomes completed
        expect(circles[1].classList.contains('bg-secondary')).toBe(true);
        expect(circles[1].textContent).toBe('✓');

        // Step 2 becomes active
        expect(circles[2].classList.contains('bg-primary')).toBe(true);
        expect(circles[2].textContent).toBe('3');

        document.body.removeChild(el);
    });

    it('shows description only on the active step', () => {
        const activeStep$ = new BehaviorSubject(1);
        const builder = new StepsBuilder().withActiveStep(activeStep$);
        buildThreeSteps(builder);
        const el = builder.build();
        document.body.appendChild(el);

        // Find all spans containing description text
        const allSpans = Array.from(el.querySelectorAll('span')) as HTMLElement[];
        const descSpans = allSpans.filter(s =>
            s.textContent === 'First description' ||
            s.textContent === 'Second description' ||
            s.textContent === 'Third description'
        );

        expect(descSpans.length).toBe(3);

        const firstDesc = descSpans.find(s => s.textContent === 'First description')!;
        const secondDesc = descSpans.find(s => s.textContent === 'Second description')!;
        const thirdDesc = descSpans.find(s => s.textContent === 'Third description')!;

        expect(firstDesc.style.display).toBe('none');
        expect(secondDesc.style.display).not.toBe('none');
        expect(thirdDesc.style.display).toBe('none');

        document.body.removeChild(el);
    });

    it('applies glass-mode classes when asGlass() is called', () => {
        const activeStep$ = new BehaviorSubject(1);
        const builder = new StepsBuilder().asGlass().withActiveStep(activeStep$);
        buildThreeSteps(builder);
        const el = builder.build();
        document.body.appendChild(el);

        const circles = getCircles(el);

        // Active circle (index 1) should have bg-white/80 in glass mode
        expect(circles[1].classList.contains('bg-white/80')).toBe(true);

        // Completed circle (index 0) should have bg-white/30 in glass mode
        expect(circles[0].classList.contains('bg-white/30')).toBe(true);

        // Should NOT have non-glass primary class
        expect(circles[1].classList.contains('bg-primary')).toBe(false);

        document.body.removeChild(el);
    });

    it('renders vertical orientation with flex-col container and w-px connectors', () => {
        const builder = new StepsBuilder().asVertical();
        buildThreeSteps(builder);
        const el = builder.build();
        document.body.appendChild(el);

        // Container should have flex-col
        expect(el.classList.contains('flex-col')).toBe(true);

        // Connectors are all direct children that have w-px
        const connectors = Array.from(el.children).filter(
            child => (child as HTMLElement).classList.contains('w-px')
        );
        // 3 steps → 2 connectors
        expect(connectors.length).toBe(2);
        // Horizontal connectors use h-px — these should NOT be present
        const hConnectors = Array.from(el.children).filter(
            child => (child as HTMLElement).classList.contains('h-px')
        );
        expect(hConnectors.length).toBe(0);

        document.body.removeChild(el);
    });

    it('click handling — internal mode: advances indicator and calls handler', () => {
        const handler = jest.fn();
        const builder = new StepsBuilder().withStepClick(handler);
        buildThreeSteps(builder);
        const el = builder.build();
        document.body.appendChild(el);

        const circles = getCircles(el);
        const buttons = Array.from(el.querySelectorAll('button'));
        expect(buttons.length).toBe(3);

        // Initial state: step 0 is active
        expect(circles[0].classList.contains('bg-primary')).toBe(true);

        // Click step at index 1
        buttons[1].click();

        expect(handler).toHaveBeenCalledWith(1);
        expect(handler).toHaveBeenCalledTimes(1);

        // Indicator should have advanced to step 1
        expect(circles[0].classList.contains('bg-secondary')).toBe(true); // now completed
        expect(circles[1].classList.contains('bg-primary')).toBe(true);   // now active

        document.body.removeChild(el);
    });

    it('click handling — external mode: calls handler but does NOT advance indicator without external emission', () => {
        const externalStep$ = new BehaviorSubject(0);
        const handler = jest.fn();
        const builder = new StepsBuilder()
            .withActiveStep(externalStep$)
            .withStepClick(handler);
        buildThreeSteps(builder);
        const el = builder.build();
        document.body.appendChild(el);

        const circles = getCircles(el);
        const buttons = Array.from(el.querySelectorAll('button'));

        // Step 0 active initially
        expect(circles[0].classList.contains('bg-primary')).toBe(true);

        // Track emissions from external subject to confirm builder never writes to it
        const emissions: number[] = [];
        const trackSub = externalStep$.subscribe(v => emissions.push(v));
        // Clear the initial emission
        emissions.length = 0;

        // Click step 1 — handler fires but no indicator change
        buttons[1].click();
        expect(handler).toHaveBeenCalledWith(1);

        // Builder must NOT have emitted on the external observable
        expect(emissions.length).toBe(0);

        // Indicator still shows step 0 as active
        expect(circles[0].classList.contains('bg-primary')).toBe(true);
        expect(circles[1].classList.contains('bg-primary')).toBe(false);

        // Now the parent pushes the update
        externalStep$.next(1);
        expect(circles[1].classList.contains('bg-primary')).toBe(true);
        expect(circles[0].classList.contains('bg-secondary')).toBe(true);

        trackSub.unsubscribe();
        document.body.removeChild(el);
    });

    it('does not render button elements when withStepClick is not called', () => {
        const builder = new StepsBuilder();
        buildThreeSteps(builder);
        const el = builder.build();
        document.body.appendChild(el);

        const buttons = el.querySelectorAll('button');
        expect(buttons.length).toBe(0);

        document.body.removeChild(el);
    });

    it('does not call handler when clicking the already-active step', () => {
        const handler = jest.fn();
        const builder = new StepsBuilder().withStepClick(handler);
        buildThreeSteps(builder);
        const el = builder.build();
        document.body.appendChild(el);

        const buttons = Array.from(el.querySelectorAll('button'));

        // Step 0 is active; clicking it should be a no-op
        buttons[0].click();
        expect(handler).not.toHaveBeenCalled();

        document.body.removeChild(el);
    });

    it('hides a step and falls back to index 0 in internal mode when visible$ emits false for active step', () => {
        const visible$ = new BehaviorSubject(true);
        const builder = new StepsBuilder();
        builder.addStep().withCaption(of('Step One'));
        builder.addStep().withCaption(of('Step Two')).withVisible(visible$);
        builder.addStep().withCaption(of('Step Three'));

        // Advance to step 1 via click (internal mode)
        const handler = jest.fn();
        builder.withStepClick(handler);
        const el = builder.build();
        document.body.appendChild(el);

        const buttons = Array.from(el.querySelectorAll('button'));
        buttons[1].click(); // advance to step 1
        const circles = getCircles(el);
        expect(circles[1].classList.contains('bg-primary')).toBe(true);

        // Now hide step 1 — should fall back to 0
        visible$.next(false);
        expect(circles[0].classList.contains('bg-primary')).toBe(true);

        document.body.removeChild(el);
    });
});
