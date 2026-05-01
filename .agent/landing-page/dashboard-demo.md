# Dashboard Demo Documentation (`src/demo/dashboard.ts`)

The "Ora Dashboard" is a comprehensive application demo designed to show the `ora-components` library in a realistic, high-density environment.

## 1. Application Layout
The dashboard uses the `LayoutBuilder` with an `asHorizontal()` orientation to create:
- **Sidebar:** A fixed-width navigation panel with links to Overview, Analytics, Customers, and Orders.
- **Main View:** A scrollable content area containing the dashboard widgets.

## 2. Core Widgets
- **Stats Grid:** A 4-column grid of summary cards (Sales, Active Users, etc.) built with `PanelBuilder` and `asGlass()`.
- **Sales Chart:** A dynamic line chart created using `ChartBuilder`. It uses an RxJS `timer(0, 5000)` to simulate real-time data updates every 5 seconds.
- **Transactions Grid:** A data table built with `GridBuilder`, showing recent transaction history with custom column definitions.

## 3. Implementation Highlights
- **`LayoutBuilder`:** Used to handle the high-level application shell.
- **RxJS Integration:** 
  - `timer(0, 5000).pipe(map(...))` for live chart updates.
  - `of([...])` for static grid data.
- **Responsive Design:** 
  - Uses Tailwind's grid system (`grid-cols-1 md:grid-cols-2 lg:grid-cols-4`) to ensure the dashboard looks good on all screen sizes.
  - Sidebar can be collapsed or hidden on smaller screens (future enhancement).

## 4. Key Builders Used
- `LayoutBuilder`: For the main horizontal/vertical structure.
- `PanelBuilder`: For stats cards and content containers.
- `ChartBuilder`: For the sales trend visualization.
- `GridBuilder`: For tabular data representation.
- `ButtonBuilder`: For navigation and call-to-action buttons.

## 5. Usage in Marketing
The Dashboard serves as the "Wow Factor" for the library. It proves that Ora is not just for simple UI pieces but can power a full-featured, reactive application shell.
