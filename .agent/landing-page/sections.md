# Landing Page Sections

The landing page consists of several high-level sections, each designed for a specific marketing or educational purpose. All sections are located in `src/sections/`.

## 1. Hero Section (`hero.ts`)
- **Purpose:** Captures attention and provides the main Call to Action (CTA).
- **Features:** 
  - Large, high-impact typography with Tailwind `text-display-large`.
  - Animated background elements for a modern feel.
  - Interactive "Primary" and "Outlined" buttons using the `ButtonBuilder`.
  - Seamless navigation to the "Getting Started" or "Dashboard" demo.

## 2. Features Grid (`features.ts`)
- **Purpose:** Highlights the library's technical strengths.
- **Content:** 
  - Icons and descriptions for No Shadow DOM, RxJS reactivity, Tailwind CSS, Material 3, and more.
  - A clean, 3-column grid that adapts to screen sizes.

## 3. Interactive Playground (`playground.ts`)
- **Purpose:** Demonstrates core components in action.
- **Content:** 
  - Uses `PanelBuilder` with `asGlass()` for a modern "Glassmorphism" look.
  - Features real-time demos of `ButtonBuilder`, `TextFieldBuilder`, `CheckboxBuilder`, and `ComboBoxBuilder`.
  - Demonstrates RxJS-based reactivity (e.g., passing `of(data)` to components).

## 4. Getting Started (`get-started.ts`)
- **Purpose:** Provides a clear path to adoption.
- **Content:** 
  - Installation command code block.
  - Basic usage snippet showing how to use `ButtonBuilder`.
  - Tabbed interface to switch between Installation and Usage guides.
  - Highlighting key value propositions like "Zero Dependencies" and "1A Design".

## 5. Global Header & Footer
- **Header (`src/components/header.ts`):** Fixed navigation with a logo, section links, and a global 3-way theme switcher (Light, Dark, Pink).
- **Footer (`src/sections/landing-page.ts`):** Basic attribution and copyright info.
- **GitHub link** Opens new tab for such URL: https://github.com/tdq/ora-components
- **Storybook link** Opens new tab for such URL: https://storybook.ora-components.com/