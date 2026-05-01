import { matchRoute, parsePattern, parseQuery } from './route-matcher';
import { RouteDefinition } from './types';


const makeRoute = (pattern: string): RouteDefinition => ({
    pattern,
    factory: () => ({ build: () => document.createElement('div') }),
});

describe('parsePattern', () => {
    it('parses static pattern with no params', () => {
        const p = parsePattern('/about');
        expect(p.isExact).toBe(true);
        expect(p.isWildcard).toBe(false);
        expect('/about'.match(p.regex)).not.toBeNull();
        expect('/other'.match(p.regex)).toBeNull();
    });

    it('parses parameterized pattern', () => {
        const p = parsePattern('/product/{id}');
        expect(p.isExact).toBe(false);
        expect(p.paramNames).toEqual(['id']);
        const m = '/product/42'.match(p.regex);
        expect(m).not.toBeNull();
        expect(m![1]).toBe('42');
    });

    it('parses multiple params', () => {
        const p = parsePattern('/users/{userId}/posts/{postId}');
        expect(p.paramNames).toEqual(['userId', 'postId']);
        const m = '/users/5/posts/99'.match(p.regex);
        expect(m![1]).toBe('5');
        expect(m![2]).toBe('99');
    });

    it('parses wildcard', () => {
        const p = parsePattern('*');
        expect(p.isWildcard).toBe(true);
        expect('/anything/goes'.match(p.regex)).not.toBeNull();
    });
});

describe('parseQuery', () => {
    it('returns empty object for empty string', () => {
        expect(parseQuery('')).toEqual({});
    });

    it('parses key=value pairs', () => {
        expect(parseQuery('?a=1&b=hello')).toEqual({ a: '1', b: 'hello' });
    });

    it('handles missing value', () => {
        expect(parseQuery('?flag')).toEqual({ flag: '' });
    });

    it('decodes URI components', () => {
        expect(parseQuery('?q=hello%20world')).toEqual({ q: 'hello world' });
    });
});

describe('matchRoute', () => {
    it('matches exact static route with priority over parameterized', () => {
        const exact = makeRoute('/about');
        const param = makeRoute('/{page}');
        const result = matchRoute('/about', [param, exact]);
        expect(result?.definition).toBe(exact);
    });

    it('matches parameterized route and extracts params', () => {
        const route = makeRoute('/product/{id}');
        const result = matchRoute('/product/42', [route]);
        expect(result).not.toBeNull();
        expect(result!.match.params).toEqual({ id: '42' });
        expect(result!.match.path).toBe('/product/42');
    });

    it('first registered parameterized route wins', () => {
        const first = makeRoute('/item/{id}');
        const second = makeRoute('/item/{slug}');
        const result = matchRoute('/item/foo', [first, second]);
        expect(result?.definition).toBe(first);
    });

    it('falls back to wildcard when no other match', () => {
        const wildcard = makeRoute('*');
        const result = matchRoute('/unknown/path', [wildcard]);
        expect(result?.definition).toBe(wildcard);
    });

    it('returns null when no route matches and no wildcard', () => {
        const route = makeRoute('/home');
        const result = matchRoute('/other', [route]);
        expect(result).toBeNull();
    });

    it('matches root path exactly', () => {
        const root = makeRoute('/');
        const result = matchRoute('/', [root]);
        expect(result?.definition).toBe(root);
    });
});
