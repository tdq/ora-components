import { Observable, of } from 'rxjs';
import { ButtonBuilder, ButtonStyle } from '../button/button';
import { LayoutBuilder, LayoutGap, SlotSize, Alignment } from '../layout/layout';
import { TOOLBAR_STYLES } from './styles';
import { ComponentBuilder } from '@/core/component-builder';


export class ToolbarBuilder implements ComponentBuilder {
    private primaryButton?: ButtonBuilder;
    private secondaryButtons: ButtonBuilder[] = [];
    private textButtons: ButtonBuilder[] = [];
    private enabled$?: Observable<boolean>;
    private isGlass: boolean = false;

    withPrimaryButton(): ButtonBuilder {
        this.primaryButton = new ButtonBuilder().withStyle(of(ButtonStyle.FILLED));
        return this.primaryButton;
    }

    addSecondaryButton(): ButtonBuilder {
        const btn = new ButtonBuilder().withStyle(of(ButtonStyle.OUTLINED));
        this.secondaryButtons.push(btn);
        return btn;
    }

    addTextButton(): ButtonBuilder {
        const btn = new ButtonBuilder().withStyle(of(ButtonStyle.TEXT));
        this.textButtons.push(btn);
        return btn;
    }

    withEnabled(enabled: Observable<boolean>): this {
        this.enabled$ = enabled;
        return this;
    }

    asGlass(): this {
        this.isGlass = true;
        return this;
    }

    build(): HTMLElement {
        const hasLeft = this.textButtons.length > 0;
        const hasRight = this.secondaryButtons.length > 0 || !!this.primaryButton;

        if (hasLeft && hasRight) {
            const layout = new LayoutBuilder()
                .asHorizontal()
                .withClass(of(TOOLBAR_STYLES.container));

            const leftLayout = new LayoutBuilder()
                .asHorizontal()
                .withGap(LayoutGap.MEDIUM);
            
            this.textButtons.forEach(btn => this.addButtonToLayout(btn, leftLayout, Alignment.LEFT, this.isGlass));
            layout.addSlot().withContent(leftLayout);

            const rightLayout = new LayoutBuilder()
                .asHorizontal()
                .withGap(LayoutGap.MEDIUM)
                .withAlignment(of(Alignment.RIGHT));

            this.secondaryButtons.forEach(btn => this.addButtonToLayout(btn, rightLayout, Alignment.RIGHT, this.isGlass));
            if (this.primaryButton) {
                this.addButtonToLayout(this.primaryButton, rightLayout, Alignment.RIGHT, this.isGlass);
            }
            layout.addSlot()
                .withAlignment(of(Alignment.RIGHT))
                .withContent(rightLayout);

            return layout.build();
        }

        if (hasLeft) {
            const leftLayout = new LayoutBuilder()
                .asHorizontal()
                .withGap(LayoutGap.MEDIUM)
                .withClass(of(TOOLBAR_STYLES.container));
            this.textButtons.forEach(btn => this.addButtonToLayout(btn, leftLayout, Alignment.LEFT, this.isGlass));
            return leftLayout.build();
        }

        if (hasRight) {
            const rightLayout = new LayoutBuilder()
                .asHorizontal()
                .withGap(LayoutGap.MEDIUM)
                .withAlignment(of(Alignment.RIGHT))
                .withClass(of(TOOLBAR_STYLES.container));
            this.secondaryButtons.forEach(btn => this.addButtonToLayout(btn, rightLayout, Alignment.RIGHT, this.isGlass ));
            if (this.primaryButton) {
                this.addButtonToLayout(this.primaryButton, rightLayout, Alignment.RIGHT, this.isGlass);
            }
            return rightLayout.build();
        }

        return new LayoutBuilder()
            .asHorizontal()
            .withClass(of(TOOLBAR_STYLES.container))
            .build();
    }

    private addButtonToLayout(btn: ButtonBuilder, layout: LayoutBuilder, alignment: Alignment, isGlass: boolean ): void {
        if (this.enabled$) {
            btn.withEnabled(this.enabled$);
        }
        
        if (isGlass) {
            btn.asGlass();
        }

        layout.addSlot()
            .withAlignment(of(alignment))
            .withSize(SlotSize.FIT)
            .withContent(btn);
    }
}
