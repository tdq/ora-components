# Accounting Demo Design

## Overview

The accounting demo extends the existing Ora Dashboard with a dedicated **Accounting** navigation section. It demonstrates `@tdq/ora-components` in a realistic double-entry bookkeeping context, showcasing `MoneyField`, `DatePicker`, `GridBuilder` (with money columns), `ChartBuilder`, and `TabsBuilder` together in domain-appropriate screens.

---

## Navigation Integration

### New Sidebar Section

Add a `ACCOUNTING` label group to `sidebar.ts` below the existing `MAIN MENU` group. New nav items with their routes:

| Label | Route | Icon hint |
|---|---|---|
| Ledger | `/dashboard/ledger` | receipt / list lines icon |
| P&L | `/dashboard/pl` | trending-up icon |
| Balance Sheet | `/dashboard/balance-sheet` | scale / columns icon |
| Payables | `/dashboard/payables` | credit-card icon |

### Router integration (`dashboard.ts`)

Add four new `case` branches to the route switch:
```
case 'ledger':        content = createLedger(); break;
case 'pl':            content = createPL(); break;
case 'balance-sheet': content = createBalanceSheet(); break;
case 'payables':      content = createPayables(); break;
```

All new pages live in `packages/landing-page/src/demo/dashboard/` as individual files:
`ledger.ts`, `pl.ts`, `balance-sheet.ts`, `payables.ts`.

---

## Page 1 — General Ledger (`ledger.ts`)

**Purpose:** Showcase `GridBuilder` with multiple `MoneyColumn`s and `DatePicker` for period filtering.

### Layout
```
┌─ Summary Stats (4 cards) ──────────────────────────────┐
│  Total Debits | Total Credits | Net Balance | Entries   │
└────────────────────────────────────────────────────────┘
┌─ Ledger Grid (full width) ─────────────────────────────┐
│  Date | Account | Description | Ref | Debit | Credit | Balance │
└────────────────────────────────────────────────────────┘
```

### Data Shape
```typescript
interface LedgerEntry {
    date: string;          // 'YYYY-MM-DD'
    account: string;       // e.g. 'Revenue / SaaS Subscriptions'
    description: string;   // human-readable
    reference: string;     // e.g. 'INV-0042'
    debit: Money;          // { amount, currencyId: 'EUR' } — 0 if credit side
    credit: Money;         // { amount, currencyId: 'EUR' } — 0 if debit side
    balance: Money;        // running balance after this entry
}
```

### Realistic Sample Data (20+ entries)
Mix of:
- **Revenue** credits: subscription payments from customers, amounts €49 – €2,490
- **Accounts Receivable** debits matching each revenue credit
- **Expense** debits: office rent (€2,800/mo), SaaS tools (€420), payroll advance (€18,400)
- **Cash / Bank** credits for expense payments
- Dates spread across April 2026

### Grid Columns
| Column | Width | Type |
|---|---|---|
| date | 110px | text |
| account | 1fr | text |
| description | 1fr | text |
| reference | 100px | text |
| debit | 110px | money |
| credit | 110px | money |
| balance | 120px | money |

### Summary Stats Cards
Compute from data at build time (no live update needed):
- **Total Debits** — sum of all debit amounts
- **Total Credits** — sum of all credit amounts
- **Net Balance** — Total Credits − Total Debits (should be ≈ 0 for balanced books)
- **Entries** — count of rows

Use the same card style as `overview.ts` stat cards (border, rounded-extra-large, inline color dot).

---

## Page 2 — Profit & Loss (`pl.ts`)

**Purpose:** Demonstrate `ChartBuilder` (area + bar dual-axis) and `TabsBuilder` for period switching alongside `GridBuilder` for line-item breakdowns.

### Layout
```
┌─ Period Tabs ──────────────────────────────────────────┐
│  This Month | This Quarter | YTD                       │
│                                                        │
│  ┌─ Summary Cards (3) ──────────────────────────────┐  │
│  │  Total Revenue | Total Expenses | Net Income      │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  ┌─ Revenue vs Expenses Chart (full width) ─────────┐  │
│  │  Area: Revenue  |  Area: Expenses                │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  ┌─ Revenue Breakdown ─┐ ┌─ Expense Breakdown ──────┐  │
│  │  Grid: Category/Amt │ │  Grid: Category/Amt       │  │
│  └─────────────────────┘ └──────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

### Data per Period

**Monthly (April 2026):**
- Revenue: SaaS Subscriptions €18,340 | Professional Services €4,200 | Add-ons €2,980 | **Total €25,520**
- Expenses: Payroll €18,400 | Office Rent €2,800 | SaaS Tools €420 | Marketing €1,100 | **Total €22,720**
- Net Income: **€2,800**

**Quarterly (Q1 2026, Jan–Mar):**
- Revenue: €62,400 | Expenses: €57,800 | Net: €4,600

**YTD (Jan–Apr 2026):**
- Revenue: €87,920 | Expenses: €80,520 | Net: €7,400

### Revenue vs Expenses Chart
Use `ChartBuilder` with `withSecondaryYAxis()`:
- `addAreaChart('revenue')` — color `#10B981` (green)
- `addAreaChart('expenses')` — color `#EF4444` (red)
- X-axis: last 6 months labels
- Live update with `timer(0, 6000)` adding ±2% noise

### Breakdown Grids
```typescript
interface PLLineItem {
    category: string;
    amount: Money;
    share: string;   // e.g. '71.9%'
}
```
Columns: category (1fr) | amount (120px, money) | share (80px, text)

### Summary Card Colors
- Revenue: green accent (`#10B981`)
- Expenses: red accent (`#EF4444`)
- Net Income: purple accent (`#6750A4`) — green text if positive, red if negative

---

## Page 3 — Balance Sheet (`balance-sheet.ts`)

**Purpose:** Show a structured two-column financial statement using `PanelBuilder` and custom HTML layout. Less chart-heavy; emphasizes typography and hierarchical data display.

### Layout
```
┌─ "As of April 30, 2026" Header ────────────────────────┐
│                                                        │
│  ┌─ ASSETS Panel ──────┐ ┌─ LIABILITIES & EQUITY ──┐  │
│  │  Current Assets     │ │  Current Liabilities     │  │
│  │    Cash & Bank      │ │    Accounts Payable      │  │
│  │    Accounts Rec.    │ │    Accrued Expenses      │  │
│  │    Prepaid Exp.     │ │  Long-term Liabilities   │  │
│  │  ─────────────────  │ │    Deferred Revenue      │  │
│  │  Non-current Assets │ │  ─────────────────────── │  │
│  │    Equipment        │ │  Equity                  │  │
│  │    Software IP      │ │    Common Stock          │  │
│  │  ─────────────────  │ │    Retained Earnings     │  │
│  │  TOTAL ASSETS       │ │  TOTAL L+E               │  │
│  └─────────────────────┘ └─────────────────────────┘  │
│                                                        │
│  ✓ Balanced: Assets = Liabilities + Equity            │
└────────────────────────────────────────────────────────┘
```

### Data
All figures in EUR, April 30 2026:

**Assets**
- Cash & Bank: €84,200
- Accounts Receivable: €12,640
- Prepaid Expenses: €3,360
- **Current Assets Total: €100,200**
- Equipment (net): €14,800
- Software IP: €38,000
- **Non-current Total: €52,800**
- **TOTAL ASSETS: €153,000**

**Liabilities**
- Accounts Payable: €6,420
- Accrued Expenses: €3,180
- **Current Liabilities: €9,600**
- Deferred Revenue: €18,400
- **TOTAL LIABILITIES: €28,000**

**Equity**
- Common Stock: €100,000
- Retained Earnings: €25,000
- **TOTAL EQUITY: €125,000**
- **TOTAL L+E: €153,000** ← must equal Total Assets

### Rendering
Each section is rendered as a plain HTML tree (no GridBuilder needed — this is a statement, not a data table). Use:
- Section header: `text-label-large font-semibold text-on-surface-variant uppercase tracking-wide opacity-60`
- Line item row: flex justify-between, `text-body-medium`
- Sub-total row: font-semibold with a top border
- Grand total row: `text-title-medium font-bold` with double-top-border treatment

Display amounts using `Money` formatting helper consistent with the rest of the codebase (or manually `€` + `.toLocaleString()`).

A green "Balanced ✓" banner at the bottom confirms Assets = Liabilities + Equity.

---

## Page 4 — Accounts Payable (`payables.ts`)

**Purpose:** Primarily showcase `MoneyField` and `DatePicker` in an input form alongside `GridBuilder` for invoice management.

### Layout
```
┌─ Aging Summary (4 cards) ──────────────────────────────┐
│  Current | 1–30 days | 31–60 days | 60+ days overdue   │
└────────────────────────────────────────────────────────┘
┌─ Invoice Grid (with tabs) ─────────────────────────────┐
│  All | Due Soon | Overdue                              │
│  Vendor | Invoice # | Issue Date | Due Date | Amt | Status │
└────────────────────────────────────────────────────────┘
┌─ New Invoice Entry Form ───────────────────────────────┐
│  [Vendor TextField] [Invoice # TextField]              │
│  [Issue DatePicker] [Due DatePicker]                   │
│  [Amount MoneyField]          [Add Invoice Button]     │
└────────────────────────────────────────────────────────┘
```

### Invoice Data Shape
```typescript
interface Invoice {
    id: string;          // 'INV-0042'
    vendor: string;
    issueDate: string;   // 'YYYY-MM-DD'
    dueDate: string;     // 'YYYY-MM-DD'
    amount: Money;
    status: string;      // 'Current' | 'Due Soon' | 'Overdue' | 'Paid'
}
```

### Sample Data (15 invoices)
Mix of vendors: AWS, Stripe, Figma, HubSpot, Slack, Office landlord, contractor invoices
Amounts: €119 – €2,800
Statuses distributed: ~5 Current, ~4 Due Soon, ~3 Overdue, ~3 Paid

### Grid Columns
| Column | Width | Type |
|---|---|---|
| vendor | 1fr | text |
| id | 100px | text |
| issueDate | 110px | text |
| dueDate | 110px | text |
| amount | 120px | money |
| status | 110px | custom (chip) |

Status chip colors:
- Current → blue (`#0EA5E9`)
- Due Soon → amber (`#F59E0B`)
- Overdue → red (`#EF4444`)
- Paid → green (`#10B981`)

### New Invoice Form

Use `FormBuilder` if available, otherwise a styled `div` container with the following components:
- `TextFieldBuilder` for Vendor and Invoice #
- Two `DatePickerBuilder` instances for Issue Date and Due Date
- `MoneyFieldBuilder` for Amount (pre-populated currency EUR)
- `ButtonBuilder` (FILLED style) labeled "Add Invoice"

The form is for visual demo only — clicking "Add Invoice" appends a new row to the invoice grid using a `BehaviorSubject` and `GridBuilder.withItems(invoices$)`.

### Aging Summary Computation
Compute from invoice data at build time:
- **Current**: dueDate > today, not overdue
- **1–30 days overdue**: 1–30 days past dueDate
- **31–60 days**: 31–60 days past dueDate
- **60+ days**: >60 days past dueDate

Show count AND total amount in each card.

---

## Component Usage Summary

| Page | Key Components Showcased |
|---|---|
| Ledger | `GridBuilder` (6 cols, 2× money), summary stat cards |
| P&L | `ChartBuilder` (dual-area), `TabsBuilder`, `GridBuilder` (money col) |
| Balance Sheet | `PanelBuilder`, custom HTML statement layout |
| Payables | `MoneyField`, `DatePicker`, `GridBuilder`, `TabsBuilder`, `ButtonBuilder` |

---

## File Structure

```
packages/landing-page/src/demo/dashboard/
├── ledger.ts           ← NEW
├── pl.ts               ← NEW
├── balance-sheet.ts    ← NEW
├── payables.ts         ← NEW
├── sidebar.ts          ← MODIFY (add accounting nav group)
└── (existing files unchanged)

packages/landing-page/src/demo/
└── dashboard.ts        ← MODIFY (add 4 route cases)
```

---

## Style Conventions

Follow existing patterns in `overview.ts` and `orders.ts`:
- Container: `flex-1 overflow-y-auto p-px-24`
- Stat card: `p-px-24 rounded-extra-large border` with `background: var(--md-sys-color-surface)`
- Grid section: wrapped in `PanelBuilder.withContent(LabelBuilder)`, `min-h-[400px] flex flex-col`
- Chart section: wrapped in `PanelBuilder`, `min-h-[300px] flex flex-col`
- All grids: `flex-1 min-h-0` on the built element
- Color palette consistent with existing dashboard: purple `#6750A4`, blue `#0EA5E9`, green `#10B981`, amber `#F59E0B`, red `#EF4444`
