"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BatteryCharging,
  Boxes,
  Car,
  Check,
  CircleDot,
  CreditCard,
  Disc3,
  Gauge,
  ScanBarcode,
  ShoppingCart,
  Sparkles,
  Truck,
  Wrench,
  Zap,
} from "lucide-react";
import { useAuthHydrated, useAuthStore } from "@/lib/auth-store";
import { ImmerSonsMark } from "@/components/ImmerSonsMark";
import { cx } from "@/lib/utils";

export default function LandingPage() {
  const hydrated = useAuthHydrated();
  const token = useAuthStore((s) => s.token);
  const signedIn = hydrated && !!token;
  const appHref = signedIn ? "/dashboard" : "/login";
  const appLabel = signedIn ? "Open dashboard" : "Sign in";

  return (
    <div className="lp-root min-h-screen bg-page text-ink">
      <LandingStyles />
      <Nav appHref={appHref} appLabel={appLabel} />
      <Hero appHref={appHref} signedIn={signedIn} />
      <Marquee />
      <Stats />
      <Features />
      <Workflow />
      <FinalCta appHref={appHref} signedIn={signedIn} />
      <Footer />
    </div>
  );
}

/* ---------------------------------- Nav ---------------------------------- */

function Nav({ appHref, appLabel }: { appHref: string; appLabel: string }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cx(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled ? "border-b border-white/10 bg-[#240707]/80 backdrop-blur-xl" : "bg-transparent"
      )}
    >
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link href="/" prefetch={false} className="flex items-center gap-2.5">
          <span className="lp-logo-glow flex items-center justify-center rounded-[0.3rem]">
            <ImmerSonsMark size={34} />
          </span>
          <span className="text-[15px] font-semibold leading-tight tracking-tight text-white">
            ImmerSons <span className="text-[#FFD400]">AutoMoto</span>
          </span>
        </Link>

        <div className="hidden items-center gap-7 text-[13px] font-medium text-red-100/70 md:flex">
          <a href="#features" className="transition-colors hover:text-white">Features</a>
          <a href="#workflow" className="transition-colors hover:text-white">How it works</a>
          <a href="#cta" className="transition-colors hover:text-white">Get started</a>
        </div>

        <Link
          href={appHref}
          prefetch={false}
          className="group flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[13px] font-semibold text-white backdrop-blur transition-all hover:border-[#FFD400]/50 hover:bg-white/20"
        >
          {appLabel}
          <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      </nav>
    </header>
  );
}

/* ---------------------------------- Hero --------------------------------- */

function Hero({ appHref, signedIn }: { appHref: string; signedIn: boolean }) {
  const heroRef = useRef<HTMLElement>(null);

  // Mouse parallax: write normalized coords to CSS vars, layers pick their own depth.
  useEffect(() => {
    const el = heroRef.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", String((e.clientX - r.left) / r.width - 0.5));
      el.style.setProperty("--my", String((e.clientY - r.top) / r.height - 0.5));
    };
    el.addEventListener("mousemove", onMove);
    return () => el.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <section
      ref={heroRef}
      className="relative overflow-hidden pt-16"
      style={{ background: "linear-gradient(160deg, #180404 0%, #3d0a0a 35%, #8f1414 72%, #c81e1e 100%)" }}
    >
      {/* Aurora blobs */}
      <div className="lp-blob lp-blob-a" />
      <div className="lp-blob lp-blob-b" />
      <div className="lp-blob lp-blob-c" />
      {/* Drifting dot grid */}
      <div className="lp-grid pointer-events-none absolute inset-0" />

      <div className="relative mx-auto grid max-w-6xl gap-14 px-5 pb-24 pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pb-32 lg:pt-24">
        {/* Copy */}
        <div>
          <div className="lp-fade-in mb-6 inline-flex items-center gap-2 rounded-full border border-[#FFD400]/30 bg-[#FFD400]/10 py-1.5 pl-2 pr-3.5 text-xs font-medium text-amber-50">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#FFD400]/25">
              <Wrench size={11} className="text-[#FFD400]" />
            </span>
            Built for auto supply & auto care
          </div>

          <h1 className="text-4xl font-semibold leading-[1.06] tracking-tight text-white sm:text-5xl lg:text-[3.6rem]">
            <HeadlineWord delay={0}>Parts</HeadlineWord> <HeadlineWord delay={80}>out</HeadlineWord>{" "}
            <HeadlineWord delay={160}>front.</HeadlineWord>
            <br />
            <HeadlineWord delay={300}>
              <span className="lp-shimmer">Jobs in the bay.</span>
            </HeadlineWord>
          </h1>

          <p className="lp-fade-in mt-6 max-w-lg text-[15px] leading-relaxed text-red-100/75" style={{ animationDelay: "550ms" }}>
            One system for the whole shop — tires, mags, batteries and parts over the counter, plus repair
            jobs tracked from intake to release with a full chain of custody on every vehicle you take in.
          </p>

          <div className="lp-fade-in mt-8 flex flex-wrap items-center gap-3" style={{ animationDelay: "700ms" }}>
            <Link
              href={appHref}
              prefetch={false}
              className="lp-cta group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-gradient-to-r from-[#FFD400] to-amber-400 px-6 py-3 text-sm font-semibold text-[#3f2d00] shadow-xl shadow-black/40 transition-transform hover:scale-[1.03] active:scale-[0.98]"
            >
              <ShoppingCart size={16} />
              {signedIn ? "Open the register" : "Start selling"}
              <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/15"
            >
              Explore features
            </a>
          </div>

          <div className="lp-fade-in mt-9 flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-red-200/60" style={{ animationDelay: "850ms" }}>
            {["Works on any device", "Peso-ready receipts", "Dark mode included"].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <Check size={13} className="text-[#FFD400]" /> {t}
              </span>
            ))}
          </div>
        </div>

        {/* POS mock + floating chips */}
        <div className="lp-parallax relative mx-auto w-full max-w-md" style={{ ["--depth" as string]: "6" }}>
          <PosMock />

          <FloatChip className="-left-6 top-6 lg:-left-14" depth={22} delay="0s">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FFD400]/20 text-[#FFD400]">
              <Gauge size={14} />
            </span>
            <span>
              <span className="block text-[10px] text-red-200/60">Net sales today</span>
              <span className="text-[13px] font-semibold text-white">₱48,220</span>
            </span>
          </FloatChip>

          <FloatChip className="-right-4 top-32 lg:-right-12" depth={16} delay="1.2s">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400/20 text-amber-300">
              <CircleDot size={14} />
            </span>
            <span>
              <span className="block text-[10px] text-red-200/60">Low stock</span>
              <span className="text-[13px] font-semibold text-white">Dunlop D404 · 4 left</span>
            </span>
          </FloatChip>

          <FloatChip className="-bottom-5 left-8" depth={12} delay="2.1s">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-400/20 text-sky-300">
              <Wrench size={14} />
            </span>
            <span>
              <span className="block text-[10px] text-red-200/60">In the bay</span>
              <span className="text-[13px] font-semibold text-white">ABC-1234 · PMS + brake pads</span>
            </span>
          </FloatChip>
        </div>
      </div>

      {/* Wave divider into the page background */}
      <svg className="relative block w-full text-page" viewBox="0 0 1440 70" preserveAspectRatio="none" aria-hidden>
        <path fill="currentColor" d="M0,40 C240,80 480,0 720,24 C960,48 1200,72 1440,32 L1440,70 L0,70 Z" />
      </svg>
    </section>
  );
}

function HeadlineWord({ children, delay }: { children: ReactNode; delay: number }) {
  return (
    <span className="inline-block overflow-hidden pb-1 align-bottom">
      <span className="lp-word inline-block" style={{ animationDelay: `${delay}ms` }}>
        {children}
      </span>
    </span>
  );
}

function FloatChip({
  children,
  className,
  depth,
  delay,
}: {
  children: ReactNode;
  className: string;
  depth: number;
  delay: string;
}) {
  return (
    <div className={cx("lp-parallax absolute z-10", className)} style={{ ["--depth" as string]: String(depth) }}>
      <div
        className="lp-bob flex items-center gap-2.5 rounded-md border border-white/15 bg-[#2a0808]/80 px-3.5 py-2.5 shadow-2xl shadow-black/40 backdrop-blur-xl"
        style={{ animationDelay: delay }}
      >
        {children}
      </div>
    </div>
  );
}

const MOCK_ITEMS = [
  { name: "Dunlop D404 150/80-16", qty: "1 pc", price: "₱4,350" },
  { name: "Motolite Gold 3SM", qty: "1 pc", price: "₱3,180" },
  { name: "Shell Advance AX7 1L", qty: "2 pcs", price: "₱1,040" },
  { name: "Labour · PMS + brake service", qty: "1 job", price: "₱1,800" },
];

function PosMock() {
  return (
    <div className="lp-tilt relative overflow-hidden rounded-3xl border border-white/12 bg-gradient-to-b from-white/[0.09] to-white/[0.03] shadow-2xl shadow-black/50 backdrop-blur-2xl">
      {/* Window header */}
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
        <div className="flex items-center gap-2 text-xs font-medium text-red-100/80">
          <ImmerSonsMark size={16} />
          ImmerSons · Register 1
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-[#FFD400]/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#FFD400]">
          <span className="lp-pulse-dot h-1.5 w-1.5 rounded-full bg-[#FFD400]" /> Live
        </span>
      </div>

      {/* Barcode scan strip */}
      <div className="relative mx-5 mt-4 overflow-hidden rounded-[0.3rem] border border-dashed border-[#FFD400]/25 bg-[#FFD400]/[0.06] px-4 py-3">
        <div className="flex items-center gap-2.5 text-xs text-red-100/70">
          <ScanBarcode size={16} className="text-[#FFD400]" />
          Scan item or search…
        </div>
        <div className="lp-scan absolute inset-y-0 w-16 bg-gradient-to-r from-transparent via-[#FFD400]/25 to-transparent" />
      </div>

      {/* Ticket lines */}
      <div className="flex flex-col gap-1.5 px-5 py-4">
        {MOCK_ITEMS.map((item, i) => (
          <div
            key={item.name}
            className="lp-ticket-row flex items-center justify-between rounded-[0.3rem] bg-white/[0.05] px-3.5 py-2.5"
            style={{ animationDelay: `${900 + i * 220}ms` }}
          >
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium text-white">{item.name}</p>
              <p className="text-[11px] text-red-200/50">{item.qty}</p>
            </div>
            <span className="tabular text-[13px] font-semibold text-red-100">{item.price}</span>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="border-t border-white/10 px-5 py-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-widest text-red-200/60">Total</span>
          <span className="tabular text-2xl font-semibold tracking-tight text-white">₱10,370</span>
        </div>
        <div className="lp-ticket-row mt-3 flex items-center justify-center gap-2 rounded-[0.3rem] bg-gradient-to-r from-[#FFD400] to-amber-400 py-2.5 text-sm font-semibold text-[#3f2d00]" style={{ animationDelay: "2000ms" }}>
          <Zap size={15} /> Charge — cash, GCash or credit
        </div>
      </div>
    </div>
  );
}

/* -------------------------------- Marquee -------------------------------- */

const CATEGORIES = [
  { icon: CircleDot, label: "Tires" },
  { icon: Disc3, label: "Mags & wheels" },
  { icon: BatteryCharging, label: "Batteries" },
  { icon: Boxes, label: "Spare parts" },
  { icon: Sparkles, label: "Accessories" },
  { icon: Wrench, label: "PMS & repairs" },
  { icon: Gauge, label: "Oils & lubricants" },
  { icon: Truck, label: "Bulk & fleet orders" },
];

function Marquee() {
  return (
    <div className="relative overflow-hidden border-y border-black/[0.06] bg-card py-4">
      <div className="lp-marquee flex w-max items-center gap-10">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex items-center gap-10" aria-hidden={copy === 1}>
            {CATEGORIES.map(({ icon: Icon, label }) => (
              <span key={label} className="flex items-center gap-2 whitespace-nowrap text-[13px] font-medium text-ink-muted">
                <Icon size={15} className="text-brand-strong" /> {label}
              </span>
            ))}
          </div>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-card to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-card to-transparent" />
    </div>
  );
}

/* --------------------------------- Stats --------------------------------- */

const STATS = [
  { value: 12000, suffix: "+", label: "Sales rung up monthly" },
  { value: 3500, suffix: "+", label: "SKUs — tires to spark plugs" },
  { value: 98, suffix: "%", label: "Faster than pen-and-paper checkout" },
  { value: 24, suffix: "/7", label: "Your ledger, always up to date" },
];

function Stats() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-16">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {STATS.map((s, i) => (
          <Reveal key={s.label} delay={i * 100}>
            <div className="card group p-5 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
              <p className="tabular text-3xl font-semibold tracking-tight text-brand-strong">
                <CountUp to={s.value} />
                {s.suffix}
              </p>
              <p className="mt-1.5 text-xs font-medium text-ink-muted">{s.label}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function CountUp({ to }: { to: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          setDisplay(to);
          return;
        }
        const start = performance.now();
        const duration = 1600;
        const tick = (now: number) => {
          const t = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(2, -10 * t); // easeOutExpo
          setDisplay(Math.round(to * (t === 1 ? 1 : eased)));
          if (t < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to]);

  return <span ref={ref}>{display.toLocaleString()}</span>;
}

/* -------------------------------- Features ------------------------------- */

const FEATURES = [
  {
    icon: ScanBarcode,
    title: "Lightning-fast counter",
    body: "Scan barcodes, filter by department, and ring up a queue of walk-ins fast. Cash, GCash, or store credit for your suki accounts.",
    accent: "from-red-400 to-red-600",
  },
  {
    icon: Wrench,
    title: "Repair jobs & chain of custody",
    body: "Open a job order at intake, log every handoff, part and QC check, then release with a signed slip. You always know who held the unit.",
    accent: "from-amber-400 to-orange-500",
  },
  {
    icon: CircleDot,
    title: "Parts-smart inventory",
    body: "Track stock by size, brand and fitment — 150/80-16 or 3SM — with reorder points that flag a fast-moving tire before it runs out.",
    accent: "from-zinc-400 to-slate-600",
  },
  {
    icon: CreditCard,
    title: "Customer & fleet ledgers",
    body: "Extend utang with confidence. Credit limits, running balances, payment recording, and printable statements for every account.",
    accent: "from-rose-400 to-red-500",
  },
  {
    icon: Truck,
    title: "Suppliers & deliveries",
    body: "Purchase orders, receiving, and delivery tracking in one flow — know exactly when the next batch of tires lands at your door.",
    accent: "from-sky-400 to-blue-500",
  },
  {
    icon: BarChart3,
    title: "Reports that matter",
    body: "Daily sales, top movers, low stock, and print-ready monthly reports. See which tire sells and which accessory gathers dust.",
    accent: "from-violet-400 to-purple-500",
  },
];

function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-16">
      <Reveal>
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-brand-strong">Counter and bay, one system</p>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            From the first scan to the final release
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-secondary">
            Every module an auto supply shop needs, wired together — so a job in the bay draws parts from
            your stock, bills through the register, and lands in your reports in the same heartbeat.
          </p>
        </div>
      </Reveal>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f, i) => (
          <Reveal key={f.title} delay={(i % 3) * 120}>
            <div className="card group relative h-full overflow-hidden p-6 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl">
              <div className={cx("absolute inset-x-0 top-0 h-1 bg-gradient-to-r opacity-0 transition-opacity duration-300 group-hover:opacity-100", f.accent)} />
              <div className={cx("mb-4 inline-flex h-11 w-11 items-center justify-center rounded-[0.3rem] bg-gradient-to-br text-white shadow-md transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3", f.accent)}>
                <f.icon size={20} />
              </div>
              <h3 className="text-[15px] font-semibold tracking-tight">{f.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-secondary">{f.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------- Workflow ------------------------------- */

const STEPS = [
  {
    icon: Boxes,
    title: "Stock the shelves",
    body: "Add parts with barcodes, brands, sizes and reorder points — or receive them straight from a purchase order.",
  },
  {
    icon: Car,
    title: "Take the unit in",
    body: "Open a job order at intake: vehicle, odometer, complaint, and the customer property you're holding with it.",
  },
  {
    icon: Wrench,
    title: "Work it and release",
    body: "Assign a bay, log parts and QC, then release against a signed slip and bill the whole job through the register.",
  },
];

function Workflow() {
  return (
    <section id="workflow" className="scroll-mt-20 border-y border-black/[0.06] bg-card py-20">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal>
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-brand-strong">How it works</p>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Three steps to a smoother shop</h2>
          </div>
        </Reveal>

        <div className="relative grid gap-10 md:grid-cols-3 md:gap-6">
          {/* Connector line */}
          <div className="absolute left-[16.6%] right-[16.6%] top-7 hidden h-px bg-gradient-to-r from-transparent via-red-500/40 to-transparent md:block" />
          {STEPS.map((s, i) => (
            <Reveal key={s.title} delay={i * 150}>
              <div className="relative text-center">
                <div className="relative mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-md bg-gradient-to-br from-[#c81e1e] to-[#7f1010] text-white shadow-lg shadow-red-600/25">
                  <s.icon size={22} />
                  <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-page text-[10px] font-bold text-brand-strong ring-1 ring-red-500/40">
                    {i + 1}
                  </span>
                </div>
                <h3 className="text-[15px] font-semibold tracking-tight">{s.title}</h3>
                <p className="mx-auto mt-2 max-w-xs text-[13px] leading-relaxed text-ink-secondary">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* -------------------------------- Final CTA ------------------------------- */

function FinalCta({ appHref, signedIn }: { appHref: string; signedIn: boolean }) {
  return (
    <section id="cta" className="scroll-mt-20 px-5 py-20">
      <Reveal>
        <div
          className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl px-8 py-14 text-center shadow-2xl shadow-red-900/20"
          style={{ background: "linear-gradient(135deg, #3d0a0a 0%, #a41515 55%, #c81e1e 100%)" }}
        >
          <div className="lp-blob lp-blob-cta" />
          <div className="relative">
            <span className="lp-bob mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-md bg-white/10 ring-1 ring-white/20 backdrop-blur">
              <Wrench size={24} className="text-[#FFD400]" />
            </span>
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Ready to run the fastest shop in town?
            </h2>
            <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-red-100/75">
              Sign in and put the counter, the bays and the books on one screen.
            </p>
            <Link
              href={appHref}
              prefetch={false}
              className="group mt-8 inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-[#8f1414] shadow-xl transition-transform hover:scale-[1.04] active:scale-[0.98]"
            >
              {signedIn ? "Open the dashboard" : "Sign in to get started"}
              <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-black/[0.06] py-8">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 text-xs text-ink-muted">
        <span className="flex items-center gap-2">
          <ImmerSonsMark size={22} />
          <span className="font-medium text-ink-secondary">ImmerSons AutoMoto</span> — tires, parts & auto care services
        </span>
        <span>© {new Date().getFullYear()} ImmerSons Auto Care Services. All rights reserved.</span>
      </div>
    </footer>
  );
}

/* --------------------------- Scroll reveal helper ------------------------- */

function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cx("h-full transition-all duration-700 ease-out", visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0")}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* --------------------------------- Styles -------------------------------- */

function LandingStyles() {
  return (
    <style>{`
      html:has(.lp-root) { scroll-behavior: smooth; }

      /* Entrances */
      @keyframes lp-fade-in {
        from { opacity: 0; transform: translateY(14px); }
        to { opacity: 1; transform: none; }
      }
      .lp-fade-in { opacity: 0; animation: lp-fade-in 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards; }

      @keyframes lp-word {
        from { transform: translateY(110%); }
        to { transform: none; }
      }
      .lp-word { transform: translateY(110%); animation: lp-word 0.9s cubic-bezier(0.22, 1, 0.36, 1) forwards; }

      @keyframes lp-ticket-row {
        from { opacity: 0; transform: translateX(18px); }
        to { opacity: 1; transform: none; }
      }
      .lp-ticket-row { opacity: 0; animation: lp-ticket-row 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards; }

      /* Shimmering gradient text */
      @keyframes lp-shimmer {
        0% { background-position: 0% 50%; }
        100% { background-position: 200% 50%; }
      }
      .lp-shimmer {
        background: linear-gradient(90deg, #FFD400, #fff1a8, #ffb703, #FFD400);
        background-size: 200% 100%;
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
        animation: lp-shimmer 5s linear infinite;
      }

      /* Aurora blobs */
      @keyframes lp-drift-a {
        0%, 100% { transform: translate(0, 0) scale(1); }
        50% { transform: translate(60px, -40px) scale(1.15); }
      }
      @keyframes lp-drift-b {
        0%, 100% { transform: translate(0, 0) scale(1.1); }
        50% { transform: translate(-70px, 30px) scale(0.95); }
      }
      .lp-blob { position: absolute; border-radius: 9999px; filter: blur(80px); pointer-events: none; }
      .lp-blob-a {
        top: -120px; left: -80px; width: 480px; height: 480px;
        background: radial-gradient(circle, rgba(248, 113, 113, 0.3), transparent 70%);
        animation: lp-drift-a 14s ease-in-out infinite;
      }
      .lp-blob-b {
        top: 20%; right: -140px; width: 520px; height: 520px;
        background: radial-gradient(circle, rgba(255, 212, 0, 0.18), transparent 70%);
        animation: lp-drift-b 18s ease-in-out infinite;
      }
      .lp-blob-c {
        bottom: -160px; left: 30%; width: 560px; height: 560px;
        background: radial-gradient(circle, rgba(251, 146, 60, 0.14), transparent 70%);
        animation: lp-drift-a 22s ease-in-out infinite reverse;
      }
      .lp-blob-cta {
        top: -140px; right: -100px; width: 380px; height: 380px;
        background: radial-gradient(circle, rgba(255, 212, 0, 0.22), transparent 70%);
        animation: lp-drift-b 12s ease-in-out infinite;
      }

      /* Drifting dot grid */
      @keyframes lp-grid-pan {
        from { background-position: 0 0; }
        to { background-position: 48px 48px; }
      }
      .lp-grid {
        background-image: radial-gradient(rgba(255, 255, 255, 0.09) 1px, transparent 1px);
        background-size: 24px 24px;
        mask-image: radial-gradient(ellipse 90% 70% at 50% 30%, #000 30%, transparent 75%);
        -webkit-mask-image: radial-gradient(ellipse 90% 70% at 50% 30%, #000 30%, transparent 75%);
        animation: lp-grid-pan 16s linear infinite;
      }

      /* Floating chips bob */
      @keyframes lp-bob {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-9px); }
      }
      .lp-bob { animation: lp-bob 5s ease-in-out infinite; }

      /* Barcode scanline sweep */
      @keyframes lp-scan {
        from { left: -20%; }
        to { left: 110%; }
      }
      .lp-scan { animation: lp-scan 2.6s ease-in-out infinite; }

      /* Live dot pulse */
      @keyframes lp-pulse-dot {
        0%, 100% { box-shadow: 0 0 0 0 rgba(255, 212, 0, 0.6); }
        70% { box-shadow: 0 0 0 6px rgba(255, 212, 0, 0); }
      }
      .lp-pulse-dot { animation: lp-pulse-dot 1.8s ease-out infinite; }

      /* CTA sheen */
      .lp-cta::after {
        content: "";
        position: absolute;
        inset: 0;
        background: linear-gradient(105deg, transparent 40%, rgba(255, 255, 255, 0.55) 50%, transparent 60%);
        transform: translateX(-120%);
        transition: transform 0.7s ease;
      }
      .lp-cta:hover::after { transform: translateX(120%); }

      /* Mouse parallax layers (driven by --mx/--my set on the hero) */
      .lp-parallax {
        transform: translate3d(calc(var(--mx, 0) * var(--depth, 8) * 1px), calc(var(--my, 0) * var(--depth, 8) * 1px), 0);
        transition: transform 0.25s ease-out;
      }

      /* Slow idle tilt on the POS mock */
      @keyframes lp-tilt {
        0%, 100% { transform: perspective(1200px) rotateX(1.5deg) rotateY(-2deg); }
        50% { transform: perspective(1200px) rotateX(-1deg) rotateY(2deg); }
      }
      .lp-tilt { animation: lp-tilt 10s ease-in-out infinite; }

      /* Category marquee */
      @keyframes lp-marquee {
        from { transform: translateX(0); }
        to { transform: translateX(-50%); }
      }
      .lp-marquee { animation: lp-marquee 28s linear infinite; }
      .lp-marquee:hover { animation-play-state: paused; }

      .lp-logo-glow { filter: drop-shadow(0 0 12px rgba(255, 212, 0, 0.45)); }

      @media (prefers-reduced-motion: reduce) {
        .lp-root *, .lp-root *::after { animation: none !important; transition: none !important; }
        .lp-fade-in, .lp-word, .lp-ticket-row { opacity: 1; transform: none; }
      }
    `}</style>
  );
}
