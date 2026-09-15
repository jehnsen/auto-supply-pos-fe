import {
  BatteryCharging,
  Car,
  CircleDot,
  Cog,
  Disc3,
  Droplets,
  Filter,
  Fuel,
  Lightbulb,
  Paintbrush,
  Settings2,
  ShieldCheck,
  Sparkles,
  Volume2,
  Wind,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";

interface CategoryStyle {
  icon: LucideIcon;
  /** Full static class names (Tailwind's JIT can't see interpolated `bg-${color}-50`). */
  classes: string;
  /** Left-edge accent for product cards, kept in the same hue as `classes`. */
  border: string;
  /** Selected-state filter chip, kept in the same hue as `classes`. */
  chip: string;
  /** Faint full-card tint so the grid reads by department at a glance, not just the corner icon. */
  wash: string;
}

/** The shop's departments. Each is a hue the counter learns to recognise at a glance. */
const DEPARTMENTS = {
  tires: { icon: CircleDot, classes: "bg-slate-50 text-slate-600", border: "border-l-slate-500", chip: "border-slate-300 bg-slate-50 text-slate-700", wash: "bg-slate-50/70 dark:bg-slate-500/10" },
  mags: { icon: Disc3, classes: "bg-zinc-100 text-zinc-600", border: "border-l-zinc-500", chip: "border-zinc-300 bg-zinc-100 text-zinc-700", wash: "bg-zinc-100/70 dark:bg-zinc-500/10" },
  batteries: { icon: BatteryCharging, classes: "bg-lime-50 text-lime-600", border: "border-l-lime-500", chip: "border-lime-300 bg-lime-50 text-lime-700", wash: "bg-lime-50/70 dark:bg-lime-500/10" },
  engine: { icon: Cog, classes: "bg-indigo-50 text-indigo-600", border: "border-l-indigo-500", chip: "border-indigo-300 bg-indigo-50 text-indigo-700", wash: "bg-indigo-50/70 dark:bg-indigo-500/10" },
  brakes: { icon: Disc3, classes: "bg-red-50 text-red-600", border: "border-l-red-500", chip: "border-red-300 bg-red-50 text-red-700", wash: "bg-red-50/70 dark:bg-red-500/10" },
  suspension: { icon: Settings2, classes: "bg-violet-50 text-violet-600", border: "border-l-violet-500", chip: "border-violet-300 bg-violet-50 text-violet-700", wash: "bg-violet-50/70 dark:bg-violet-500/10" },
  electrical: { icon: Zap, classes: "bg-amber-50 text-amber-600", border: "border-l-amber-500", chip: "border-amber-300 bg-amber-50 text-amber-700", wash: "bg-amber-50/70 dark:bg-amber-500/10" },
  lighting: { icon: Lightbulb, classes: "bg-yellow-50 text-yellow-600", border: "border-l-yellow-500", chip: "border-yellow-300 bg-yellow-50 text-yellow-700", wash: "bg-yellow-50/70 dark:bg-yellow-500/10" },
  oils: { icon: Droplets, classes: "bg-orange-50 text-orange-600", border: "border-l-orange-500", chip: "border-orange-300 bg-orange-50 text-orange-700", wash: "bg-orange-50/70 dark:bg-orange-500/10" },
  fluids: { icon: Fuel, classes: "bg-sky-50 text-sky-600", border: "border-l-sky-500", chip: "border-sky-300 bg-sky-50 text-sky-700", wash: "bg-sky-50/70 dark:bg-sky-500/10" },
  filters: { icon: Filter, classes: "bg-cyan-50 text-cyan-600", border: "border-l-cyan-500", chip: "border-cyan-300 bg-cyan-50 text-cyan-700", wash: "bg-cyan-50/70 dark:bg-cyan-500/10" },
  aircon: { icon: Wind, classes: "bg-teal-50 text-teal-600", border: "border-l-teal-500", chip: "border-teal-300 bg-teal-50 text-teal-700", wash: "bg-teal-50/70 dark:bg-teal-500/10" },
  audio: { icon: Volume2, classes: "bg-fuchsia-50 text-fuchsia-600", border: "border-l-fuchsia-500", chip: "border-fuchsia-300 bg-fuchsia-50 text-fuchsia-700", wash: "bg-fuchsia-50/70 dark:bg-fuchsia-500/10" },
  accessories: { icon: Sparkles, classes: "bg-rose-50 text-rose-600", border: "border-l-rose-500", chip: "border-rose-300 bg-rose-50 text-rose-700", wash: "bg-rose-50/70 dark:bg-rose-500/10" },
  carcare: { icon: Paintbrush, classes: "bg-emerald-50 text-emerald-600", border: "border-l-emerald-500", chip: "border-emerald-300 bg-emerald-50 text-emerald-700", wash: "bg-emerald-50/70 dark:bg-emerald-500/10" },
  safety: { icon: ShieldCheck, classes: "bg-stone-50 text-stone-600", border: "border-l-stone-500", chip: "border-stone-300 bg-stone-50 text-stone-700", wash: "bg-stone-50/70 dark:bg-stone-500/10" },
  service: { icon: Wrench, classes: "bg-red-50 text-red-600", border: "border-l-red-500", chip: "border-red-300 bg-red-50 text-red-700", wash: "bg-red-50/70 dark:bg-red-500/10" },
  general: { icon: Car, classes: "bg-gray-100 text-gray-600", border: "border-l-gray-400", chip: "border-gray-300 bg-gray-100 text-gray-700", wash: "bg-gray-100/70 dark:bg-gray-500/10" },
} satisfies Record<string, CategoryStyle>;

type Department = keyof typeof DEPARTMENTS;

/**
 * Keyword → department. Matched against the product name AND its category slug.
 *
 * Keying off the product name matters more than it looks: a shop's category list is
 * whatever the back office typed, and it is often coarse ("Parts") or, in a freshly seeded
 * database, still carries the previous business's departments. A tire is recognisable from
 * "Dunlop D404 150/80-16" no matter which bucket it was filed under, so the grid stays
 * legible either way.
 *
 * Order matters: the first hit wins, so put specific terms above generic ones.
 */
const KEYWORDS: [string[], Department][] = [
  // Service lines first: "PMS package - change oil" is labour, not a bottle of oil.
  [["pms", "change oil", "tune up", "alignment", "balancing", "labor", "labour", "service pack"], "service"],
  // Filters before oils, so "oil filter" lands under filters rather than lubricants.
  [["filter", "filter element"], "filters"],
  // "inner tube", never bare "interior" — that collides with car interiors.
  [["tire", "tyre", "tubeless", "inner tube", "vulcaniz"], "tires"],
  // "lug nut", never bare "lug" — it is a substring of "plug".
  [["mag wheel", "mags", "wheel", "rim", "hubcap", "lug nut"], "mags"],
  [["batter", "accumulator", "motolite", "amaron", "cca"], "batteries"],
  [["brake", "brake pad", "caliper", "rotor", "brake shoe"], "brakes"],
  [["shock", "strut", "suspension", "bushing", "coil spring", "stabilizer"], "suspension"],
  [["spark", "plug", "coil", "alternator", "starter", "solenoid", "fuse", "relay", "wiring"], "electrical"],
  [["bulb", "headlight", "tail light", "lamp", "led", "signal light"], "lighting"],
  [["coolant", "brake fluid", "radiator", "fuel", "gasoline", "diesel", "additive"], "fluids"],
  // Brands are spelled out in full ("shell advance", not "shell") so a common English
  // word can't drag an unrelated part into this department.
  [
    ["oil", "lubricant", "grease", "atf", "gear oil", "motul", "castrol", "shell advance", "shell helix", "mobil", "petron", "caltex"],
    "oils",
  ],
  [["aircon", "freon", "refrigerant", "blower", "condenser", "compressor"], "aircon"],
  [["speaker", "stereo", "head unit", "subwoofer", "amplifier", "tweeter"], "audio"],
  [["piston", "gasket", "bearing", "belt", "clutch", "engine", "valve", "timing", "cylinder", "camshaft"], "engine"],
  [["wax", "polish", "shampoo", "cleaner", "detail", "microfiber", "tint"], "carcare"],
  [["helmet", "glove", "vest", "extinguisher", "triangle", "first aid"], "safety"],
  [["mat", "seat cover", "holder", "charger", "camera", "dashcam", "horn", "accessor"], "accessories"],
];

/** Explicit slug map, for when the back office names departments cleanly. */
const SLUG_MAP: Record<string, Department> = {
  tires: "tires",
  tyres: "tires",
  "motorcycle-tires": "tires",
  mags: "mags",
  wheels: "mags",
  "mags-wheels": "mags",
  batteries: "batteries",
  battery: "batteries",
  brakes: "brakes",
  "brake-parts": "brakes",
  suspension: "suspension",
  electrical: "electrical",
  "electrical-parts": "electrical",
  lighting: "lighting",
  oils: "oils",
  lubricants: "oils",
  "oils-lubricants": "oils",
  fluids: "fluids",
  filters: "filters",
  aircon: "aircon",
  audio: "audio",
  "audio-accessories": "audio",
  parts: "engine",
  "spare-parts": "engine",
  "engine-parts": "engine",
  accessories: "accessories",
  "car-care": "carcare",
  "safety-gear": "safety",
  pms: "service",
  services: "service",
  "service-labor": "service",
  "general-supplies": "general",
};

/**
 * Resolves a department from the category slug first (the back office's own filing), then
 * from keywords in the slug and product name.
 */
function departmentFor(slug?: string | null, name?: string | null): Department {
  if (slug) {
    const direct = SLUG_MAP[slug];
    if (direct) return direct;
  }
  const haystack = `${slug ?? ""} ${name ?? ""}`.toLowerCase();
  if (haystack.trim()) {
    for (const [terms, dept] of KEYWORDS) {
      if (terms.some((t) => haystack.includes(t))) return dept;
    }
  }
  return "general";
}

function styleFor(slug?: string | null, name?: string | null): CategoryStyle {
  return DEPARTMENTS[departmentFor(slug, name)];
}

export function CategoryIcon({ slug, name, size = 15 }: { slug?: string | null; name?: string | null; size?: number }) {
  const { icon: Icon, classes } = styleFor(slug, name);
  return (
    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[0.25rem] ${classes}`}>
      <Icon size={size} />
    </span>
  );
}

/** Bare glyph for a category, for use where the boxed `CategoryIcon` is too heavy. */
export function CategoryGlyph({ slug, name, size = 14 }: { slug?: string | null; name?: string | null; size?: number }) {
  const { icon: Icon } = styleFor(slug, name);
  return <Icon size={size} />;
}

/** Left-edge border accent class for a product card, matching its department's icon colour. */
export function getCategoryBorder(slug?: string | null, name?: string | null): string {
  return styleFor(slug, name).border;
}

/** Selected-state classes for a category filter chip, matching its product cards' accent. */
export function getCategoryChip(slug?: string | null, name?: string | null): string {
  return styleFor(slug, name).chip;
}

/** Faint full-card background tint, matching a card's department accent. */
export function getCategoryWash(slug?: string | null, name?: string | null): string {
  return styleFor(slug, name).wash;
}

/** Exposed for the gauge-style department legend on the POS. */
export { DEPARTMENTS, type Department };
