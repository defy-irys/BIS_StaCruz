import type { ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CircleAlert,
  Info,
  Inbox,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { Badge, Button } from "./primitives";
import { useToastStore, type ToastLevel } from "@/store/toastStore";

/* Spinner / Loading*/

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-4 w-4 animate-spin text-brand-700", className)} aria-hidden />;
}

export function LoadingState({ label = "Loading records…", rows = 5 }: { label?: string; rows?: number }) {
  return (
    <div className="p-4" role="status" aria-live="polite">
      <div className="mb-3 flex items-center gap-2 text-sm text-slate-500">
        <Spinner />
        <span>{label}</span>
      </div>
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <div className="h-8 flex-1 animate-pulse rounded bg-slate-100" />
            <div className="hidden h-8 w-32 animate-pulse rounded bg-slate-100 sm:block" />
            <div className="hidden h-8 w-24 animate-pulse rounded bg-slate-100 md:block" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function InlineLoading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 p-8 text-sm text-slate-500" role="status">
      <Spinner />
      <span>{label}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Empty / Error                                                       */
/* ------------------------------------------------------------------ */

export function EmptyState({
  title,
  description,
  action,
  icon: Icon = Inbox,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-slate-50">
        <Icon className="h-5 w-5 text-slate-400" />
      </div>
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      {description && <p className="max-w-sm text-xs text-slate-500">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = "Unable to load records",
  description = "Something went wrong while contacting the service layer.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center" role="alert">
      <div className="flex h-11 w-11 items-center justify-center rounded-full border border-red-200 bg-red-50">
        <CircleAlert className="h-5 w-5 text-red-600" />
      </div>
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      <p className="max-w-md text-xs text-slate-500">{description}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-2" onClick={onRetry}>
          <RefreshCw className="h-3.5 w-3.5" />
          Try again
        </Button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Status badges (semantic + text, never colour alone)                 */
/* ------------------------------------------------------------------ */

type Tone = "neutral" | "brand" | "success" | "warning" | "danger" | "info" | "violet";

const STATUS_TONES: Record<string, Tone> = {
  // Records
  Active: "success",
  Inactive: "neutral",
  Deceased: "neutral",
  "Moved Out": "neutral",
  Archived: "neutral",
  Suspended: "danger",
  // Blotter
  Pending: "warning",
  "Under Investigation": "info",
  Resolved: "success",
  Closed: "neutral",
  // Documents
  Submitted: "info",
  "Under Review": "info",
  Approved: "brand",
  "Ready for Release": "violet",
  Released: "success",
  Rejected: "danger",
  // Voter
  Registered: "brand",
  "Not Registered": "neutral",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const tone = STATUS_TONES[status] ?? "neutral";
  return (
    <Badge tone={tone} className={className}>
      <span
        aria-hidden
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          tone === "success" && "bg-emerald-600",
          tone === "warning" && "bg-amber-500",
          tone === "danger" && "bg-red-600",
          tone === "info" && "bg-sky-600",
          tone === "brand" && "bg-brand-600",
          tone === "violet" && "bg-violet-600",
          tone === "neutral" && "bg-slate-400",
        )}
      />
      {status}
    </Badge>
  );
}

/* ------------------------------------------------------------------ */
/* Toaster                                                             */
/* ------------------------------------------------------------------ */

const TOAST_ICON: Record<ToastLevel, React.ComponentType<{ className?: string }>> = {
  success: CheckCircle2,
  error: CircleAlert,
  warning: AlertTriangle,
  info: Info,
};

const TOAST_STYLE: Record<ToastLevel, string> = {
  success: "border-l-emerald-600",
  error: "border-l-red-600",
  warning: "border-l-amber-500",
  info: "border-l-brand-600",
};

const TOAST_ICON_STYLE: Record<ToastLevel, string> = {
  success: "text-emerald-600",
  error: "text-red-600",
  warning: "text-amber-600",
  info: "text-brand-700",
};

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div
      className="no-print pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2"
      aria-live="polite"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((t) => {
        const Icon = TOAST_ICON[t.level];
        return (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex items-start gap-2.5 rounded-md border border-l-4 border-slate-200 bg-white p-3 shadow-md",
              TOAST_STYLE[t.level],
            )}
          >
            <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", TOAST_ICON_STYLE[t.level])} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">{t.title}</p>
              {t.description && <p className="mt-0.5 text-xs text-slate-600">{t.description}</p>}
            </div>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Dismiss notification"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
