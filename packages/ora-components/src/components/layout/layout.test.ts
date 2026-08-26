import { LayoutBuilder, LayoutGap, SlotSize, Alignment } from './layout';
import { BehaviorSubject, Subject, of } from 'rxjs';
import { ComponentBuilder } from '../../core/component-builder';

class MockBuilder implements ComponentBuilder {
    build(): HTMLElement {
        return document.createElement('div');
    }
}

describe('LayoutBuilder', () => {
    it('should create a flex container', () => {
        const layout = new LayoutBuilder().build();
        expect(layout.classList.contains('flex')).toBe(true);
        expect(layout.classList.contains('w-full')).toBe(true);
    });

    it('should handle vertical layout', () => {
        const layout = new LayoutBuilder().asVertical().build();
        expect(layout.classList.contains('flex-col')).toBe(true);
    });

    it('should handle horizontal layout', () => {
        const layout = new LayoutBuilder().asHorizontal().build();
        expect(layout.classList.contains('flex-row')).toBe(true);
    });

    it('should handle gaps', () => {
        const layout = new LayoutBuilder().withGap(LayoutGap.LARGE).build();
        expect(layout.classList.contains('gap-4')).toBe(true);
    });

    it('should add slots with content', () => {
        const builder = new LayoutBuilder();
        builder.addSlot().withContent(new MockBuilder());
        builder.addSlot().withContent(new MockBuilder());

        const layout = builder.build();
        // 2 slots + 1 element from registerDestroy
        expect(layout.children.length).toBe(3);
    });

    it('should apply slot sizes', () => {
        const builder = new LayoutBuilder();
        builder.addSlot().withSize(SlotSize.HALF);

        const layout = builder.build();
        // Children: [boundary, slot]
        const slot = layout.children[1] as HTMLElement;
        expect(slot.classList.contains('basis-1/2')).toBe(true);
    });

    it('should handle slot visibility', () => {
        const visible$ = new BehaviorSubject(true);
        const builder = new LayoutBuilder();
        builder.addSlot().withVisible(visible$);

        const layout = builder.build();
        // Children: [boundary, slot]
        const slot = layout.children[1] as HTMLElement;
        expect(slot.style.display).toBe('');

        visible$.next(false);
        expect(slot.style.display).toBe('none');
    });

    it('should apply custom class reactively', () => {
        const class$ = new BehaviorSubject('custom-layout');
        const builder = new LayoutBuilder().withClass(class$);

        const layout = builder.build();
        expect(layout.classList.contains('custom-layout')).toBe(true);

        class$.next('another-layout');
        expect(layout.classList.contains('custom-layout')).toBe(false);
        expect(layout.classList.contains('another-layout')).toBe(true);
    });

    it('should apply custom class with of()', () => {
        const builder = new LayoutBuilder().withClass(of('glass-effect'));
        const layout = builder.build();
        expect(layout.classList.contains('glass-effect')).toBe(true);
    });

    it('should handle layout alignment and apply to slots', () => {
        const alignment$ = new BehaviorSubject(Alignment.CENTER);
        const builder = new LayoutBuilder().withAlignment(alignment$);
        builder.addSlot().withContent(new MockBuilder());

        const layout = builder.build();
        // Children: [boundary, slot]
        const slot = layout.children[1] as HTMLElement;
        expect(slot.classList.contains('justify-center')).toBe(true);
        expect(slot.classList.contains('items-center')).toBe(true);

        alignment$.next(Alignment.RIGHT);
        expect(slot.classList.contains('justify-center')).toBe(false);
        expect(slot.classList.contains('justify-end')).toBe(true);
        expect(slot.classList.contains('items-center')).toBe(true);
    });

    it('should allow slot alignment to override layout alignment', () => {
        const layoutAlignment$ = new BehaviorSubject(Alignment.CENTER);
        const slotAlignment$ = new BehaviorSubject(Alignment.RIGHT);
        
        const builder = new LayoutBuilder().withAlignment(layoutAlignment$);
        builder.addSlot()
            .withAlignment(slotAlignment$)
            .withContent(new MockBuilder());

        const layout = builder.build();
        // Children: [boundary, slot]
        const slot = layout.children[1] as HTMLElement;
        
        expect(slot.classList.contains('justify-end')).toBe(true);
        
        slotAlignment$.next(Alignment.LEFT);
        expect(slot.classList.contains('justify-end')).toBe(false);
        expect(slot.classList.contains('justify-start')).toBe(true);
    });


    it('should handle layout alignment on horizontal container', () => {
        const alignment$ = new BehaviorSubject(Alignment.CENTER);
        const builder = new LayoutBuilder().asHorizontal().withAlignment(alignment$);

        const layout = builder.build();
        expect(layout.classList.contains('justify-center')).toBe(true);

        alignment$.next(Alignment.RIGHT);
        expect(layout.classList.contains('justify-center')).toBe(false);
        expect(layout.classList.contains('justify-end')).toBe(true);
    });

    describe('SlotSize.GROW', () => {
        it('should apply grow classes in a vertical layout', () => {
            const builder = new LayoutBuilder().asVertical();
            builder.addSlot().withSize(SlotSize.GROW);
            const slot = builder.build().children[1] as HTMLElement;
            expect(slot.classList.contains('flex-1')).toBe(true);
            expect(slot.classList.contains('min-h-0')).toBe(true);
            expect(slot.classList.contains('w-full')).toBe(true);
        });

        it('should apply grow classes in a horizontal layout', () => {
            const builder = new LayoutBuilder().asHorizontal();
            builder.addSlot().withSize(SlotSize.GROW);
            const slot = builder.build().children[1] as HTMLElement;
            expect(slot.classList.contains('flex-1')).toBe(true);
            expect(slot.classList.contains('min-w-0')).toBe(true);
            expect(slot.classList.contains('min-h-0')).toBe(false);
        });

        it('should add h-full min-h-0 to the container only when a slot is GROW', () => {
            const plain = new LayoutBuilder().asVertical();
            plain.addSlot().withSize(SlotSize.HALF);
            const plainLayout = plain.build();
            expect(plainLayout.classList.contains('h-full')).toBe(false);
            expect(plainLayout.classList.contains('min-h-0')).toBe(false);

            const grow = new LayoutBuilder().asVertical();
            grow.addSlot().withSize(SlotSize.GROW);
            const growLayout = grow.build();
            expect(growLayout.classList.contains('h-full')).toBe(true);
            expect(growLayout.classList.contains('min-h-0')).toBe(true);
        });

        it('should add min-w-0 but not h-full to a horizontal container with a GROW slot', () => {
            const builder = new LayoutBuilder().asHorizontal();
            builder.addSlot().withSize(SlotSize.GROW);
            const layout = builder.build();
            expect(layout.classList.contains('min-w-0')).toBe(true);
            expect(layout.classList.contains('h-full')).toBe(false);
        });

        it('should keep a vertical GROW slot items-stretch while a sibling non-GROW slot keeps items-center', () => {
            const alignment$ = new BehaviorSubject(Alignment.CENTER);
            const builder = new LayoutBuilder().asVertical().withAlignment(alignment$);
            builder.addSlot().withSize(SlotSize.GROW);
            builder.addSlot();

            const layout = builder.build();
            // Children: [boundary, growSlot, plainSlot]
            const growSlot = layout.children[1] as HTMLElement;
            const plainSlot = layout.children[2] as HTMLElement;

            expect(growSlot.classList.contains('justify-center')).toBe(true);
            expect(growSlot.classList.contains('items-center')).toBe(false);

            expect(plainSlot.classList.contains('justify-center')).toBe(true);
            expect(plainSlot.classList.contains('items-center')).toBe(true);
        });
    });

    describe('data-slot', () => {
        it('should default to the slot index', () => {
            const builder = new LayoutBuilder();
            builder.addSlot();
            builder.addSlot();
            const layout = builder.build();
            expect((layout.children[1] as HTMLElement).dataset.slot).toBe('0');
            expect((layout.children[2] as HTMLElement).dataset.slot).toBe('1');
        });

        it('should use the name from withName', () => {
            const builder = new LayoutBuilder();
            builder.addSlot().withName('header');
            builder.addSlot();
            const layout = builder.build();
            expect((layout.children[1] as HTMLElement).dataset.slot).toBe('header');
            expect((layout.children[2] as HTMLElement).dataset.slot).toBe('1');
        });

        it('should fall back to the index when withName is given an empty string', () => {
            const builder = new LayoutBuilder();
            builder.addSlot().withName('');
            const layout = builder.build();
            expect((layout.children[1] as HTMLElement).dataset.slot).toBe('0');
        });
    });

    describe('duplicate data-slot dev warning', () => {
        let warnSpy: jest.SpyInstance;

        beforeEach(() => {
            warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
        });

        afterEach(() => {
            warnSpy.mockRestore();
        });

        it('warns and still emits the duplicate names verbatim when two withName calls collide', () => {
            const builder = new LayoutBuilder();
            builder.addSlot().withName('header');
            builder.addSlot().withName('header');
            const layout = builder.build();

            expect((layout.children[1] as HTMLElement).dataset.slot).toBe('header');
            expect((layout.children[2] as HTMLElement).dataset.slot).toBe('header');
            expect(warnSpy).toHaveBeenCalledTimes(1);
            expect(warnSpy.mock.calls[0][0]).toContain('header');
        });

        it('warns when a withName collides with another slot\'s default index', () => {
            const builder = new LayoutBuilder();
            builder.addSlot();          // default data-slot="0"
            builder.addSlot().withName('0');
            const layout = builder.build();

            expect((layout.children[1] as HTMLElement).dataset.slot).toBe('0');
            expect((layout.children[2] as HTMLElement).dataset.slot).toBe('0');
            expect(warnSpy).toHaveBeenCalledTimes(1);
        });

        it('does not warn when every data-slot value is unique', () => {
            const builder = new LayoutBuilder();
            builder.addSlot().withName('header');
            builder.addSlot();
            builder.addSlot().withName('footer');
            builder.build();

            expect(warnSpy).not.toHaveBeenCalled();
        });
    });
});

describe('LayoutBuilder — A5a additional coverage', () => {
    const subjects: Subject<any>[] = [];
    const hosts: HTMLElement[] = [];

    const track = <T>(s: Subject<T>): Subject<T> => {
        subjects.push(s);
        return s;
    };

    afterEach(() => {
        subjects.splice(0).forEach(s => s.complete());
        hosts.splice(0).forEach(h => h.remove());
    });

    class WrapBuilder implements ComponentBuilder {
        constructor(private readonly el: HTMLElement) {}
        build(): HTMLElement {
            return this.el;
        }
    }

    describe('no-GROW class parity with HEAD', () => {
        it('produces the pre-GROW container classes for a vertical layout without GROW', () => {
            const builder = new LayoutBuilder().asVertical();
            builder.addSlot().withSize(SlotSize.HALF);
            const layout = builder.build();
            expect(layout.className).toBe('flex w-full flex-col gap-2');
        });

        it('produces the pre-GROW container classes for a horizontal layout without GROW', () => {
            const builder = new LayoutBuilder().asHorizontal().withGap(LayoutGap.LARGE);
            builder.addSlot().withSize(SlotSize.THIRD);
            const layout = builder.build();
            expect(layout.className).toBe('flex w-full flex-row gap-4');
        });

        it('produces the pre-GROW slot classes for a vertical slot without GROW', () => {
            const builder = new LayoutBuilder().asVertical();
            builder.addSlot().withSize(SlotSize.HALF);
            const slot = builder.build().children[1] as HTMLElement;
            expect(slot.className).toBe('flex basis-1/2 w-full');
        });

        it('produces the pre-GROW slot classes for an auto-sized horizontal slot', () => {
            const builder = new LayoutBuilder().asHorizontal();
            builder.addSlot();
            const slot = builder.build().children[1] as HTMLElement;
            expect(slot.className).toBe('flex flex-1');
        });

        it('keeps justify-* and items-center on an aligned non-GROW slot', () => {
            const builder = new LayoutBuilder().asVertical().withAlignment(of(Alignment.RIGHT));
            builder.addSlot().withSize(SlotSize.FIT);
            const slot = builder.build().children[1] as HTMLElement;
            expect(slot.className).toBe('flex flex-none w-full justify-end items-center');
        });
    });

    describe('nested layouts', () => {
        it('puts h-full min-h-0 on the inner container of a vertical GROW slot holding a vertical GROW layout', () => {
            const inner = new LayoutBuilder().asVertical();
            inner.addSlot().withSize(SlotSize.GROW).withContent(new MockBuilder());
            const innerEl = inner.build();

            const outer = new LayoutBuilder().asVertical();
            outer.addSlot().withSize(SlotSize.GROW).withContent(new WrapBuilder(innerEl));
            const outerEl = outer.build();

            const outerSlot = outerEl.children[1] as HTMLElement;
            expect(outerSlot.classList.contains('flex-1')).toBe(true);
            expect(outerSlot.classList.contains('min-h-0')).toBe(true);
            expect(outerSlot.classList.contains('w-full')).toBe(true);

            const nested = outerSlot.querySelector(':scope > div') as HTMLElement;
            expect(nested).toBe(innerEl);
            expect(nested.classList.contains('h-full')).toBe(true);
            expect(nested.classList.contains('min-h-0')).toBe(true);
            expect(nested.classList.contains('flex-col')).toBe(true);
        });

        it('does not leak h-full to an inner layout that has no GROW slot', () => {
            const inner = new LayoutBuilder().asVertical();
            inner.addSlot().withSize(SlotSize.HALF);
            const innerEl = inner.build();

            const outer = new LayoutBuilder().asVertical();
            outer.addSlot().withSize(SlotSize.GROW).withContent(new WrapBuilder(innerEl));
            outer.build();

            expect(innerEl.classList.contains('h-full')).toBe(false);
            expect(innerEl.className).toBe('flex w-full flex-col gap-2');
        });
    });

    describe('withName on multiple slots', () => {
        it('names every slot independently and mixes named and unnamed slots', () => {
            const builder = new LayoutBuilder().asVertical();
            builder.addSlot().withName('header');
            builder.addSlot().withName('body');
            builder.addSlot();
            builder.addSlot().withName('footer');

            const layout = builder.build();
            const names = Array.from(layout.children)
                .slice(1)
                .map(c => (c as HTMLElement).dataset.slot);
            expect(names).toEqual(['header', 'body', '2', 'footer']);
        });

        it('keeps the name on a GROW slot', () => {
            const builder = new LayoutBuilder().asVertical();
            builder.addSlot().withName('content').withSize(SlotSize.GROW);
            const slot = builder.build().children[1] as HTMLElement;
            expect(slot.dataset.slot).toBe('content');
            expect(slot.classList.contains('min-h-0')).toBe(true);
        });

        it('falls back to the index for an empty name among named siblings', () => {
            const builder = new LayoutBuilder();
            builder.addSlot().withName('a');
            builder.addSlot().withName('');
            const layout = builder.build();
            expect((layout.children[1] as HTMLElement).dataset.slot).toBe('a');
            expect((layout.children[2] as HTMLElement).dataset.slot).toBe('1');
        });
    });

    describe('GROW with reactive inputs', () => {
        it('hides a GROW wrapper when withVisible emits false and keeps the container grow classes', () => {
            const visible$ = track(new BehaviorSubject(true));
            const builder = new LayoutBuilder().asVertical();
            builder.addSlot().withSize(SlotSize.GROW).withVisible(visible$).withContent(new MockBuilder());
            const layout = builder.build();
            const slot = layout.children[1] as HTMLElement;

            expect(slot.style.display).toBe('');
            expect(slot.classList.contains('flex-1')).toBe(true);

            visible$.next(false);
            expect(slot.style.display).toBe('none');
            // a hidden GROW slot still counts towards the container sizing
            expect(layout.classList.contains('h-full')).toBe(true);
            expect(layout.classList.contains('min-h-0')).toBe(true);
            // classes survive the visibility toggle
            expect(slot.classList.contains('flex-1')).toBe(true);
            expect(slot.classList.contains('min-h-0')).toBe(true);

            visible$.next(true);
            expect(slot.style.display).toBe('');
        });

        it('starts hidden when withVisible emits false first', () => {
            const visible$ = track(new BehaviorSubject(false));
            const builder = new LayoutBuilder().asHorizontal();
            builder.addSlot().withSize(SlotSize.GROW).withVisible(visible$);
            const slot = builder.build().children[1] as HTMLElement;
            expect(slot.style.display).toBe('none');
            expect(slot.classList.contains('min-w-0')).toBe(true);
        });

        it('merges withClass over the GROW container classes', () => {
            const class$ = track(new BehaviorSubject('bg-red-500'));
            const builder = new LayoutBuilder().asVertical().withClass(class$);
            builder.addSlot().withSize(SlotSize.GROW);
            const layout = builder.build();

            expect(layout.classList.contains('h-full')).toBe(true);
            expect(layout.classList.contains('min-h-0')).toBe(true);
            expect(layout.classList.contains('bg-red-500')).toBe(true);

            // twMerge lets a caller-supplied height win over the GROW default
            class$.next('h-64');
            expect(layout.classList.contains('h-full')).toBe(false);
            expect(layout.classList.contains('h-64')).toBe(true);
            expect(layout.classList.contains('min-h-0')).toBe(true);
            expect(layout.classList.contains('bg-red-500')).toBe(false);
        });

        it('re-applies GROW alignment on every emission without re-adding items-center', () => {
            const alignment$ = track(new BehaviorSubject(Alignment.LEFT));
            const builder = new LayoutBuilder().asVertical().withAlignment(alignment$);
            builder.addSlot().withSize(SlotSize.GROW);
            const slot = builder.build().children[1] as HTMLElement;

            expect(slot.className).toBe('flex flex-1 w-full min-h-0 justify-start');

            alignment$.next(Alignment.CENTER);
            expect(slot.className).toBe('flex flex-1 w-full min-h-0 justify-center');
            expect(slot.classList.contains('items-center')).toBe(false);
        });
    });

    describe('lifecycle', () => {
        it('unsubscribes container and slot streams after connect → update → disconnect', () => {
            const host = document.createElement('div');
            hosts.push(host);
            document.body.appendChild(host);

            const class$ = track(new Subject<string>());
            const visible$ = track(new Subject<boolean>());

            const builder = new LayoutBuilder().asVertical().withClass(class$);
            builder.addSlot().withName('grow').withSize(SlotSize.GROW).withVisible(visible$);
            const layout = builder.build();
            host.appendChild(layout);

            // update
            class$.next('p-4');
            visible$.next(false);
            expect(layout.classList.contains('p-4')).toBe(true);
            expect((layout.children[1] as HTMLElement).style.display).toBe('none');

            expect(class$.observed).toBe(true);
            expect(visible$.observed).toBe(true);

            // disconnect
            layout.remove();
            expect(class$.observed).toBe(false);
            expect(visible$.observed).toBe(false);

            // late emissions after teardown must not touch the detached DOM
            class$.next('p-8');
            visible$.next(true);
            expect(layout.classList.contains('p-8')).toBe(false);
            expect((layout.children[1] as HTMLElement).style.display).toBe('none');
        });

        it('does not throw when a GROW layout is built without being connected to the DOM', () => {
            const builder = new LayoutBuilder().asVertical();
            builder.addSlot().withSize(SlotSize.GROW).withContent(new MockBuilder());
            expect(() => builder.build()).not.toThrow();
        });

        it('handles an empty layout with no slots', () => {
            const layout = new LayoutBuilder().asVertical().build();
            expect(layout.classList.contains('h-full')).toBe(false);
            expect(Array.from(layout.children).filter(c => c.tagName === 'DIV').length).toBe(0);
        });
    });
});

describe('LayoutBuilder — duplicate data-slot warning, edge cases', () => {
    let warnSpy: jest.SpyInstance;

    beforeEach(() => {
        warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
        warnSpy.mockRestore();
    });

    it('warns once per distinct duplicate name, not once per colliding slot', () => {
        const builder = new LayoutBuilder();
        builder.addSlot().withName('a');
        builder.addSlot().withName('a');
        builder.addSlot().withName('a');
        builder.build();

        expect(warnSpy).toHaveBeenCalledTimes(1);
        expect(warnSpy.mock.calls[0][0]).toContain('"a"');
    });

    it('warns once for each of two different duplicated names', () => {
        const builder = new LayoutBuilder();
        builder.addSlot().withName('a');
        builder.addSlot().withName('b');
        builder.addSlot().withName('a');
        builder.addSlot().withName('b');
        builder.addSlot().withName('c');
        builder.build();

        expect(warnSpy).toHaveBeenCalledTimes(2);
        const messages = warnSpy.mock.calls.map(c => c[0]).join('\n');
        expect(messages).toContain('"a"');
        expect(messages).toContain('"b"');
        expect(messages).not.toContain('"c"');
    });

    it('does not warn for the all-default index naming of many slots', () => {
        const builder = new LayoutBuilder();
        for (let i = 0; i < 5; i++) builder.addSlot();
        builder.build();
        expect(warnSpy).not.toHaveBeenCalled();
    });

    it('does not warn when withName("") falls back to the slot index without colliding', () => {
        const builder = new LayoutBuilder();
        builder.addSlot().withName('');
        builder.addSlot().withName('');
        const layout = builder.build();
        expect((layout.children[1] as HTMLElement).dataset.slot).toBe('0');
        expect((layout.children[2] as HTMLElement).dataset.slot).toBe('1');
        expect(warnSpy).not.toHaveBeenCalled();
    });

    it('stays silent in a production build', () => {
        const previous = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';
        try {
            const builder = new LayoutBuilder();
            builder.addSlot().withName('dup');
            builder.addSlot().withName('dup');
            const layout = builder.build();
            expect(warnSpy).not.toHaveBeenCalled();
            // behaviour is unchanged — names are still emitted verbatim
            expect((layout.children[1] as HTMLElement).dataset.slot).toBe('dup');
            expect((layout.children[2] as HTMLElement).dataset.slot).toBe('dup');
        } finally {
            process.env.NODE_ENV = previous;
        }
    });

    it('does not warn for a duplicate-free GROW layout and keeps the GROW classes', () => {
        const builder = new LayoutBuilder().asVertical();
        builder.addSlot().withName('toolbar');
        builder.addSlot().withName('content').withSize(SlotSize.GROW);
        const layout = builder.build();

        expect(warnSpy).not.toHaveBeenCalled();
        expect(layout.classList.contains('h-full')).toBe(true);
        expect((layout.children[2] as HTMLElement).className).toBe('flex flex-1 w-full min-h-0');
    });
});
