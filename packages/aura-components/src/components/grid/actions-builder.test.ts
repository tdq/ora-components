import { Icons } from '@/core/icons';
import { ActionsBuilder, ActionBuilder } from './actions-builder';

describe('ActionsBuilder', () => {
    let onClick: jest.Mock;

    beforeEach(() => {
        onClick = jest.fn();
    });

    it('should add an action with icon, label, and onClick', () => {
        const builder = new ActionsBuilder<any>();
        builder.addAction(Icons.EDIT, 'Edit', onClick);
        const actions = builder.build();

        expect(actions.length).toBe(1);
        expect(actions[0].icon).toBe(Icons.EDIT);
        expect(actions[0].label).toBe('Edit');
        expect(actions[0].onClick).toBe(onClick);
    });

    it('should return all added actions from build()', () => {
        const onClick2 = jest.fn();
        const builder = new ActionsBuilder<any>();
        builder.addAction(Icons.EDIT, 'Edit', onClick);
        builder.addAction(Icons.DELETE, 'Delete', onClick2);
        const actions = builder.build();

        expect(actions.length).toBe(2);
        expect(actions[0].icon).toBe(Icons.EDIT);
        expect(actions[1].icon).toBe(Icons.DELETE);
    });

    it('should return a defensive copy from build()', () => {
        const builder = new ActionsBuilder<any>();
        builder.addAction(Icons.EDIT, 'Edit', onClick);

        const first = builder.build();
        first.push({ icon: Icons.DELETE, label: 'Delete', onClick });

        const second = builder.build();
        expect(second.length).toBe(1);
    });

    it('should throw when icon is an empty string', () => {
        const builder = new ActionsBuilder<any>();
        expect(() => builder.addAction('', 'Edit', onClick)).toThrow();
    });

    it('should throw when icon is whitespace-only', () => {
        const builder = new ActionsBuilder<any>();
        expect(() => builder.addAction('   ', 'Edit', onClick)).toThrow();
    });

    it('should throw when label is an empty string', () => {
        const builder = new ActionsBuilder<any>();
        expect(() => builder.addAction(Icons.EDIT, '', onClick)).toThrow();
    });

    it('should throw when label is whitespace-only', () => {
        const builder = new ActionsBuilder<any>();
        expect(() => builder.addAction(Icons.EDIT, '   ', onClick)).toThrow();
    });

    it('addAction returns an ActionBuilder, not ActionsBuilder', () => {
        const builder = new ActionsBuilder<any>();
        const result = builder.addAction(Icons.EDIT, 'Edit', onClick);

        expect(result).toBeInstanceOf(ActionBuilder);
        expect(result).not.toBe(builder);
    });

    it('addAction does not support direct chaining back to ActionsBuilder', () => {
        // Per spec: addAction returns ActionBuilder, so chaining .addAction on the
        // result would call ActionBuilder#addAction which does not exist.
        const builder = new ActionsBuilder<any>();
        const actionBuilder = builder.addAction(Icons.EDIT, 'Edit', onClick);

        expect((actionBuilder as any).addAction).toBeUndefined();
    });
});

describe('ActionBuilder', () => {
    let onClick: jest.Mock;

    beforeEach(() => {
        onClick = jest.fn();
    });

    describe('withEnable', () => {
        it('should set enable predicate on the underlying action', () => {
            const enable = (item: any) => true;
            const actionsBuilder = new ActionsBuilder<any>();
            actionsBuilder.addAction(Icons.EDIT, 'Edit', onClick).withEnable(enable);
    
            const actions = actionsBuilder.build();
            expect(actions[0].enable).toBe(enable);
        });
    
        it('should return the same ActionBuilder instance for chaining', () => {
            const enable = (item: any) => true;
            const actionsBuilder = new ActionsBuilder<any>();
            const actionBuilder = actionsBuilder.addAction(Icons.EDIT, 'Edit', onClick);
            const returned = actionBuilder.withEnable(enable);
    
            expect(returned).toBe(actionBuilder);
        });
    
        it('action.enable predicate can be called', () => {
            const enable = (item: { active: boolean }) => item.active;
            const actionsBuilder = new ActionsBuilder<any>();
            actionsBuilder.addAction(Icons.EDIT, 'Edit', onClick).withEnable(enable);
    
            const actions = actionsBuilder.build();
            expect(actions[0].enable!({ active: false })).toBe(false);
            expect(actions[0].enable!({ active: true })).toBe(true);
        });
    
        it('action.enable is undefined when withEnable is not called', () => {
            const actionsBuilder = new ActionsBuilder<any>();
            actionsBuilder.addAction(Icons.EDIT, 'Edit', onClick);
    
            const actions = actionsBuilder.build();
            expect(actions[0].enable).toBeUndefined();
        });
    });

    describe('withVisible', () => {
        it('should set visible predicate on the underlying action', () => {
            const visible = (item: any) => true;
            const actionsBuilder = new ActionsBuilder<any>();
            actionsBuilder.addAction(Icons.EDIT, 'Edit', onClick).withVisible(visible);
    
            const actions = actionsBuilder.build();
            expect(actions[0].visible).toBe(visible);
        });
    
        it('should return the same ActionBuilder instance for chaining', () => {
            const visible = (item: any) => true;
            const actionsBuilder = new ActionsBuilder<any>();
            const actionBuilder = actionsBuilder.addAction(Icons.EDIT, 'Edit', onClick);
            const returned = actionBuilder.withVisible(visible);
    
            expect(returned).toBe(actionBuilder);
        });
    
        it('action.visible predicate can be called', () => {
            const visible = (item: { show: boolean }) => item.show;
            const actionsBuilder = new ActionsBuilder<any>();
            actionsBuilder.addAction(Icons.EDIT, 'Edit', onClick).withVisible(visible);
    
            const actions = actionsBuilder.build();
            expect(actions[0].visible!({ show: true })).toBe(true);
            expect(actions[0].visible!({ show: false })).toBe(false);
        });
    
        it('action.visible is undefined when withVisible is not called', () => {
            const actionsBuilder = new ActionsBuilder<any>();
            actionsBuilder.addAction(Icons.EDIT, 'Edit', onClick);
    
            const actions = actionsBuilder.build();
            expect(actions[0].visible).toBeUndefined();
        });
    });

    describe('chaining withEnable and withVisible', () => {
        it('should allow chaining withEnable followed by withVisible', () => {
            const enable = (item: any) => true;
            const visible = (item: any) => true;
            const actionsBuilder = new ActionsBuilder<any>();
            actionsBuilder
                .addAction(Icons.EDIT, 'Edit', onClick)
                .withEnable(enable)
                .withVisible(visible);
    
            const actions = actionsBuilder.build();
            expect(actions[0].enable).toBe(enable);
            expect(actions[0].visible).toBe(visible);
        });
    
        it('should allow chaining withVisible followed by withEnable', () => {
            const enable = (item: any) => false;
            const visible = (item: any) => false;
            const actionsBuilder = new ActionsBuilder<any>();
            actionsBuilder
                .addAction(Icons.DELETE, 'Delete', onClick)
                .withVisible(visible)
                .withEnable(enable);
    
            const actions = actionsBuilder.build();
            expect(actions[0].enable).toBe(enable);
            expect(actions[0].visible).toBe(visible);
        });
    
        it('enable and visible predicates on separate actions are independent', () => {
            const enable = (item: any) => true;
            const visible = (item: any) => false;
            const actionsBuilder = new ActionsBuilder<any>();
            actionsBuilder.addAction(Icons.EDIT, 'Edit', onClick).withEnable(enable);
            actionsBuilder.addAction(Icons.DELETE, 'Delete', onClick).withVisible(visible);
    
            const actions = actionsBuilder.build();
            expect(actions[0].enable).toBe(enable);
            expect(actions[0].visible).toBeUndefined();
            expect(actions[1].enable).toBeUndefined();
            expect(actions[1].visible).toBe(visible);
        });
    });

    describe('build() defensive copy preserves enable/visible', () => {
        it('enable and visible predicates survive the defensive copy', () => {
            const enable = (item: any) => true;
            const visible = (item: any) => true;
            const actionsBuilder = new ActionsBuilder<any>();
            actionsBuilder
                .addAction(Icons.EDIT, 'Edit', onClick)
                .withEnable(enable)
                .withVisible(visible);
    
            const copy1 = actionsBuilder.build();
            const copy2 = actionsBuilder.build();
    
            // Copies are distinct arrays
            expect(copy1).not.toBe(copy2);
            // But the action objects (and their predicates) are the same references
            expect(copy1[0].enable).toBe(enable);
            expect(copy2[0].visible).toBe(visible);
        });
    });
});
