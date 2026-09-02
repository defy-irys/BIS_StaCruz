import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Info, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/utils/cn";

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  className,
}: {
  title: string;
  description?: string;
  breadcrumbs?: { label: string; to?: string }[];
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("mb-4", className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="mb-1.5">
          <ol className="flex flex-wrap items-center gap-1 text-xs text-slate-500">
            {breadcrumbs.map((c, i) => (
              <li key={`${c.label}-${i}`} className="flex items-center gap-1">
                {c.to ? (
                  <Link to={c.to} className="rounded hover:text-brand-700 hover:underline">
                    {c.label}
                  </Link>
                ) : (
                  <span className="text-slate-700">{c.label}</span>
                )}
                {i < breadcrumbs.length - 1 && <ChevronRight className="h-3 w-3 text-slate-300" />}
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h1>
          {description && <p className="mt-0.5 max-w-3xl text-sm text-slate-500">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export function SectionHeader({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-2 border-b border-slate-200 pb-2", className)}>
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
        {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  trend,
  to,
  tone = "brand",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: React.ComponentType<{ className?: string }>;
  trend?: { direction: "up" | "down"; label: string };
  to?: string;
  tone?: "brand" | "amber" | "emerald" | "red" | "slate";
}) {
  const tones = {
    brand: "bg-brand-50 text-brand-700 border-brand-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    red: "bg-red-50 text-red-700 border-red-100",
    slate: "bg-slate-100 text-slate-700 border-slate-200",
  } as const;

  const body = (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-slate-900">{value}</p>
        <div className="mt-1 flex items-center gap-1.5">
          {trend && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 text-[11px] font-semibold",
                trend.direction === "up" ? "text-emerald-700" : "text-red-700",
              )}
            >
              {trend.direction === "up" ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {trend.label}
            </span>
          )}
          {hint && <span className="truncate text-[11px] text-slate-500">{hint}</span>}
        </div>
      </div>
      {Icon && (
        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-md border", tones[tone])}>
          <Icon className="h-4 w-4" />
        </span>
      )}
    </div>
  );

  const base =
    "block rounded-lg border border-slate-200 bg-white p-3.5 shadow-sm transition-colors";

  return to ? (
    <Link to={to} className={cn(base, "hover:border-brand-300 hover:bg-brand-50/30")}>
      {body}
    </Link>
  ) : (
    <div className={base}>{body}</div>
  );
}

export function DetailList({
  items,
  columns = 2,
  className,
}: {
  items: { label: string; value: ReactNode }[];
  columns?: 1 | 2 | 3;
  className?: string;
}) {
  return (
    <dl
      className={cn(
        "grid gap-x-6 gap-y-3",
        columns === 1 && "grid-cols-1",
        columns === 2 && "grid-cols-1 sm:grid-cols-2",
        columns === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {items.map((item, i) => (
        <div key={`${item.label}-${i}`} className="min-w-0">
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{item.label}</dt>
          <dd className="mt-0.5 break-words text-sm text-slate-800">{item.value || ""}</dd>
        </div>
      ))}
    </dl>
  );
}

export function PrototypeNotice({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <aside
      className={cn(
        "flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900",
        className,
      )}
      role="note"
    >
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden />
      <p className="text-[11px] leading-relaxed">
        <span className="font-semibold">Disclaimer:</span> This is not the final design. Everything shown
        may be subject to change.
        {!compact && (
          <>
            {" "}
            This is a functional prototype using simulated data for demonstration purposes  no live
            barangay records are connected.
          </>
        )}
      </p>
    </aside>
  );
}
