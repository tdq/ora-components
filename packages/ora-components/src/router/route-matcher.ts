import { RouteDefinition, RouteMatch, RouteParams } from './types';

interface ParsedPattern {
    regex: RegExp;
    paramNames: string[];
    isExact: boolean;
    isWildcard: boolean;
}

export function parsePattern(pattern: string): ParsedPattern {
    if (pattern === '*') {
        return { regex: /.*/, paramNames: [], isExact: false, isWildcard: true };
    }

    const paramNames: string[] = [];
    // Replace {paramName} with a named capture group
    const regexSource = pattern.replace(/\{([^}]+)\}/g, (_, name) => {
        paramNames.push(name);
        return '([^/]+)';
    });

    // Exact match: anchor to full string
    const regex = new RegExp(`^${regexSource}$`);
    const isExact = paramNames.length === 0;

    return { regex, paramNames, isExact, isWildcard: false };
}

export function parseQuery(search: string): Record<string, string> {
    const result: Record<string, string> = {};
    if (!search || search === '?') return result;

    const qs = search.startsWith('?') ? search.slice(1) : search;
    for (const pair of qs.split('&')) {
        const [key, value] = pair.split('=');
        if (key) {
            result[decodeURIComponent(key)] = decodeURIComponent(value ?? '');
        }
    }
    return result;
}

export function matchRoute(
    pathname: string,
    routes: RouteDefinition[],
    search = ''
): { definition: RouteDefinition; match: RouteMatch } | null {
    // Priority 1: exact static match (no params, not wildcard)
    for (const definition of routes) {
        const parsed = parsePattern(definition.pattern);
        if (parsed.isExact && !parsed.isWildcard) {
            const m = pathname.match(parsed.regex);
            if (m) {
                return { definition, match: buildMatch(pathname, {}, search) };
            }
        }
    }

    // Priority 2: parameterized match (first registered wins)
    for (const definition of routes) {
        const parsed = parsePattern(definition.pattern);
        if (!parsed.isExact && !parsed.isWildcard) {
            const m = pathname.match(parsed.regex);
            if (m) {
                const params: RouteParams = {};
                parsed.paramNames.forEach((name, i) => {
                    params[name] = decodeURIComponent(m[i + 1]);
                });
                return { definition, match: buildMatch(pathname, params, search) };
            }
        }
    }

    // Priority 3: wildcard
    for (const definition of routes) {
        const parsed = parsePattern(definition.pattern);
        if (parsed.isWildcard) {
            return { definition, match: buildMatch(pathname, {}, search) };
        }
    }

    return null;
}

function buildMatch(path: string, params: RouteParams, search: string): RouteMatch {
    return { path, params, query: parseQuery(search) };
}
