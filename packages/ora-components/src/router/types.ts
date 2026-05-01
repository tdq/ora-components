import { ComponentBuilder } from '../core/component-builder';

export type RouteParams = Record<string, string>;

export interface RouteMatch {
    path: string;
    params: RouteParams;
    query: Record<string, string>;
}

export type ContentFactory =
    | ((params: RouteParams) => ComponentBuilder)
    | ((params: RouteParams) => Promise<ComponentBuilder>);

export interface RouteDefinition {
    pattern: string;
    factory: ContentFactory;
    onEnter?: (match: RouteMatch) => void;
    onLeave?: () => void;
}

export interface RouterOptions {
    fallback?: string;
    base?: string;
}
