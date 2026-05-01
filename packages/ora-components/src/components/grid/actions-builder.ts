import { GridAction } from './types';

export class ActionBuilder<ITEM> {
    constructor(private action: GridAction<ITEM>) {}

    withEnable(enable: (item: ITEM) => boolean): this {
        this.action.enable = enable;
        return this;
    }

    withVisible(visible: (item: ITEM) => boolean): this {
        this.action.visible = visible;
        return this;
    }
}

export class ActionsBuilder<ITEM> {
    private actions: GridAction<ITEM>[] = [];

    addAction(icon: string, label: string, onClick: (item: ITEM) => void): ActionBuilder<ITEM> {
        if (typeof icon !== 'string' || !icon.trim()) throw new Error('ActionsBuilder.addAction: icon SVG is required');
        if (!icon.trim().startsWith('<svg')) throw new Error('ActionsBuilder.addAction: icon must be an SVG string');
        if (typeof label !== 'string' || !label.trim()) throw new Error('ActionsBuilder.addAction: label must be a non-empty string');
        const action: GridAction<ITEM> = { icon, label, onClick };
        this.actions.push(action);
        return new ActionBuilder<ITEM>(action);
    }

    build(): GridAction<ITEM>[] {
        return [...this.actions];
    }
}
