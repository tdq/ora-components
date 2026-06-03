# 🌐 Ora Showcase & Landing Page

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind_CSS-38B2AC.svg)](https://tailwindcss.com/)
[![Build Tool](https://img.shields.io/badge/Build%20Tool-Vite-646CFF.svg)](https://vitejs.dev/)

> The interactive marketing website and accounting application showcase for **Ora Components**, demonstrating real-world financial dashboards, stateful forms, and deep reactive integrations.

---

## 🎨 Application Features

*   📈 **Live Financial Dashboard**: Multi-widget analytics interface tracking revenue, active licenses, customer acquisition, and system metrics with dynamic mock data streams.
*   🧾 **Ledger & Accounting Module**:
    *   `Ledger View`: List and filter transaction histories.
    *   `P&L Statement`: A stateful Profit & Loss report showing dynamic calculations.
    *   `Balance Sheet`: Real-time asset and liability monitoring.
    *   `Accounts Payable`: Form configurations for pending payouts.
*   🔌 **Web-Socket Sync**: Demonstrates live data push integrations updating grid systems and chart visualizations instantly.
*   🌌 **Aesthetic Demos**: Real-time theme toggles verifying Light, Dark, and Pink themes with glassmorphic cards.

---

## 🚀 Getting Started

To run this application locally, you can start it from the monorepo root or directly from this folder.

### Run from Monorepo Root:
```bash
npm run landing:start
```

### Run from this Directory:
```bash
npm run dev
```

The server will spin up on [http://localhost:5173](http://localhost:5173).

---

## 🛠 Project Build

To compile a highly optimized static bundle ready for deployment:

```bash
npm run build
```

This runs the TypeScript compiler, processes the Tailwind stylesheets, builds the Vite production files, and pre-renders static marketing pages for fast initial loads.

---

## 📦 Deployment Configuration

This showcase is set up for deployment on **Azure Static Web Apps (SWA)**. 
*   **Routing**: The SWA configuration lives in `staticwebapp.config.json`, which handles URL rewrites and response headers.
*   **Workflows**: The deployment is automated via the GitHub actions workflows found in the `.github/workflows/` folder of the monorepo.
