import { GridAction } from './types';

export class ActionsBuilder<ITEM> {
    private actions: GridAction<ITEM>[] = [];

    addAction(label: string, onClick: (item: ITEM) => void): this {
        this.actions.push({ label, onClick });
        return this;
    }

    addIconAction(icon: string, onClick: (item: ITEM) => void): this {
        this.actions.push({ label: '', icon, onClick });
        return this;
    }

    build(): GridAction<ITEM>[] {
        return this.actions;
    }
}
