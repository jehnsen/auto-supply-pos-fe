"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  Banknote,
  Building2,
  Car,
  ClipboardCheck,
  ClipboardList,
  DoorClosed,
  DoorOpen,
  Factory,
  Landmark,
  LayoutDashboard,
  Package,
  PauseCircle,
  Printer,
  Receipt,
  RotateCcw,
  ScanBarcode,
  Search,
  Settings,
  ShoppingCart,
  Smartphone,
  Truck,
  Users,
  Wallet,
  Warehouse,
  Wrench,
  XCircle,
} from "lucide-react";
import { Badge, PageHeader } from "@/components/ui";
import { ImmerSonsMark } from "@/components/ImmerSonsMark";
import { cx } from "@/lib/utils";

/* ---------- Section scaffolding ---------- */

const sections = [
  { id: "workflow", label: "Daily workflow" },
  { id: "modules", label: "Modules & functions" },
  { id: "pos-manual", label: "POS user manual" },
  { id: "repair-manual", label: "Repair jobs & custody" },
] as const;

type SectionId = (typeof sections)[number]["id"];

export default function DocsPage() {
  const [active, setActive] = useState<SectionId>("workflow");

  // Highlight the nav item for whichever section is nearest the top of the viewport.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id as SectionId);
      },
      { rootMargin: "-96px 0px -60% 0px", threshold: 0 }
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="p-6">
      <PageHeader
        title="Documentation"
        subtitle="How the shop runs, from opening the drawer to releasing a unit — with a module reference, a sales guide, and the repair-job manual."
      />

      <div className="flex gap-8">
        {/* On-page nav */}
        <aside className="sticky top-6 hidden h-fit w-52 shrink-0 lg:block">
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">On this page</p>
          <nav className="flex flex-col gap-0.5">
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className={cx(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active === s.id ? "bg-brand-soft text-brand-strong" : "text-ink-secondary hover:bg-black/[0.04] hover:text-ink"
                )}
              >
                {s.label}
              </a>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 max-w-3xl flex-1">
          <WorkflowSection />
          <ModulesSection />
          <PosManualSection />
          <RepairManualSection />

          <footer className="mt-10 flex flex-col items-center gap-1 text-center">
            <span className="flex items-center gap-1.5 text-sm font-medium text-ink-secondary">
              <ImmerSonsMark size={16} />
              ImmerSons AutoMoto POS
            </span>
            <p className="text-xs text-ink-muted">
              Developed by <span className="font-medium text-ink-secondary">Jehnsen Enrique</span>
            </p>
            <p className="text-[11px] text-ink-muted">© {new Date().getFullYear()} · All rights reserved</p>
          </footer>
        </div>
      </div>
    </div>
  );
}

/* ---------- Shared building blocks ---------- */

function Section({ id, title, intro, children }: { id: string; title: string; intro?: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-b border-black/[0.07] pb-10 pt-2 last:border-b-0">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {intro && <p className="mt-1.5 text-sm leading-relaxed text-ink-secondary">{intro}</p>}
      <div className="mt-5 flex flex-col gap-5">{children}</div>
    </section>
  );
}

function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("card p-5", className)}>{children}</div>;
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <div className="flex gap-3.5">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">
        {n}
      </span>
      <div className="min-w-0 pt-0.5">
        <p className="text-sm font-semibold">{title}</p>
        <div className="mt-1 text-sm leading-relaxed text-ink-secondary">{children}</div>
      </div>
    </div>
  );
}

function ButtonRef({ children }: { children: ReactNode }) {
  return (
    <span className="mx-0.5 inline-flex items-center gap-1 rounded-md border border-black/10 bg-black/[0.03] px-1.5 py-0.5 text-[12px] font-medium text-ink">
      {children}
    </span>
  );
}

function NavRef({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-black/[0.05] px-1.5 py-0.5 text-[12px] font-medium text-ink">
      {icon}
      {children}
    </span>
  );
}

/* ---------- 1. Daily workflow ---------- */

function WorkflowSection() {
  return (
    <Section
      id="workflow"
      title="1. Daily workflow"
      intro="A day at the shop runs on two tracks at once: parts over the counter, and units in the bays. Open the drawer, serve both, then reconcile and close."
    >
      <Card>
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft text-brand-strong">
            <DoorOpen size={17} />
          </span>
          <h3 className="text-sm font-semibold">Morning — Open the shift</h3>
        </div>
        <div className="flex flex-col gap-4">
          <Step n={1} title="Sign in">
            Each cashier signs in with their own account. Your role (owner, manager, cashier, or inventory staff)
            controls which modules you can reach.
          </Step>
          <Step n={2} title="Open a shift & declare the cash float">
            Go to <NavRef icon={<ClipboardCheck size={13} />}>Shifts</NavRef> and choose{" "}
            <ButtonRef><DoorOpen size={12} /> Open shift</ButtonRef>. Count the starting cash in the drawer and enter it
            as the <strong>opening cash float</strong>. Sales cannot be recorded until a shift is open — the POS shows a
            banner and disables charging otherwise.
          </Step>
          <Step n={3} title="Check the board">
            Review <NavRef icon={<Wrench size={13} />}>Repair Jobs</NavRef> for units still in the shop, anything waiting
            on parts or customer approval, and jobs ready for release. Check{" "}
            <NavRef icon={<Warehouse size={13} />}>Inventory</NavRef> for low-stock warnings on fast movers — tires,
            batteries and oils — so you can flag reorders early.
          </Step>
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft text-brand-strong">
            <ShoppingCart size={17} />
          </span>
          <h3 className="text-sm font-semibold">Through the day — Sell & service</h3>
        </div>
        <div className="flex flex-col gap-4">
          <Step n={4} title="Ring up a counter sale">
            On <NavRef icon={<ShoppingCart size={13} />}>Point of Sale</NavRef>, search or scan parts into the cart,
            set quantities, choose a customer if it is on account, then charge and take payment. Full button-by-button
            detail is in the <a href="#pos-manual" className="font-medium text-brand-strong hover:underline">POS user manual</a> below.
          </Step>
          <Step n={5} title="Take a unit in for service">
            When a vehicle arrives, open a job order from{" "}
            <NavRef icon={<Wrench size={13} />}>Repair Jobs</NavRef> → <ButtonRef>New job order</ButtonRef>. Record the
            vehicle, odometer, the customer&apos;s complaint, and any property you are holding with it. See the{" "}
            <a href="#repair-manual" className="font-medium text-brand-strong hover:underline">repair jobs manual</a>.
          </Step>
          <Step n={6} title="Handle credit & accounts">
            Sales to a registered account can be placed on credit. Track and collect these under{" "}
            <NavRef icon={<Wallet size={13} />}>Accounts Receivable</NavRef>, and view a customer&apos;s running
            statement from their profile.
          </Step>
          <Step n={7} title="Park & resume orders">
            If a customer steps away, <ButtonRef>Hold</ButtonRef> the order and serve the next person. Resume it later
            from <ButtonRef><PauseCircle size={12} /> Held</ButtonRef>.
          </Step>
          <Step n={8} title="Correct mistakes">
            Wrong item or overcharge? <strong>Void</strong> or <strong>refund</strong> the transaction from{" "}
            <NavRef icon={<BarChart3 size={13} />}>Reports → Transactions</NavRef>. Both are captured in the shift totals.
          </Step>
          <Step n={9} title="Check the drawer any time (X-Reading)">
            Run an <ButtonRef><Receipt size={12} /> X-Reading</ButtonRef> from Shifts for a running snapshot of sales
            and cash by payment method. It does not close the drawer and can be run as often as you like.
          </Step>
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft text-brand-strong">
            <DoorClosed size={17} />
          </span>
          <h3 className="text-sm font-semibold">End of day — Close & reconcile</h3>
        </div>
        <div className="flex flex-col gap-4">
          <Step n={10} title="Account for every unit">
            Before closing, confirm each job order is either released or properly parked in a status that says where it
            actually stands. Any customer property still held should be visible on its job order.
          </Step>
          <Step n={11} title="Count the drawer">
            Choose <ButtonRef><DoorClosed size={12} /> Close shift</ButtonRef>, count the physical cash, and enter the{" "}
            <strong>counted closing cash</strong>.
          </Step>
          <Step n={12} title="Review the Z-Reading">
            The system compares counted cash against expected cash and records any{" "}
            <strong>variance</strong> (over / short / balanced). It generates the <strong>Z-Reading</strong> — the
            official end-of-day summary of gross sales, discounts, VAT, and totals per payment method. Print it{" "}
            <ButtonRef><Printer size={12} /> Print</ButtonRef> for your records.
          </Step>
          <Step n={13} title="File reports">
            Managers review the day under <NavRef icon={<BarChart3 size={13} />}>Reports</NavRef> — daily sales, top
            movers, and the <NavRef icon={<BarChart3 size={13} />}>Monthly report</NavRef> for period totals.
          </Step>
        </div>
      </Card>

      <div className="rounded-lg border border-brand/20 bg-brand-soft/40 px-4 py-3 text-sm text-ink-secondary">
        <strong className="text-brand-strong">At a glance:</strong> Sign in → Open shift (declare float) → Sell at the
        counter & open job orders for units → X-Reading as needed → Release finished units → Close shift (count cash) →
        Z-Reading → Reports.
      </div>
    </Section>
  );
}

/* ---------- 2. Modules & functions ---------- */

const modules: { icon: ReactNode; name: string; blurb: string; functions: string[]; roles?: string }[] = [
  {
    icon: <LayoutDashboard size={16} />,
    name: "Dashboard",
    blurb: "Landing overview of the shop's health.",
    functions: ["Today's sales & transaction counts", "Jobs currently in the shop", "Low-stock and quick alerts", "Recent activity snapshot"],
  },
  {
    icon: <ShoppingCart size={16} />,
    name: "Point of Sale",
    blurb: "The counter register where parts are rung up.",
    functions: [
      "Search or scan parts into a cart",
      "Adjust quantity, assign a customer",
      "Take cash / GCash / Maya / bank / check payments",
      "Hold & resume orders, print receipts",
    ],
  },
  {
    icon: <Wrench size={16} />,
    name: "Repair Jobs",
    blurb: "Job orders for every unit in the shop, with chain of custody.",
    functions: [
      "Open a job order at vehicle intake",
      "Track status from received to released",
      "Log parts, labour, and customer property",
      "Printable intake & release slips",
    ],
  },
  {
    icon: <ClipboardCheck size={16} />,
    name: "Shifts",
    blurb: "Cash-drawer sessions and end-of-day reconciliation.",
    functions: ["Open shift with a cash float", "X-Reading (interim snapshot)", "Close shift → Z-Reading with variance", "Shift history"],
  },
  {
    icon: <Package size={16} />,
    name: "Products",
    blurb: "The catalog of everything the shop sells.",
    functions: ["Create / edit parts, SKU & barcode", "Retail & wholesale pricing", "Departments and units", "Activate / deactivate items"],
    roles: "Owner, Manager, Inventory staff",
  },
  {
    icon: <Warehouse size={16} />,
    name: "Inventory",
    blurb: "Stock on hand and reorder signals.",
    functions: ["Current stock levels", "Low-stock warnings (badge in the sidebar)", "Stock adjustments"],
  },
  {
    icon: <Users size={16} />,
    name: "Customers",
    blurb: "Account holders, fleet clients and walk-ins — with their vehicles.",
    functions: ["Customer directory with codes", "Vehicles on file & service history", "Credit accounts & limits", "Statement of account (printable)"],
  },
  {
    icon: <Factory size={16} />,
    name: "Suppliers",
    blurb: "Vendors you buy stock from.",
    functions: ["Supplier directory", "Contact & terms", "Linked purchase orders"],
  },
  {
    icon: <ClipboardList size={16} />,
    name: "Purchase Orders",
    blurb: "Orders raised to restock the shop.",
    functions: ["Create POs to suppliers", "Track status", "Feed into deliveries"],
  },
  {
    icon: <Truck size={16} />,
    name: "Deliveries",
    blurb: "Receiving stock against purchase orders.",
    functions: ["Record received goods", "Update stock on receipt", "Match against POs"],
  },
  {
    icon: <Landmark size={16} />,
    name: "Accounts Payable",
    blurb: "What the shop owes suppliers.",
    functions: ["Outstanding supplier balances", "Record payments", "Aging view"],
  },
  {
    icon: <Wallet size={16} />,
    name: "Accounts Receivable",
    blurb: "What customers owe the shop on credit.",
    functions: ["Outstanding customer balances", "Record collections", "Aging & credit follow-up"],
  },
  {
    icon: <BarChart3 size={16} />,
    name: "Reports",
    blurb: "Sales analytics and transaction history.",
    functions: [
      "Sales summary, by product / department / payment",
      "Top customers & cashiers",
      "Transaction log — void & refund",
      "Monthly report",
    ],
  },
  {
    icon: <Settings size={16} />,
    name: "Settings",
    blurb: "Shop-wide configuration.",
    functions: ["Shop details & currency", "VAT rate & inclusive/exclusive", "Users & roles"],
    roles: "Owner, Manager only",
  },
];

function ModulesSection() {
  return (
    <Section
      id="modules"
      title="2. Modules & functions"
      intro="Every item in the left sidebar is a module. Here is what each one does and the main functions it provides."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {modules.map((m) => (
          <div key={m.name} className="card flex flex-col p-4">
            <div className="mb-1.5 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft text-brand-strong">
                {m.icon}
              </span>
              <h3 className="text-sm font-semibold">{m.name}</h3>
            </div>
            <p className="text-sm text-ink-secondary">{m.blurb}</p>
            <ul className="mt-3 flex flex-col gap-1.5">
              {m.functions.map((f) => (
                <li key={f} className="flex items-start gap-2 text-[13px] text-ink-secondary">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand" />
                  {f}
                </li>
              ))}
            </ul>
            {m.roles && (
              <div className="mt-3">
                <Badge tone="warning">{m.roles}</Badge>
              </div>
            )}
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ---------- 3. POS user manual ---------- */

const payMethods: { icon: ReactNode; label: string; note: string }[] = [
  { icon: <Banknote size={15} />, label: "Cash", note: "Enter cash tendered; change due is calculated. Tap Exact for the exact amount." },
  { icon: <Smartphone size={15} />, label: "GCash", note: "Confirm the e-wallet payment, then complete." },
  { icon: <Smartphone size={15} />, label: "Maya", note: "Confirm the e-wallet payment, then complete." },
  { icon: <Landmark size={15} />, label: "Bank transfer", note: "Confirm the transfer reference, then complete." },
  { icon: <Building2 size={15} />, label: "Check", note: "For fleet accounts paying by check; confirm, then complete." },
];

function PosManualSection() {
  return (
    <Section
      id="pos-manual"
      title="3. POS user manual — performing a sale"
      intro="The Point of Sale screen has two halves: the parts grid on the left and the cart on the right. Below is what each button does."
    >
      {/* Layout diagram */}
      <Card>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-dashed border-black/15 p-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Left — Parts</p>
            <div className="flex flex-col gap-2 text-sm text-ink-secondary">
              <span className="flex items-center gap-2"><Search size={14} /> Search / scan bar</span>
              <span className="flex items-center gap-2"><PauseCircle size={14} /> Held orders button</span>
              <span className="flex items-center gap-2"><ScanBarcode size={14} /> Product cards grid</span>
            </div>
          </div>
          <div className="rounded-lg border border-dashed border-black/15 p-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Right — Cart</p>
            <div className="flex flex-col gap-2 text-sm text-ink-secondary">
              <span className="flex items-center gap-2"><Users size={14} /> Customer selector</span>
              <span className="flex items-center gap-2"><ShoppingCart size={14} /> Cart lines (qty ± / remove)</span>
              <span className="flex items-center gap-2"><Wallet size={14} /> Totals & Hold / Clear / Charge</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Step-by-step */}
      <Card>
        <h3 className="mb-4 text-sm font-semibold">Step by step</h3>
        <div className="flex flex-col gap-4">
          <Step n={1} title="Add parts to the cart">
            Type a name or SKU in the <strong>search bar</strong> and press <ButtonRef>Enter</ButtonRef> to add the top
            match, or <strong>scan a barcode</strong> to add it instantly. You can also <strong>tap any product card</strong>
            {" "}in the grid. Out-of-stock items are greyed out; a <Badge tone="warning">Low</Badge> badge flags low stock.
          </Step>
          <Step n={2} title="Adjust quantities">
            On each cart line use <ButtonRef>−</ButtonRef> / <ButtonRef>+</ButtonRef> or type a number to set quantity.
            The POS blocks you from exceeding available stock. Use the <ButtonRef><XCircle size={12} /></ButtonRef> on a
            line to remove that item.
          </Step>
          <Step n={3} title="Pick the customer">
            At the top of the cart, leave it as <strong>Walk-in customer</strong> or choose a registered account —
            required if the sale goes on credit.
          </Step>
          <Step n={4} title="Review the totals">
            The cart shows <strong>Subtotal</strong>, <strong>estimated VAT</strong> (from your shop&apos;s tax settings),
            and the <strong>estimated total</strong>. Final figures are confirmed by the server when you charge.
          </Step>
          <Step n={5} title="Charge & take payment">
            Press <ButtonRef>Charge</ButtonRef> to open the payment window. Pick a method, enter cash tendered (for cash),
            and press <ButtonRef>Complete sale</ButtonRef>.
          </Step>
          <Step n={6} title="Print or start the next sale">
            On completion the receipt appears — <ButtonRef><Printer size={12} /> Print receipt</ButtonRef> for the customer,
            or <ButtonRef>New sale</ButtonRef> to clear and begin again.
          </Step>
        </div>
      </Card>

      {/* Button reference */}
      <Card>
        <h3 className="mb-4 text-sm font-semibold">Button reference</h3>
        <div className="flex flex-col divide-y divide-black/[0.06]">
          <ButtonRow icon={<Search size={15} />} name="Search / scan bar" desc="Find parts by name or SKU; press Enter to add the top match, or scan a barcode to add it directly." />
          <ButtonRow icon={<PauseCircle size={15} />} name="Held" desc="Open the list of parked orders to resume or discard them." />
          <ButtonRow icon={<Banknote size={15} />} name="Product card" desc="Tap to add one unit to the cart. Disabled when out of stock." />
          <ButtonRow icon={<span className="font-mono text-xs">− / +</span>} name="Quantity" desc="Decrease or increase a cart line's quantity, capped at available stock." />
          <ButtonRow icon={<XCircle size={15} />} name="Remove line" desc="Take a single item out of the cart." />
          <ButtonRow icon={<PauseCircle size={15} />} name="Hold" desc="Park the current cart under a name so you can serve someone else and resume later." />
          <ButtonRow icon={<RotateCcw size={15} />} name="Clear" desc="Empty the cart and reset the customer to Walk-in." />
          <ButtonRow icon={<Wallet size={15} />} name="Charge" desc="Open the payment window. Disabled until items are added and a shift is open." />
          <ButtonRow icon={<Printer size={15} />} name="Print receipt" desc="Print the thermal receipt after a completed sale." />
        </div>
      </Card>

      {/* Payment methods */}
      <Card>
        <h3 className="mb-4 text-sm font-semibold">Payment methods</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {payMethods.map((p) => (
            <div key={p.label} className="flex items-start gap-2.5 rounded-lg border border-black/[0.07] px-3 py-2.5">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand-strong">
                {p.icon}
              </span>
              <div>
                <p className="text-sm font-medium">{p.label}</p>
                <p className="text-[13px] text-ink-secondary">{p.note}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <strong>No open shift?</strong> The POS shows a banner and disables <ButtonRef>Charge</ButtonRef> until you open
        one. Head to <NavRef icon={<ClipboardCheck size={13} />}>Shifts</NavRef> and open a shift first.
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <Link href="/pos" prefetch={false} className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-hover">
          <ShoppingCart size={15} /> Open Point of Sale
        </Link>
        <Link href="/shifts" prefetch={false} className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 bg-card px-3.5 py-2 text-sm font-semibold text-ink transition-colors hover:bg-black/[0.03]">
          <ClipboardCheck size={15} /> Go to Shifts
        </Link>
      </div>
    </Section>
  );
}

function ButtonRow({ icon, name, desc }: { icon: ReactNode; name: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-black/[0.05] text-ink-secondary">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium">{name}</p>
        <p className="text-[13px] leading-relaxed text-ink-secondary">{desc}</p>
      </div>
    </div>
  );
}

/* ---------- 4. Repair jobs & chain of custody ---------- */

const STATUS_GUIDE: { label: string; when: string }[] = [
  { label: "Received", when: "The unit is in the shop and logged, but no one has looked at it yet." },
  { label: "Diagnosing", when: "A technician is inspecting to confirm the fault." },
  { label: "Awaiting approval", when: "You have quoted the work and are waiting on the customer's go-ahead." },
  { label: "Awaiting parts", when: "Work is paused pending a part you don't have on the shelf." },
  { label: "In progress", when: "Active work is happening in the bay." },
  { label: "Quality check", when: "Work is done and being verified before you hand it back." },
  { label: "Ready for release", when: "Passed QC; waiting for the customer to collect." },
  { label: "Released", when: "Handed back and signed for. The job is closed." },
];

function RepairManualSection() {
  return (
    <Section
      id="repair-manual"
      title="4. Repair jobs & chain of custody"
      intro="A job order is the record of a unit you are responsible for. It answers three questions at any moment: where is the vehicle, who is working on it, and what of the customer's did we take in with it."
    >
      <Card>
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft text-brand-strong">
            <Car size={17} />
          </span>
          <h3 className="text-sm font-semibold">Taking a unit in</h3>
        </div>
        <div className="flex flex-col gap-4">
          <Step n={1} title="Open a job order">
            From <NavRef icon={<Wrench size={13} />}>Repair Jobs</NavRef>, press{" "}
            <ButtonRef>New job order</ButtonRef>.
          </Step>
          <Step n={2} title="Identify the customer and the vehicle">
            Pick the customer, then their vehicle. If the unit is new to you, use{" "}
            <ButtonRef>Add a vehicle</ButtonRef> inside the picker to put it on file — plate, make, model, year and
            colour. Vehicles stay attached to the customer, so the next visit is two taps.
          </Step>
          <Step n={3} title="Record the state it arrived in">
            Enter the <strong>odometer</strong> and the customer&apos;s <strong>reported complaint</strong> in their own
            words. Assign a bay and technician now if you know them.
          </Step>
          <Step n={4} title="List customer property">
            Anything you keep with the unit — helmet, tools, spare tire, bag — goes in the property checklist with a
            condition note. This is the part that protects both sides if a question comes up later.
          </Step>
        </div>
      </Card>

      <Card>
        <h3 className="mb-3 text-sm font-semibold">What each status means</h3>
        <div className="flex flex-col divide-y divide-black/[0.06]">
          {STATUS_GUIDE.map((s) => (
            <div key={s.label} className="flex items-start gap-3 py-2">
              <span className="mt-0.5 w-36 shrink-0 text-[13px] font-medium">{s.label}</span>
              <span className="text-[13px] leading-relaxed text-ink-secondary">{s.when}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[13px] leading-relaxed text-ink-secondary">
          <strong>Awaiting approval</strong> and <strong>awaiting parts</strong> exist so a stalled job can say honestly
          why it is stalled, instead of sitting in &ldquo;in progress&rdquo; for three days.
        </p>
      </Card>

      <Card>
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft text-brand-strong">
            <Wrench size={17} />
          </span>
          <h3 className="text-sm font-semibold">Working the job</h3>
        </div>
        <div className="flex flex-col gap-4">
          <Step n={5} title="Record the diagnosis">
            <ButtonRef>Record diagnosis</ButtonRef> captures what the technician actually found, separately from what
            the customer reported.
          </Step>
          <Step n={6} title="Add parts and labour">
            <ButtonRef>Add line</ButtonRef> puts parts and labour on the job with quantity and price. The running total
            sits under the table; VAT is applied at checkout, not here.
          </Step>
          <Step n={7} title="Move the status as reality changes">
            Use the next-step button in the header, or the status dropdown for a non-linear move (e.g. back to{" "}
            <strong>awaiting parts</strong>). Every change is logged with who made it and when.
          </Step>
          <Step n={8} title="Note anything that matters">
            <ButtonRef>Add note</ButtonRef> records things like a phone approval or a customer instruction, so the
            reason for a decision survives the day.
          </Step>
        </div>
      </Card>

      <Card>
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft text-brand-strong">
            <ClipboardCheck size={17} />
          </span>
          <h3 className="text-sm font-semibold">Releasing the unit</h3>
        </div>
        <div className="flex flex-col gap-4">
          <Step n={9} title="Release and sign">
            At <strong>ready for release</strong>, press <ButtonRef>Release vehicle</ButtonRef>. Record who collected
            it and the odometer out. Any property still held is marked returned in the same step, so nothing is left
            outstanding.
          </Step>
          <Step n={10} title="Print the slip">
            The release slip prints the whole record — vehicle, complaint, findings, property, charges and the full
            custody trail — with signature lines for both sides. Print the intake slip the same way at drop-off.
          </Step>
          <Step n={11} title="Bill it at the counter">
            Ring the parts and labour up through <NavRef icon={<ShoppingCart size={13} />}>Point of Sale</NavRef> as
            you would any sale, on cash or the customer&apos;s account.
          </Step>
        </div>
      </Card>

      <div className="rounded-lg border border-brand/20 bg-brand-soft/40 px-4 py-3 text-sm text-ink-secondary">
        <strong className="text-brand-strong">The custody trail is append-only.</strong> Entries are never edited or
        deleted — a correction is recorded as a new entry that supersedes the old one, and the original stays visible.
        That is what makes it worth anything as evidence.
      </div>

      <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <strong>Where job orders are stored.</strong> Repair jobs and vehicles are currently saved in this browser on
        this device, not on the server. A job opened on the front-desk PC will not appear on a phone or another
        browser, and clearing site data clears them. Everything else — sales, stock, customers — is on the server as
        normal.
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <Link href="/service-tickets" prefetch={false} className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-hover">
          <Wrench size={15} /> Open Repair Jobs
        </Link>
      </div>
    </Section>
  );
}
