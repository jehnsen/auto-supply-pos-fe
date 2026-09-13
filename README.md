# ImmerSons AutoMoto POS

Point of sale **and repair management** for an auto supply shop that also runs auto care services —
tires, mags, batteries, parts and accessories over the counter, plus job orders in the bays with a
full chain of custody on every unit taken in.

Built with **Next.js (App Router) + Tailwind CSS v4 + TypeScript**, talking to a Laravel API.

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:3000. Point the frontend at your API with:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

(Defaults to `http://localhost:8000` when unset.)

## Modules

### 🛒 Point of Sale (`/pos`)
Tap-to-add parts grid with department chips and live search, barcode entry, stock-aware cart,
customer accounts, hold/resume, cash · GCash · Maya · bank · check · credit payments, printable
80mm receipt.

### 🔧 Repair Jobs (`/service-tickets`)
Job orders from intake to release:

- **Intake** captures customer, vehicle, odometer, reported complaint, and the customer property
  held with the unit (helmet, tools, spare tire…).
- **Status workflow** — received → diagnosing → awaiting approval / awaiting parts → in progress →
  quality check → ready for release → released. The two "awaiting" states exist so a stalled job can
  say honestly *why* it is stalled.
- **Chain of custody** — an append-only event log. Every status change, assignment, part, note and
  handoff is recorded with who did it and when. Entries are never edited or deleted; a correction is
  a new entry that supersedes the old one, and the original stays visible.
- **Parts & labour** lines with a running job total.
- **Printable intake and release slips** with the full custody trail and signature lines for both
  sides.

### 🚗 Vehicles
Vehicles belong to customers (plate, make, model, year, colour, odometer). Each customer's profile
lists their units with per-vehicle service history. A job order references one vehicle, so the next
visit is two taps.

### 📦 Products · Inventory · Customers · Suppliers · POs · Deliveries · AP/AR · Shifts · Reports
Unchanged from the underlying POS: catalog and stock management, credit ledgers and statements,
purchase orders and receiving, cash-drawer shifts with X/Z readings, and the full report suite
including a printable monthly report.

## Where data lives

Everything is served by the Laravel API through `src/lib/api/*` — one module per backend
resource. There is no client-side persistence layer: the only things in `localStorage` are the
auth token and two UI preferences (sidebar collapsed, theme).

### Repair jobs on the API

`service-tickets.ts` and `vehicles.ts` wrap `/api/v1/service-tickets` and `/api/v1/vehicles`.
Three details worth knowing before working on them:

- **Money crosses the wire in pesos.** The database stores centavos; the API converts on read
  (`ServiceTicketResource`) and accepts decimals on write, so nothing in the frontend scales
  amounts. `balance_due` is computed server-side and is preferred over local arithmetic.
- **Nested collections are `whenLoaded`.** `property`, `lines` and `custody` are omitted
  entirely by endpoints that don't eager-load them, so the client normalises each to `[]`
  before handing a ticket to the UI.
- **Writes return the whole ticket.** Callers replace their local copy from the response
  rather than refetching.

Custody events are append-only and the server enforces it: a correction is a new event that
supersedes the old one, never an edit. Ticket numbers and claim codes are allocated server-side.

## Tech notes

- **Auth**: Zustand store persisted to localStorage; bearer token attached by `src/lib/api/client.ts`.
  The storage key is still `agri-pos-auth` — renaming it would sign out every existing session, so it
  is left alone deliberately.
- **Theming**: design tokens in `globals.css`; ImmerSons red `--brand` with the signage yellow as
  `--accent`. Dark mode is opt-in via `data-theme="dark"` and works by retinting Tailwind's palette
  variables rather than editing call sites.
- **Charts**: hand-rolled responsive SVG, no chart library.
- **Printing**: a print stylesheet isolates the receipt / statement / report / slip surfaces and
  restores light tokens so dark mode never prints invisible ink.
- **Static export**: `output: "export"`. Dynamic routes ship a `placeholder` param and resolve the
  real id client-side.

## Project structure

```
src/
  app/
    pos/              counter register
    service-tickets/  repair jobs (list, intake, detail, slips)
    customers/        directory + per-customer vehicles & history
    …                 products, inventory, suppliers, reports, settings
  components/         Shell, ui primitives, charts, pickers, receipt
  lib/api/            one module per backend resource
```
