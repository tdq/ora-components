import { TabsBuilder } from './tabs';
import { of, BehaviorSubject } from 'rxjs';
import { LabelBuilder } from '../label/label';

describe('Tabs Component', () => {
    it('should render tabs with captions', () => {
        const tabs = new TabsBuilder()
            .withCaption(of('Main Title'))
            .withDescription(of('Main Description'));

        tabs.addTab().withCaption(of('Tab 1')).withContent(new LabelBuilder().withCaption(of('Content 1')));
        tabs.addTab().withCaption(of('Tab 2')).withContent(new LabelBuilder().withCaption(of('Content 2')));

        const element = tabs.build();
        document.body.appendChild(element);

        expect(document.body.textContent).toContain('Main Title');
        expect(document.body.textContent).toContain('Main Description');
        expect(document.body.textContent).toContain('Tab 1');
        expect(document.body.textContent).toContain('Tab 2');
        expect(document.body.textContent).toContain('Content 1');
        expect(document.body.textContent).not.toContain('Content 2'); // Initial active tab is 0

        // Simulate click on second tab
        const buttons = element.querySelectorAll('button');
        buttons[1].click();
        
        expect(document.body.textContent).toContain('Content 2');
        expect(document.body.textContent).not.toContain('Content 1');

        document.body.removeChild(element);
    });

    it('should handle visibility of tabs', () => {
        const tabs = new TabsBuilder();
        const visible$ = new BehaviorSubject(true);
        
        tabs.addTab().withCaption(of('Tab 1')).withContent(new LabelBuilder().withCaption(of('C1')));
        tabs.addTab().withCaption(of('Tab 2')).withVisible(visible$).withContent(new LabelBuilder().withCaption(of('C2')));

        const element = tabs.build();
        document.body.appendChild(element);

        const buttons = element.querySelectorAll('button');
        expect(buttons[1].style.display).not.toBe('none');

        visible$.next(false);
        expect(buttons[1].style.display).toBe('none');

        document.body.removeChild(element);
    });

    it('should apply glass effect class', () => {
        const tabs = new TabsBuilder().asGlass();
        const element = tabs.build();
        
        // Check for specific glass classes or structure
        // The header section is the one with border-b
        const header = element.querySelector('.border-b') as HTMLElement;
        expect(header).not.toBeNull();
        
        // Should have transparent border in glass mode
        expect(header.className).toContain('border-transparent');
        
        // Should NOT have background or blur
        expect(header.className).not.toContain('bg-white/60');
        expect(header.className).not.toContain('backdrop-blur-xl');
        expect(header.className).not.toContain('ring-1');
    });

    it('should support keyboard navigation', () => {
        const tabs = new TabsBuilder();
        tabs.addTab().withCaption(of('Tab 1')).withContent(new LabelBuilder().withCaption(of('C1')));
        tabs.addTab().withCaption(of('Tab 2')).withContent(new LabelBuilder().withCaption(of('C2')));
        tabs.addTab().withCaption(of('Tab 3')).withContent(new LabelBuilder().withCaption(of('C3')));

        const element = tabs.build();
        document.body.appendChild(element);

        const tabList = element.querySelector('[role="tablist"]') as HTMLElement;
        const buttons = element.querySelectorAll('button[role="tab"]') as NodeListOf<HTMLButtonElement>;

        // Initially first tab is active
        expect(buttons[0].getAttribute('aria-selected')).toBe('true');
        expect(buttons[0].tabIndex).toBe(0);
        expect(buttons[1].tabIndex).toBe(-1);

        // Focus the first button
        buttons[0].focus();

        // ArrowRight
        tabList.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
        expect(buttons[1].getAttribute('aria-selected')).toBe('true');
        expect(document.activeElement).toBe(buttons[1]);

        // ArrowRight again (wrap around)
        tabList.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
        expect(buttons[2].getAttribute('aria-selected')).toBe('true');
        
        tabList.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
        expect(buttons[0].getAttribute('aria-selected')).toBe('true');

        // ArrowLeft
        tabList.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
        expect(buttons[2].getAttribute('aria-selected')).toBe('true');

        // Home/End
        tabList.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home' }));
        expect(buttons[0].getAttribute('aria-selected')).toBe('true');

        tabList.dispatchEvent(new KeyboardEvent('keydown', { key: 'End' }));
        expect(buttons[2].getAttribute('aria-selected')).toBe('true');

        document.body.removeChild(element);
    });

    it('should skip hidden tabs during keyboard navigation', () => {
        const tabs = new TabsBuilder();
        const visible$ = new BehaviorSubject(false);

        tabs.addTab().withCaption(of('Tab 1')).withContent(new LabelBuilder().withCaption(of('C1')));
        tabs.addTab().withCaption(of('Tab 2')).withVisible(visible$).withContent(new LabelBuilder().withCaption(of('C2')));
        tabs.addTab().withCaption(of('Tab 3')).withContent(new LabelBuilder().withCaption(of('C3')));

        const element = tabs.build();
        document.body.appendChild(element);

        const tabList = element.querySelector('[role="tablist"]') as HTMLElement;
        const buttons = element.querySelectorAll('button[role="tab"]') as NodeListOf<HTMLButtonElement>;

        buttons[0].focus();

        // ArrowRight should skip Tab 2
        tabList.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
        expect(buttons[2].getAttribute('aria-selected')).toBe('true');
        expect(document.activeElement).toBe(buttons[2]);

        document.body.removeChild(element);
    });

});
