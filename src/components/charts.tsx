"use client";

import { ReactNode, useMemo, useRef, useState, useLayoutEffect } from "react";
import { cx } from "@/lib/utils";

/* Shared chart chrome */
const GRID = "#e1e0d9";
const AXIS = "#c3c2b7";
const MUTED = "#898781";
export const SERIES_1 = "#2a78d6";
export const SERIES_2 = "#1baf7a";

function useContainerWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => setWidth(entries[0].contentRect.width));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  return { ref, width };
}

/** Clean tick values: 0 to a rounded max in 4 steps */
function niceTicks(max: number): number[] {
  if (max <= 0) return [0, 1, 2, 3, 4];
  const raw = max / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
  return [0, step, step * 2, step * 3, step * 4];
}

function compact(n: number): string {
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`;
  return `${Math.round(n * 100) / 100}`;
}

interface Tooltip {
  x: number;
  y: number;
  content: ReactNode;
}

function TooltipBox({ tip, width }: { tip: Tooltip; width: number }) {
  const flip = tip.x > width - 130;
  return (
    <div
      className="pointer-events-none absolute z-10 rounded-lg border border-black/10 bg-card px-2.5 py-1.5 text-xs shadow-md"
      style={{ left: tip.x + (flip ? -8 : 8), top: tip.y, transform: `translate(${flip ? "-100%" : "0"}, -50%)` }}
    >
      {tip.content}
    </div>
  );
}

/* ---------- Line / area chart with crosshair + tooltip ---------- */

export interface LinePoint {
  label: string;
  value: number;
  sub?: string;
}

export function LineChart({
  data,
  height = 220,
  color = SERIES_1,
  valueFormat = compact,
  tooltipFormat,
}: {
  data: LinePoint[];
  height?: number;
  color?: string;
  valueFormat?: (v: number) => string;
  tooltipFormat?: (p: LinePoint) => ReactNode;
}) {
  const { ref, width } = useContainerWidth();
  const [hover, setHover] = useState<number | null>(null);
  const pad = { top: 12, right: 16, bottom: 24, left: 44 };

  const { ticks, points, path, areaPath } = useMemo(() => {
    const max = Math.max(...data.map((d) => d.value), 0);
    const ticks = niceTicks(max);
    const yMax = ticks[ticks.length - 1] || 1;
    const iw = Math.max(width - pad.left - pad.right, 1);
    const ih = height - pad.top - pad.bottom;
    const points = data.map((d, i) => ({
      ...d,
      x: pad.left + (data.length > 1 ? (i / (data.length - 1)) * iw : iw / 2),
      y: pad.top + ih - (d.value / yMax) * ih,
    }));
    const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    const baseline = pad.top + ih;
    const areaPath = points.length
      ? `${path} L${points[points.length - 1].x.toFixed(1)},${baseline} L${points[0].x.toFixed(1)},${baseline} Z`
      : "";
    return { ticks, points, path, areaPath };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, width, height]);

  const ih = height - pad.top - pad.bottom;
  const hovered = hover !== null ? points[hover] : null;

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    let best = 0;
    let bestDist = Infinity;
    points.forEach((p, i) => {
      const d = Math.abs(p.x - mx);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    setHover(best);
  };

  // Label every ~6th x label to avoid collisions
  const labelEvery = Math.max(1, Math.ceil(data.length / 7));

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
          {ticks.map((t, i) => {
            const y = pad.top + ih - (t / (ticks[ticks.length - 1] || 1)) * ih;
            return (
              <g key={i}>
                <line x1={pad.left} x2={width - pad.right} y1={y} y2={y} stroke={i === 0 ? AXIS : GRID} strokeWidth={1} />
                <text x={pad.left - 8} y={y + 3.5} textAnchor="end" fontSize={10} fill={MUTED} className="tabular">
                  {compact(t)}
                </text>
              </g>
            );
          })}
          {points.map((p, i) =>
            i % labelEvery === 0 ? (
              <text key={i} x={p.x} y={height - 7} textAnchor="middle" fontSize={10} fill={MUTED}>
                {p.label}
              </text>
            ) : null
          )}
          {areaPath && <path d={areaPath} fill={color} opacity={0.1} />}
          {path && <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}
          {hovered && (
            <line x1={hovered.x} x2={hovered.x} y1={pad.top} y2={pad.top + ih} stroke={AXIS} strokeWidth={1} />
          )}
          {points.length > 0 && !hovered && (
            <circle
              cx={points[points.length - 1].x}
              cy={points[points.length - 1].y}
              r={4}
              fill={color}
              stroke="#fcfcfb"
              strokeWidth={2}
            />
          )}
          {hovered && <circle cx={hovered.x} cy={hovered.y} r={4.5} fill={color} stroke="#fcfcfb" strokeWidth={2} />}
        </svg>
      )}
      {hovered && (
        <TooltipBox
          width={width}
          tip={{
            x: hovered.x,
            y: hovered.y,
            content: tooltipFormat ? (
              tooltipFormat(hovered)
            ) : (
              <div>
                <div className="font-medium">{valueFormat(hovered.value)}</div>
                <div className="text-ink-muted">{hovered.label}</div>
              </div>
            ),
          }}
        />
      )}
    </div>
  );
}

/* ---------- Column chart with per-bar hover ---------- */

export interface ColumnPoint {
  label: string;
  value: number;
  sub?: string;
}

export function ColumnChart({
  data,
  height = 200,
  color = SERIES_1,
  valueFormat = compact,
}: {
  data: ColumnPoint[];
  height?: number;
  color?: string;
  valueFormat?: (v: number) => string;
}) {
  const { ref, width } = useContainerWidth();
  const [hover, setHover] = useState<number | null>(null);
  const pad = { top: 12, right: 8, bottom: 24, left: 44 };
  const ticks = niceTicks(Math.max(...data.map((d) => d.value), 0));
  const yMax = ticks[ticks.length - 1] || 1;
  const iw = Math.max(width - pad.left - pad.right, 1);
  const ih = height - pad.top - pad.bottom;
  const band = data.length > 0 ? iw / data.length : iw;
  const barW = Math.min(band * 0.62, 24);
  const labelEvery = Math.max(1, Math.ceil(data.length / 8));

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} onMouseLeave={() => setHover(null)}>
          {ticks.map((t, i) => {
            const y = pad.top + ih - (t / yMax) * ih;
            return (
              <g key={i}>
                <line x1={pad.left} x2={width - pad.right} y1={y} y2={y} stroke={i === 0 ? AXIS : GRID} strokeWidth={1} />
                <text x={pad.left - 8} y={y + 3.5} textAnchor="end" fontSize={10} fill={MUTED} className="tabular">
                  {compact(t)}
                </text>
              </g>
            );
          })}
          {data.map((d, i) => {
            const cx0 = pad.left + band * i + band / 2;
            const h = Math.max((d.value / yMax) * ih, d.value > 0 ? 2 : 0);
            const y = pad.top + ih - h;
            const r = Math.min(4, h);
            return (
              <g key={i}>
                {/* hit target spans the full band */}
                <rect
                  x={pad.left + band * i}
                  y={pad.top}
                  width={band}
                  height={ih}
                  fill="transparent"
                  onMouseEnter={() => setHover(i)}
                />
                {h > 0 && (
                  <path
                    d={`M${cx0 - barW / 2},${pad.top + ih} L${cx0 - barW / 2},${y + r} Q${cx0 - barW / 2},${y} ${
                      cx0 - barW / 2 + r
                    },${y} L${cx0 + barW / 2 - r},${y} Q${cx0 + barW / 2},${y} ${cx0 + barW / 2},${y + r} L${
                      cx0 + barW / 2
                    },${pad.top + ih} Z`}
                    fill={color}
                    opacity={hover === null || hover === i ? 1 : 0.45}
                    style={{ pointerEvents: "none", transition: "opacity 120ms" }}
                  />
                )}
                {i % labelEvery === 0 && (
                  <text x={cx0} y={height - 7} textAnchor="middle" fontSize={10} fill={MUTED}>
                    {d.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}
      {hover !== null && data[hover] && (
        <TooltipBox
          width={width}
          tip={{
            x: pad.left + band * hover + band / 2,
            y: pad.top + 20,
            content: (
              <div>
                <div className="font-medium">{valueFormat(data[hover].value)}</div>
                <div className="text-ink-muted">
                  {data[hover].label}
                  {data[hover].sub ? ` · ${data[hover].sub}` : ""}
                </div>
              </div>
            ),
          }}
        />
      )}
    </div>
  );
}

/* ---------- Horizontal breakdown list (label · track · value) ---------- */

export interface MeterRow {
  label: string;
  value: number;
  display: string;
  sub?: string;
  emoji?: string;
}

export function MeterList({ rows, color = SERIES_1 }: { rows: MeterRow[]; color?: string }) {
  const max = Math.max(...rows.map((r) => r.value), 0) || 1;
  return (
    <div className="flex flex-col gap-3">
      {rows.map((r, i) => (
        <div key={i}>
          <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
            <span className="truncate text-ink">
              {r.emoji && <span className="mr-1.5">{r.emoji}</span>}
              {r.label}
              {r.sub && <span className="ml-2 text-xs text-ink-muted">{r.sub}</span>}
            </span>
            <span className="tabular shrink-0 font-medium">{r.display}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-black/[0.06]">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.max((r.value / max) * 100, r.value > 0 ? 2 : 0)}%`, background: color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Sparkline ---------- */

export function Sparkline({ values, color = SERIES_1, width = 72, height = 24 }: { values: number[]; color?: string; width?: number; height?: number }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const pts = values.map((v, i) => ({
    x: (i / (values.length - 1)) * (width - 6) + 3,
    y: height - 3 - ((v - min) / range) * (height - 6),
  }));
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  return (
    <svg width={width} height={height} aria-hidden>
      <path d={d} fill="none" stroke="#c3c2b7" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last.x} cy={last.y} r={2.5} fill={color} />
    </svg>
  );
}

/* ---------- Stat tile ---------- */

export function StatTile({
  label,
  value,
  delta,
  deltaLabel,
  upIsGood = true,
  spark,
  icon,
}: {
  label: string;
  value: string;
  delta?: number;
  deltaLabel?: string;
  upIsGood?: boolean;
  spark?: number[];
  icon?: ReactNode;
}) {
  const hasDelta = delta !== undefined && isFinite(delta);
  const up = (delta ?? 0) >= 0;
  const good = upIsGood ? up : !up;
  return (
    <div className="card flex flex-col gap-1 px-4 py-3.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-ink-secondary">{label}</span>
        {icon && <span className="text-ink-muted">{icon}</span>}
      </div>
      <div className="flex items-end justify-between gap-2">
        <span className="text-2xl font-semibold tracking-tight">{value}</span>
        {spark && <Sparkline values={spark} />}
      </div>
      {hasDelta && (
        <span className={cx("text-xs font-medium", good ? "text-[#006300]" : "text-[#c02121]")}>
          {up ? "▲" : "▼"} {Math.abs(delta!).toFixed(1)}%{deltaLabel && <span className="ml-1 font-normal text-ink-muted">{deltaLabel}</span>}
        </span>
      )}
    </div>
  );
}
