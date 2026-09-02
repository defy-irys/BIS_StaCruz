import { cn } from "@/utils/cn";

export interface ChartDatum {
  label: string;
  value: number;
}

const PALETTE = ["#245693", "#5b8cc7", "#8bb0db", "#b8cfea", "#132f52", "#366eb0"];

/** Simple, dependency-free horizontal bar chart. */
export function BarList({
  data,
  className,
  valueSuffix = "",
}: {
  data: ChartDatum[];
  className?: string;
  valueSuffix?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ul className={cn("space-y-2.5", className)}>
      {data.map((d, i) => (
        <li key={d.label}>
          <div className="flex items-baseline justify-between gap-2 text-xs">
            <span className="truncate font-medium text-slate-700">{d.label}</span>
            <span className="shrink-0 tabular-nums text-slate-600">
              {d.value.toLocaleString()}
              {valueSuffix}
            </span>
          </div>
          <div className="mt-1 h-2 w-full overflow-hidden rounded-sm bg-slate-100">
            <div
              className="h-full rounded-sm"
              style={{ width: `${(d.value / max) * 100}%`, backgroundColor: PALETTE[i % PALETTE.length] }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Vertical column chart with up to two series. */
export function ColumnChart({
  data,
  seriesLabels,
  height = 180,
}: {
  data: { label: string; values: number[] }[];
  seriesLabels: string[];
  height?: number;
}) {
  const max = Math.max(1, ...data.flatMap((d) => d.values));
  return (
    <div>
      <div className="flex items-end gap-3" style={{ height }} role="img" aria-label={seriesLabels.join(" and ")}>
        {data.map((d) => (
          <div key={d.label} className="flex h-full flex-1 flex-col justify-end">
            <div className="flex h-full items-end justify-center gap-1">
              {d.values.map((v, i) => (
                <div
                  key={i}
                  className="w-full max-w-6 rounded-t-sm"
                  style={{
                    height: `${(v / max) * 100}%`,
                    minHeight: v > 0 ? 3 : 0,
                    backgroundColor: PALETTE[i % PALETTE.length],
                  }}
                  title={`${seriesLabels[i]}: ${v}`}
                />
              ))}
            </div>
            <p className="mt-1.5 text-center text-[11px] text-slate-500">{d.label}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {seriesLabels.map((s, i) => (
          <span key={s} className="flex items-center gap-1.5 text-[11px] text-slate-600">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Donut chart - used sparingly for two-to-five category splits. */
export function DonutChart({ data, size = 148 }: { data: ChartDatum[]; size?: number }) {
  const total = data.reduce((a, d) => a + d.value, 0) || 1;
  const radius = size / 2 - 12;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Distribution chart">
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {data.map((d, i) => {
            const fraction = d.value / total;
            const dash = fraction * circumference;
            const el = (
              <circle
                key={d.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={PALETTE[i % PALETTE.length]}
                strokeWidth={18}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
              />
            );
            offset += dash;
            return el;
          })}
        </g>
        <text
          x="50%"
          y="48%"
          textAnchor="middle"
          className="fill-slate-900"
          style={{ fontSize: 18, fontWeight: 600 }}
        >
          {total.toLocaleString()}
        </text>
        <text x="50%" y="60%" textAnchor="middle" className="fill-slate-500" style={{ fontSize: 10 }}>
          total
        </text>
      </svg>
      <ul className="space-y-1.5">
        {data.map((d, i) => (
          <li key={d.label} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
            <span className="text-slate-700">{d.label}</span>
            <span className="tabular-nums text-slate-500">
              {d.value.toLocaleString()} ({Math.round((d.value / total) * 100)}%)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
