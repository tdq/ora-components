# Browser Testing Design: Chrome & Safari

## Overview
To ensure high-performance UI components function correctly across different browser engines, we are implementing an automated browser testing infrastructure. This solution focuses on **Chrome (Chromium)** and **Safari (WebKit)**, leveraging the existing Storybook stories as the primary test surface.

## Core Technology Stack
- **[Playwright](https://playwright.dev/):** The foundation for cross-browser automation, providing fast and reliable execution for Chromium and WebKit.
- **[Storybook Test Runner](https://storybook.js.org/docs/writing-tests/test-runner):** A standalone utility that turns Storybook stories into executable tests.
- **[Axe-Playwright](https://github.com/evanq/axe-playwright):** For automated accessibility (a11y) audits during browser execution.

## Architecture

The testing infrastructure is co-located with the `stories` package to maximize reuse of existing component examples and documentation.

```
packages/stories/
├── .storybook/
├── playwright.config.ts    # Browser & environment configuration
├── test-runner-jest.config.js # Jest config for the test runner
└── src/
    └── *.stories.ts        # Stories with 'play' functions for interaction tests
```

### Why this approach?
1. **Reuse Existing Work:** Every story already written becomes a "Smoke Test" automatically.
2. **Real Browser Engines:** Unlike JSDOM, Playwright uses actual Chromium and WebKit (Safari) binaries.
3. **Developer Experience:** Developers can write "play" functions directly in Storybook to describe interactions, which are then picked up by the test runner.
4. **CI Compatibility:** Playwright is optimized for headless CI environments (GitHub Actions, etc.).

## Testing Strategy

### 1. Smoke Testing (Automatic)
The test runner visits every story in the library. If any story throws a console error or fails to mount, the test fails. This ensures basic stability across all components.

### 2. Interaction Testing
For complex components (e.g., `Dialog`, `ComboBox`, `Grid`), we use the Storybook `play` function. This allows us to simulate user behavior like clicking, typing, and keyboard navigation.

```typescript
// Example: packages/stories/src/dialog.stories.ts
export const Interactive = () => { ... };
Interactive.play = async ({ canvasElement, step }) => {
  const canvas = within(canvasElement);
  await step('Open Dialog', async () => {
    await userEvent.click(canvas.getByRole('button', { name: /open/i }));
  });
  await step('Check Focus Trap', async () => {
    // Assert focus is inside the dialog
  });
};
```

### 3. Accessibility Audits
Integrated into the test runner lifecycle, we perform `axe` audits on every story or selected critical paths.

### 4. Visual Regression (Planned)
While not the primary focus, the infrastructure can be extended with Playwright's native screenshot comparison to detect visual regressions in different browsers.

## Setup Instructions

### 1. Dependencies
Add the following to `packages/stories/package.json`:
```json
{
  "devDependencies": {
    "@storybook/test-runner": "^0.21.0",
    "playwright": "^1.60.0",
    "axe-playwright": "^2.0.3"
  }
}
```

### 2. Configuration (`packages/stories/playwright.config.ts`)
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './stories',
  use: {
    baseURL: 'http://localhost:6006',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
```

### 3. Execution Scripts
Add these scripts to the root `package.json` or `packages/stories/package.json`:
- `test:browser`: Runs the test runner against a running Storybook.
- `test:browser:ci`: Builds Storybook and runs tests using `http-server`.

## CI/CD Integration
In GitHub Actions, we will add a step to:
1. Build components and Storybook.
2. Install Playwright browsers.
3. Run `npm run test:browser`.

```yaml
- name: Install Playwright Browsers
  run: npx playwright install --with-deps chromium webkit
- name: Run Browser Tests
  run: npm run test:browser
```

## Verification of Specialized Logic

### 1. Safari Focus Management
Safari (WebKit) has a unique default behavior where it skips buttons and links during Tab navigation. Our library uses `setupFocusTrap` and explicit `tabindex="0"` to normalize this.
- **Test Case:** Ensure that `Tab` and `Shift+Tab` correctly cycle through all interactive elements in a `Dialog` when running in the `webkit` project.
- **Assertion:** `document.activeElement` should match the expected element after each simulated Tab keypress.

### 2. RxJS Lifecycle & Cleanup
Since components use `registerDestroy` or `createLifecycleBoundary` to manage RxJS subscriptions, we must ensure no memory leaks occur during rapid navigation or re-rendering.
- **Test Case:** Mount and unmount a component (like `Chart` or `Grid`) multiple times in a single test session.
- **Assertion:** Verify (via Playwright's `console` listener) that no "subscription leaked" warnings or unexpected behaviors occur after unmount.

### 3. Glass Effects & Visuals
Verify that `asGlass()` correctly applies backdrop-blur and translucency, which can sometimes be buggy in WebKit.
- **Test Case:** Capture screenshots of glass components against a complex background in both Chromium and WebKit.
- **Assertion:** Visual comparison (using `expect(page).toHaveScreenshot()`) to ensure consistent aesthetics.

## Maintenance & Rules
- **One Component, One Story, One Test:** Every new component MUST have at least one story that the test runner can visit.
- **Safari Specifics:** Always verify keyboard navigation in Safari (WebKit), as its default `Tab` behavior differs from Chromium (handled by our `setupFocusTrap`).
- **Clean Console:** Tests will fail on any unexpected `console.error`. Components must be clean of leaks and warnings.
