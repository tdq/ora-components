import { ContentFactory, RouteDefinition, RouteMatch } from './types';

export class RouteBuilder {
    private pattern: string = '';
    private factory: ContentFactory | null = null;
    private enterCallback?: (match: RouteMatch) => void;
    private leaveCallback?: () => void;

    constructor(private readonly register: (definition: RouteDefinition) => void) {}

    withPattern(pattern: string): this {
        this.pattern = pattern;
        return this;
    }

    withContent(factory: ContentFactory): this {
        this.factory = factory;
        this.commit();
        return this;
    }

    withOnEnter(cb: (match: RouteMatch) => void): this {
        this.enterCallback = cb;
        return this;
    }

    withOnLeave(cb: () => void): this {
        this.leaveCallback = cb;
        return this;
    }

    private commit(): void {
        if (!this.pattern) {
            throw new Error('RouteBuilder: withPattern() must be called before withContent()');
        }
        this.register({
            pattern: this.pattern,
            factory: this.factory!,
            onEnter: this.enterCallback,
            onLeave: this.leaveCallback,
        });
    }
}
