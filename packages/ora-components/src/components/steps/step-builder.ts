import { Observable } from 'rxjs';

export class StepBuilder {
    caption$?: Observable<string>;
    description$?: Observable<string>;
    visible$?: Observable<boolean>;

    withCaption(caption: Observable<string>): this {
        this.caption$ = caption;
        return this;
    }

    withDescription(description: Observable<string>): this {
        this.description$ = description;
        return this;
    }

    withVisible(visible: Observable<boolean>): this {
        this.visible$ = visible;
        return this;
    }
}
