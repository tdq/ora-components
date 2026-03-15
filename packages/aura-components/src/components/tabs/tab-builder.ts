import { Observable } from 'rxjs';
import { ComponentBuilder } from '../../core/component-builder';

export class TabBuilder {
    caption$?: Observable<string>;
    content?: ComponentBuilder;
    visible$?: Observable<boolean>;

    withCaption(caption: Observable<string>): this {
        this.caption$ = caption;
        return this;
    }

    withContent(content: ComponentBuilder): this {
        this.content = content;
        return this;
    }

    withVisible(visible: Observable<boolean>): this {
        this.visible$ = visible;
        return this;
    }
}
