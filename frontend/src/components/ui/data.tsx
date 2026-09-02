import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type TdHTMLAttributes,
  type ThHTMLAttributes,
} from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronsUpDown, MoreHorizontal } from "lucide-react";
import { cn } from "@/utils/cn";
import { Button } from "./primitives";

/* Table*/

export function TableWrap({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("scrollbar-thin w-full overflow-x-auto", className)}>
      <table className="w-full min-w-[720px] border-collapse text-sm">{children}</table>
    </div>
  );
}

export function Th({
  children,
  className,
  sortKey,
  activeKey,
  dir,
  onSort,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement> & {
  sortKey?: string;
  activeKey?: string;
  dir?: "asc" | "desc";
  onSort?: (key: string) => void;
}) {
  const sortable = Boolean(sortKey && onSort);
  const active = sortable && activeKey === sortKey;
  return (
    <th
      scope="col"
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : undefined}
      className={cn(
        "border-b border-slate-200 bg-slate-50 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-600",
        className,
      )}
      {...props}
    >
      {sortable ? (
        <button
          type="button"
          onClick={() => onSort!(sortKey!)}
          className="inline-flex items-center gap-1 rounded text-[11px] font-semibold uppercase tracking-wide text-slate-600 hover:text-slate-900"
        >
          {children}
          {active ? (
            <ChevronDown className={cn("h-3 w-3 transition-transform", dir === "asc" && "rotate-180")} />
          ) : (
            <ChevronsUpDown className="h-3 w-3 text-slate-400" />
          )}
        </button>
      ) : (
        children
      )}
    </th>
  );
}

export function Td({ children, className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn("border-b border-slate-100 px-3 py-2 align-middle text-slate-700", className)} {...props}>
      {children}
    </td>
  );
}

export function Tr({
  children,
  className,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <tr
      className={cn("hover:bg-slate-50/80", onClick && "cursor-pointer", className)}
      onClick={onClick}
    >
      {children}
    </tr>
  );
}

/* ------------------------------------------------------------------ */
/* Pagination                                                          */
/* ------------------------------------------------------------------ */

export function Pagination({
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const pages: (number | "…")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) pages.push(i);
    else if (pages[pages.length - 1] !== "…") pages.push("…");
  }

  return (
    <nav
      className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-2.5"
      aria-label="Pagination"
    >
      <p className="text-xs text-slate-600">
        Showing <span className="font-semibold text-slate-800">{from}</span>–
        <span className="font-semibold text-slate-800">{to}</span> of{" "}
        <span className="font-semibold text-slate-800">{total.toLocaleString()}</span> records
      </p>
      <div className="flex items-center gap-3">
        {onPageSizeChange && (
          <label className="flex items-center gap-1.5 text-xs text-slate-600">
            Rows
            <select
              className="h-7 rounded border border-slate-300 bg-white px-1.5 text-xs focus:border-brand-600 focus:outline-none"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
            >
              {[10, 15, 25, 50].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="flex items-center gap-1">
          <Button
            variant="secondary"
            size="sm"
            className="h-7 w-7 p-0"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          {pages.map((p, i) =>
            p === "…" ? (
              <span key={`gap-${i}`} className="px-1 text-xs text-slate-400">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                aria-current={p === page ? "page" : undefined}
                className={cn(
                  "h-7 min-w-7 rounded border px-2 text-xs font-medium",
                  p === page
                    ? "border-brand-700 bg-brand-700 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
                )}
              >
                {p}
              </button>
            ),
          )}
          <Button
            variant="secondary"
            size="sm"
            className="h-7 w-7 p-0"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            aria-label="Next page"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* Tabs                                                                */
/* ------------------------------------------------------------------ */

export function Tabs({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: { key: string; label: string; count?: number }[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("scrollbar-thin overflow-x-auto border-b border-slate-200", className)} role="tablist">
      <div className="flex min-w-max gap-1">
        {tabs.map((t) => {
          const isActive = t.key === active;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(t.key)}
              className={cn(
                "-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "border-brand-700 text-brand-800"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800",
              )}
            >
              {t.label}
              {typeof t.count === "number" && (
                <span
                  className={cn(
                    "ml-1.5 rounded px-1.5 py-0.5 text-[11px] font-semibold",
                    isActive ? "bg-brand-50 text-brand-800" : "bg-slate-100 text-slate-600",
                  )}
                >
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Dropdown (row action menu)                                          */
/* ------------------------------------------------------------------ */

export interface DropdownAction {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
}

export function ActionMenu({ actions, label = "Row actions" }: { actions: DropdownAction[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const enabled = actions.filter((a) => !a.disabled);
  if (enabled.length === 0) return null;

  return (
    <div className="relative inline-block text-left" ref={ref}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="inline-flex h-7 w-7 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1 w-52 overflow-hidden rounded-md border border-slate-200 bg-white py-1 shadow-lg"
        >
          {enabled.map((a) => (
            <button
              key={a.label}
              type="button"
              role="menuitem"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                a.onSelect();
              }}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-slate-50",
                a.danger ? "text-red-700 hover:bg-red-50" : "text-slate-700",
              )}
            >
              {a.icon && <a.icon className="h-3.5 w-3.5" />}
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
