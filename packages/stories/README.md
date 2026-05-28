# 🎨 Ora Stories & Storybook Sandbox

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Storybook](https://img.shields.io/badge/Platform-Storybook-FF4785.svg)](https://storybook.js.org/)

> The visual sandbox environment and comprehensive live documentation for **Ora Components**, utilizing **Storybook v10** with custom MDX guides.

---

## ⚡ Features

*   🎭 **Interactive Playgrounds**: Live-adjust properties for every builder class and view the updated DOM output.
*   📝 **Co-located Documentation**: Storybook MDX (`*.docs.mdx`) files are side-by-side with stories, defining builder API parameters, custom styling options, and code recipes.
*   🔄 **Theme Verification Chain**: Interactive controls to toggle Light, Dark, and System themes inside the sandbox frame.
*   📐 **Responsive Testing**: Configure standard viewport presets to verify mobile, tablet, and desktop layout performance.

---

## 🚀 Getting Started

To launch the local Storybook environment, run the following command from the monorepo root:

```bash
npm run storybook
```

This will compile the CSS styles and start the development server on [http://localhost:6006](http://localhost:6006).

---

## 🛠 Building Static Documentation

To build a static, highly optimized production distribution of the Storybook suite (suitable for hosting on static hosting providers like GitHub Pages or Azure Static Web Apps):

```bash
npm run build-storybook
```

This compiles all stories, models, and MDX documentation files into the `storybook-static/` directory.
