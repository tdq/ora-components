import { Observable, BehaviorSubject } from 'rxjs';
import { ButtonBuilder, ButtonStyle } from '../button/button';
import { LayoutBuilder, LayoutGap, SlotSize } from '../layout/layout';
import { IToolbarBuilder } from './types';

export class ToolbarBuilder implements IToolbarBuilder {
    private primaryButton?: ButtonBuilder;
    private secondaryButtons: ButtonBuilder[] = [];
    private textButtons: ButtonBuilder[] = [];
    private enabled$?: Observable<boolean>;
    private isGlass$ = new BehaviorSubject<boolean>(false);

    withPrimaryButton(): ButtonBuilder {
        this.primaryButton = new ButtonBuilder().withStyle(new BehaviorSubject(ButtonStyle.FILLED));
        return this.primaryButton;
    }

    addSecondaryButton(): ButtonBuilder {
        const btn = new ButtonBuilder().withStyle(new BehaviorSubject(ButtonStyle.OUTLINED));
        this.secondaryButtons.push(btn);
        return btn;
    }

    addTextButton(): ButtonBuilder {
        const btn = new ButtonBuilder().withStyle(new BehaviorSubject(ButtonStyle.TEXT));
        this.textButtons.push(btn);
        return btn;
    }

    withEnabled(enabled: Observable<boolean>): this {
        this.enabled$ = enabled;
        return this;
    }

    asGlass(): this {
        this.isGlass$.next(true);
        return this;
    }

    build(): HTMLElement {
        const layout = new LayoutBuilder().asHorizontal().withGap(LayoutGap.MEDIUM);

        // Text buttons on the left
        this.textButtons.forEach(btn => {
            if (this.enabled$) btn.withEnabled(this.enabled$);
            if (this.isGlass$.value) btn.asGlass();
            layout.addSlot()
                .withSize(SlotSize.FIT)
                .withContent(btn);
        });

        // Spacer to push remaining buttons to the right
        // No size specified means it will be flex-1 in horizontal layout
        layout.addSlot().withContent({
            build: () => document.createElement('div')
        });

        // Secondary buttons and then primary button on the right
        const rightLayout = new LayoutBuilder().asHorizontal().withGap(LayoutGap.MEDIUM);
        
        this.secondaryButtons.forEach(btn => {
            if (this.enabled$) btn.withEnabled(this.enabled$);
            if (this.isGlass$.value) btn.asGlass();
            rightLayout.addSlot()
                .withSize(SlotSize.FIT)
                .withContent(btn);
        });

        if (this.primaryButton) {
            if (this.enabled$) this.primaryButton.withEnabled(this.enabled$);
            if (this.isGlass$.value) this.primaryButton.asGlass();
            rightLayout.addSlot()
                .withSize(SlotSize.FIT)
                .withContent(this.primaryButton);
        }

        layout.addSlot()
            .withSize(SlotSize.FIT)
            .withContent(rightLayout);

        return layout.build();
    }
}
