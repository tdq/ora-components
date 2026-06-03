/**
 * Deterministic mock data generators.
 * No Math.random() at module level — all values are index-based.
 */

import type { Money, Trend } from '@tdq/ora-components';

// ---------------------------------------------------------------------------
// Shared lookup tables
// ---------------------------------------------------------------------------

const ROLES = ['ADMIN', 'USER', 'MANAGER', 'VIEWER'] as const;
const USER_ROLES = ['ADMIN', 'USER', 'GUEST'] as const;
const STATUSES = ['ACTIVE', 'INACTIVE', 'PENDING', 'SUSPENDED'] as const;
const PRIORITIES = ['low', 'medium', 'high'] as const;
const DEPARTMENTS = ['Engineering', 'Marketing', 'Sales', 'Support', 'HR', 'Finance', 'Legal', 'Operations'];
const FIRST_NAMES = ['James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
const CURRENCIES = ['USD', 'EUR', 'GBP'];
const PERIODS = ['vs last month', 'vs last qtr', 'vs last year', 'YTD'];
const CATEGORIES = ['Electronics', 'Clothing', 'Food', 'Furniture'];
const STOCK_STATUSES = ['In Stock', 'Low Stock', 'Out of Stock'] as const;
const PRODUCT_CATEGORIES = ['Electronics', 'Home & Garden', 'Apparel'];
const SUBCATEGORIES: Record<string, string[]> = {
    'Electronics': ['Smartphones', 'Laptops', 'Audio'],
    'Home & Garden': ['Furniture', 'Kitchen', 'Decor'],
    'Apparel': ['Menswear', 'Womenswear', 'Accessories'],
};

// ---------------------------------------------------------------------------
// Deterministic helpers (replace Math.random())
// ---------------------------------------------------------------------------

/** Deterministic value in [0, 1) based on index and a salt. */
function detent(index: number, salt: number = 0): number {
    // Simple pseudo‑random hash that produces a stable value per (index, salt)
    const x = ((index + 1) * 9301 + salt * 49297) % 233280;
    return x / 233280;
}

/** Pick an element from an array deterministically. */
function pick<T>(arr: readonly T[], index: number, salt: number = 0): T {
    return arr[Math.floor(detent(index, salt) * arr.length)];
}

/** Deterministic integer in [min, max]. */
function detentInt(index: number, min: number, max: number, salt: number = 0): number {
    return min + Math.floor(detent(index, salt) * (max - min + 1));
}

// ---------------------------------------------------------------------------
// User generators
// ---------------------------------------------------------------------------

export interface User {
    id: number;
    name: string;
    email: string;
    role: 'ADMIN' | 'USER' | 'GUEST';
    active: boolean;
    lastLogin: Date;
    balance: Money;
    progress: number;
    trend: Trend;
}

/**
 * Generate a deterministic list of users.
 * Each field is derived from the item index so that two calls with the same
 * `count` produce identical data.
 */
export function generateUsers(count: number): User[] {
    return Array.from({ length: count }).map((_, i) => ({
        id: i + 1,
        name: `User ${i + 1}`,
        email: `user${i + 1}@example.com`,
        role: USER_ROLES[i % USER_ROLES.length],
        active: i % 2 === 0,
        lastLogin: new Date(Date.now() - (detent(i, 1) * 10_000_000_000)),
        balance: {
            amount: Math.floor(detent(i, 2) * 10000) / 100,
            currencyId: CURRENCIES[i % CURRENCIES.length],
        },
        progress: detent(i, 3),
        trend: {
            value: parseFloat(((detent(i, 4) - 0.5) * 30).toFixed(1)),
            period: PERIODS[i % PERIODS.length],
        },
    }));
}

// ---------------------------------------------------------------------------
// Product generators
// ---------------------------------------------------------------------------

export interface Product {
    id: number;
    name: string;
    category: string;
    price: Money;
    stock: number;
    active: boolean;
}

/**
 * Generate a deterministic list of simple products.
 */
export function generateProducts(count: number): Product[] {
    return Array.from({ length: count }).map((_, i) => ({
        id: i + 1,
        name: `Product ${i + 1}`,
        category: CATEGORIES[i % CATEGORIES.length] as Product['category'],
        price: {
            amount: detentInt(i, 10, 1009, 1),
            currencyId: 'USD',
        },
        stock: detentInt(i, 0, 99, 2),
        active: i % 5 !== 0,
    }));
}

// ---------------------------------------------------------------------------
// Grid‑grouping product generators
// ---------------------------------------------------------------------------

export interface GroupedProduct {
    id: number;
    name: string;
    category: string;
    subcategory: string;
    price: Money;
    status: 'In Stock' | 'Low Stock' | 'Out of Stock';
}

/**
 * Generate a deterministic list of products with categories and subcategories
 * suitable for grid-grouping demonstrations.
 */
export function generateGroupedProducts(count: number): GroupedProduct[] {
    return Array.from({ length: count }).map((_, i) => {
        const category = pick(PRODUCT_CATEGORIES, i, 0);
        const subcategories = SUBCATEGORIES[category];
        const subcategory = pick(subcategories, i, 1);
        return {
            id: i + 1,
            name: `${subcategory} Item ${i + 1}`,
            category,
            subcategory,
            price: {
                amount: detentInt(i, 10, 1009, 2),
                currencyId: 'USD',
            },
            status: pick(STOCK_STATUSES, i, 3),
        };
    });
}

// ---------------------------------------------------------------------------
// Full‑coverage grid item generator
// ---------------------------------------------------------------------------

export interface FullCoverageItem {
    id: number;
    name: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    department: string;
    score: number;
    rating: number;
    clicks: number;
    lastLogin: Date;
    createdAt: Date;
    lastModified: Date;
    role: 'ADMIN' | 'USER' | 'MANAGER' | 'VIEWER';
    status: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'SUSPENDED';
    active: boolean;
    verified: boolean;
    progress: number;
    balance: Money;
    priority: 'low' | 'medium' | 'high';
    buttonLabel: string;
    trend: Trend;
}

/**
 * Generate a deterministic list of items that exercise every grid column type.
 */
export function generateFullCoverageData(count: number): FullCoverageItem[] {
    return Array.from({ length: count }).map((_, i) => ({
        id: i + 1,
        name: `Record ${i + 1}`,
        email: `record${i + 1}@company.com`,
        firstName: FIRST_NAMES[i % FIRST_NAMES.length],
        lastName: LAST_NAMES[i % LAST_NAMES.length],
        phone: `+1-555-${String(1000 + (i % 9000)).slice(0, 4)}`,
        department: DEPARTMENTS[i % DEPARTMENTS.length],
        score: detentInt(i, 0, 999, 1),
        rating: detentInt(i, 1, 5, 2),
        clicks: detentInt(i, 0, 9999, 3),
        lastLogin: new Date(Date.now() - detent(i, 4) * 10_000_000_000),
        createdAt: new Date(Date.now() - detent(i, 5) * 100_000_000_000),
        lastModified: new Date(Date.now() - detent(i, 6) * 5_000_000_000),
        role: ROLES[i % ROLES.length],
        status: STATUSES[i % STATUSES.length],
        active: i % 2 === 0,
        verified: i % 3 === 0,
        progress: detent(i, 7),
        balance: {
            amount: Math.floor(detent(i, 8) * 10_000) / 100,
            currencyId: CURRENCIES[i % CURRENCIES.length],
        },
        priority: PRIORITIES[i % PRIORITIES.length],
        buttonLabel: `Btn${i + 1}`,
        trend: {
            value: parseFloat(((detent(i, 9) - 0.5) * 30).toFixed(1)),
            period: PERIODS[i % PERIODS.length],
        },
    }));
}
