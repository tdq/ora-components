# 📦 @tdq/ora-components

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-blue.svg)](https://www.typescriptlang.org/)
[![RxJS](https://img.shields.io/badge/Reactivity-RxJS-purple.svg)](https://rxjs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind_CSS-38B2AC.svg)](https://tailwindcss.com/)
[![Material Design 3](https://img.shields.io/badge/Design-Material_3-7F3FBF.svg)](https://m3.material.io/)

> **A1 Web Components library** – A high-performance, lightweight UI component library built using **Vanilla TypeScript**, **RxJS** for state reactivity, and **Tailwind CSS** following **Material Design 3 (M3)** aesthetics.

Designed from the ground up to achieve sub-millisecond updates, zero framework overhead, and beautiful visual effects (including premium glassmorphism).

---

## 📖 Table of Contents
1. [Core Features](#-core-features)
2. [Installation](#-installation)
3. [Quick Start](#-quick-start)
4. [Design Patterns](#-design-patterns)
   - [The Builder Pattern](#the-builder-pattern)
   - [Reactive Data Binding (RxJS)](#reactive-data-binding-rxjs)
   - [Memory & Lifecycle Management](#memory--lifecycle-management)
5. [Core Components API Reference](#-core-components-api-reference)
   - [Button](#button)
   - [Label](#label)
   - [TextField & NumberField](#textfield--numberfield)
   - [MoneyField](#moneyfield)
   - [Grid](#grid)
   - [Chart](#chart)
   - [Dialog](#dialog)
6. [Theme Configuration](#-theme-configuration)
7. [Development & Build Commands](#-development--build-commands)
8. [License](#-license)

---

## ⚡ Core Features

*   🚀 **Zero Virtual DOM Overhead**: Modifies the Light DOM directly with native APIs for speed.
*   🔄 **Fine-Grained Reactivity**: Uses RxJS streams to update target properties at the individual node level without tree repaints.
*   ✨ **Premium Aesthetics**: Features smooth CSS-variable based Light, Dark, and Green themes with gorgeous glassmorphic modifications.
*   📐 **Programmatic Builder Interface**: Clean method chaining APIs to instantiate elements without HTML template markup.
*   🛡️ **Automatic Teardown**: Self-cleaning event listeners and subscriptions when components are detached from the document tree.

---

## 📥 Installation

Install `@tdq/ora-components` along with its peer dependency, `rxjs`, in your web application:

```bash
npm install @tdq/ora-components rxjs
```

---

## 🚦 Quick Start

Import the components and their corresponding CSS style files into your application's entry point:

```typescript
import '@tdq/ora-components/style.css';
import { ButtonBuilder, LabelBuilder, LayoutBuilder, LayoutGap, Icons } from '@tdq/ora-components';
import { BehaviorSubject, of, map } from 'rxjs';

// Initialize a reactive state stream
const count$ = new BehaviorSubject(0);

// Build a dynamic reactive label
const counterLabel = new LabelBuilder()
  .withCaption(count$.pipe(map(count => `Click Count: ${count}`)));

// Build a chainable button
const incrementButton = new ButtonBuilder()
  .withCaption(of('Increment Value'))
  .asGlass()
  .withIcon(Icons.SORT_UP)
  .withClick(() => count$.next(count$.value + 1));

const layout = new LayoutBuilder()
  .asVertical()
  .withGap(LayoutGap.MEDIUM);

layout.addSlot().withContent(counterLabel);
layout.addSlot().withContent(incrementButton);

// Append built HTML elements directly to the DOM
const container = document.getElementById('app');
container?.appendChild(layout.build());
```

---

## 📐 Design Patterns

### The Builder Pattern
Every UI element in the library is constructed using a dedicated Builder class implementing the `ComponentBuilder` interface:
*   **Method Chaining**: Configuration methods return `this` to allow elegant stacking.
*   **Encapsulation**: Element styling, state, and callbacks are prepared *before* compilation.
*   **Final Assembly**: Calling `.build()` returns a native `HTMLElement`.

```typescript
const value$ = new Subject<string>();

const searchInput = new TextFieldBuilder()
  .withLabel(of('Search Products'))
  .withPlaceholder(of('Type query...'))
  .withValue(value$)
  .build();
```

### Reactive Data Binding (RxJS)
Instead of forcing static values, key properties accept **RxJS Observables** (`Observable<T>`). The component binds directly to the stream:
*   When new values emit, only the specific node changes.
*   It supports reactive transformations, piping, and mapping out-of-the-box.

### Memory & Lifecycle Management
To completely eliminate memory leaks from RxJS subscriptions in a non-framework single-page app, components leverage the `registerDestroy` utility:
*   Uses a global `MutationObserver` to watch element removal.
*   Automatically unsubscribes from all internal stream bindings when the component is unmounted.

---

## 🧱 Core Components API Reference

Here is how to programmatically build the most common components:

### Button
Configure normal, outline, text, or glassmorphic clickable targets.

```typescript
import { ButtonBuilder, Icons } from '@tdq/ora-components';
import { of } from 'rxjs';

const actionBtn = new ButtonBuilder()
  .withCaption(of('Confirm Order'))
  .asGlass()                        // Transparent, blurred backdrop style
  .withIcon(Icons.CHECKMARK)        // Inject SVG material icon
  .withClick(() => triggerPurchase())
  .build();
```

### Label
Bind text contents directly to state streams.

```typescript
import { LabelBuilder } from '@tdq/ora-components';
import { of } from 'rxjs';

const priceLabel = new LabelBuilder()
  .withCaption(priceStream$)        // Accepts Observable<string>
  .withClass(of('text-xl font-bold'))
  .build();
```

### TextField & NumberField
Form elements with animated Material label styles, error states, and validations.

```typescript
import { TextFieldBuilder } from '@tdq/ora-components';
import { of } from 'rxjs';

const emailInput = new TextFieldBuilder()
  .withLabel(of('Email Address'))
  .withPlaceholder(of('user@example.com'))
  .withError(emailErrorStream$)     // Dynamic validation errors
  .build();
```

### MoneyField
Designed for financial systems, supporting rigid decimal formatting and currency alignment.

```typescript
import { MoneyFieldBuilder } from '@tdq/ora-components';
import { of } from 'rxjs';

const salaryInput = new MoneyFieldBuilder()
  .withLabel(of('Salary'))
  .withCurrencies(['USD', 'EUR'])
  .withPrecision(of(2))
  .build();
```

### Grid
A highly-optimized table component supporting fast sorting, sizing, custom cell rendering, and virtual lists.

```typescript
import { GridBuilder } from '@tdq/ora-components';

const productGrid = new GridBuilder<any>();
const columns = productGrid.withColumns();

columns.addTextColumn('id')
  .withHeader('ID')
  .withWidth('80px');

columns.addTextColumn('name')
  .withHeader('Product Name')
  .withWidth('250px');

columns.addNumberColumn('price')
  .withHeader('Price')
  .withWidth('120px');

productGrid.withItems(productListStream$); // Binds directly to dataset Observable

const grid = productGrid.build();
```

### Chart
Expose data sets via bars or line graphics.

```typescript
import { ChartBuilder } from '@tdq/ora-components';

const performanceChart = new ChartBuilder<any>()
  .withData(revenueStream$)
  .withCategoryField('month')
  .withHeight(400);

performanceChart.addLineChart('revenue')
  .withName('Revenue')
  .withColor('#2196F3');

const chart = performanceChart.build();
```

### Dialog
Create fully accessible overlay portals utilizing the HTML5 native `<dialog>` element.

```typescript
import { DialogBuilder } from '@tdq/ora-components';
import { of } from 'rxjs';

const confirmationDialog = new DialogBuilder()
  .withCaption(of('Discard Changes?'))
  .withDescription(of('Unsaved changes will be permanently lost.'))
  .asGlass();

confirmationDialog.withToolbar()
  .addActionButton(of('Cancel'), () => confirmationDialog.close());

confirmationDialog.withToolbar()
  .withPrimaryButton()
  .withCaption(of('Confirm'))
  .withClick(() => {
    processDiscard();
    confirmationDialog.close();
  });

const dialog = confirmationDialog.build();
```

---

## 🎨 Theme Configuration

Themes are controlled using the `data-theme` attribute applied to the root (`<html>`) element. The stylesheet automatically maps styling to CSS variables:

*   **Light Theme**: `<html data-theme="light">` (Default)
*   **Dark Theme**: `<html data-theme="dark">`
*   **Green Theme**: `<html data-theme="green">`

### Using the ThemeManager
The library provides a reactive `ThemeManager` to handle theme switching and persistence:

```typescript
import { themeManager } from '@tdq/ora-components';

// Switch to a specific theme
themeManager.setTheme('dark');

// Observe theme changes
themeManager.theme$.subscribe(theme => {
  console.log('Current theme:', theme);
});
```

#### Manual Switcher Snippet:
```typescript
function switchTheme(theme: 'light' | 'dark' | 'green') {
  document.documentElement.setAttribute('data-theme', theme);
}
```

---

## 🛠 Development & Build Commands

If you are modifying or extending `@tdq/ora-components`, use the following commands in this directory:

*   **Vite Dev Server**: `npm run dev`
*   **Compile Bundles**: `npm run build`
*   **Build CSS Styles**: `npm run build:css`
*   **Build Typings**: `npm run build:types`
*   **Run Jest Tests**: `npm run test`

---

## 📄 License

This package is licensed under the terms of the **MIT License**. Refer to the [LICENSE](../../LICENSE) file in the root directory of this repository.
