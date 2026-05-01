import { BehaviorSubject } from 'rxjs';
import { LabelBuilder, LabelSize } from './label';

describe('LabelBuilder', () => {
    it('should create a span element', () => {
        const builder = new LabelBuilder();
        const element = builder.build();
        expect(element.tagName).toBe('SPAN');
    });

    it('should set initial caption', () => {
        const caption$ = new BehaviorSubject('Initial Caption');
        const element = new LabelBuilder()
            .withCaption(caption$)
            .build();

        expect(element.textContent).toBe('Initial Caption');
    });

    it('should update caption reactively', () => {
        const caption$ = new BehaviorSubject('Initial');
        const element = new LabelBuilder()
            .withCaption(caption$)
            .build();

        expect(element.textContent).toBe('Initial');

        caption$.next('Updated');
        expect(element.textContent).toBe('Updated');
    });

    it('should apply correct size classes', () => {
        const smallLabel = new LabelBuilder()
            .withSize(LabelSize.SMALL)
            .build();
        expect(smallLabel.classList.contains('md-label-small')).toBe(true);

        const mediumLabel = new LabelBuilder()
            .withSize(LabelSize.MEDIUM)
            .build();
        expect(mediumLabel.classList.contains('md-label-medium')).toBe(true);

        const largeLabel = new LabelBuilder()
            .withSize(LabelSize.LARGE)
            .build();
        expect(largeLabel.classList.contains('md-label-large')).toBe(true);
    });


    it('should have transition-all class', () => {
        const element = new LabelBuilder().build();
        expect(element.classList.contains('transition-all')).toBe(true);
    });

    it('should apply custom class reactively', () => {
        const class$ = new BehaviorSubject('custom-class');
        const element = new LabelBuilder()
            .withCaption(new BehaviorSubject('Class Test'))
            .withClass(class$)
            .build();

        expect(element.classList.contains('custom-class')).toBe(true);

        class$.next('another-class');
        expect(element.classList.contains('custom-class')).toBe(false);
        expect(element.classList.contains('another-class')).toBe(true);
    });
});

