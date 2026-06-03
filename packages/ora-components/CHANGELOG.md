# Changelog

All notable changes to `@tdq/ora-components` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.6] - 2026-05-31

### Added

- **MoneyKpiCard**: KPI card component for financial dashboards.
- **TrendChip**: Chip component for displaying trend indicators.

### Changed

- Updated Stories and agent documentation.
- Separated components into independent modules.
- Restyled KPICardBuilder to match MoneyKPICard visual style (container, typography, trend chip).
- Replaced money-related KPI cards with MoneyKPICardBuilder in dashboard overview and stories.

### Fixed

- DatePicker glass effect styling.

## [0.1.5] - 2026-05-28

### Added

- README files for packages and components.

### Changed

- Updated package version and description.

## [0.1.4] - 2026-05-24

### Added

- **FxTicker**: Foreign exchange ticker component.
- Ledger demo with 10k row support.
- Animation frame–based example data generation.
- Design tokens.
- Backend ledger stream preparation.

### Changed

- Tailwind CSS styling integration.
- Accessibility improvements across components.
- Responsive layout improvements.
- Grid render performance improvements.
- Improved animations.
- Enhanced FX converter demo.
- Playground improvements.
- Ledger demo updates and polish.

### Fixed

- Demo button interaction.

## [0.1.3] - 2026-05-21

### Added

- Landing page SEO improvements.
- Code examples and samples for landing page.
- Links section on landing page.
- MCP server.

### Changed

- Improved routing with lazy-loaded routes.
- Improved landing page layout and theming.
- Improved hero demo section.
- Improved code examples on MCP landing page.
- Improved Storybook stories.
- DatePicker: implemented TONAL and OUTLINED styles, updated docs.

### Fixed

- Site URL configuration.
- Landing page prerendering on Azure.
- Glass effect rendering.
- Deployment configuration.
- Changes detection.
- Version detection.
- Monitoring configuration.
- MCP deployment.
- Build process.
- Badge alignment. Added Turbo scripts.

## [0.1.2] - 2026-05-18

### Changed

- Grid: improved multi-select behavior.
- Grid: improved keyboard navigation.
- Improved grid component and stories.
- Improved table stories.

### Fixed

- Grid rows bottom border styling.

## [0.1.1] - 2026-05-01

First published version. Renamed from Aura Components to Ora Components.

### Added

- **Button**: Reactive button with builder pattern API.
- **Chart**: SVG-based chart component with multiple series types, axes, legends, tooltips, and viewport.
- **Checkbox**: Accessible checkbox component.
- **ComboBox**: Dropdown with search and selection.
- **DatePicker**: Calendar date picker with material design styling.
- **Dialog**: Modal dialog component.
- **Form**: Form builder with validation.
- **Grid**: High-performance data grid with row virtualization, column grouping, pivoting, editable rows, glass effects, and dark theme support.
- **Label**: Form label component.
- **Layout**: Responsive layout primitives.
- **ListBox**: Selectable list component.
- **MultiSelectList**: Multi-selection list component.
- **MoneyField**: Currency input field with formatting, integrates with forms.
- **NumberField**: Numeric input with formatting.
- **Panel**: Container panel with glass effects.
- **Popover**: Popover positioning system, including dialog support.
- **Steps**: Step progress indicator component.
- **Tabs**: Tabbed interface component.
- **TextField**: Text input with validation.
- **Toolbar**: Action toolbar component.
- **Router**: Client-side routing with lazy loading.
- Landing page with hero section, playground, and code samples.
- Storybook deployment with interactive examples.
- Tailwind CSS design system with glass effects and theme support.
- Reactive RxJS-based architecture.
- Builder pattern API for all components.
- Jest test suite with DOM testing.
- GridHeader component unit tests.
- Storybook setup with Azure deployment.
- MCP configuration for agent tools.

[0.1.6]: https://github.com/tdq/ora-components/releases/tag/v0.1.6
[0.1.5]: https://github.com/tdq/ora-components/releases/tag/v0.1.5
[0.1.4]: https://github.com/tdq/ora-components/releases/tag/v0.1.4
[0.1.3]: https://github.com/tdq/ora-components/releases/tag/v0.1.3
[0.1.2]: https://github.com/tdq/ora-components/releases/tag/v0.1.2
[0.1.1]: https://github.com/tdq/ora-components/releases/tag/v0.1.1
