/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '(.*)\\?raw$': '$1',
        '(.*)\\?inline$': '$1',
    },
    setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
    transform: {
        '^.+\\.tsx?$': ['ts-jest', {
            useESM: true,
        }],
        '\\.(html|css)$': '<rootDir>/jest-text-transformer.cjs',
    },
    extensionsToTreatAsEsm: ['.ts'],
};
