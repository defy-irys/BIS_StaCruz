import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ClipboardList,
  FileBadge,
  FileText,
  Home,
  Users,
} from "lucide-react";
import { catchupService, type CatchupIcon } from "@/services/catchupService";
import { BarangayLogo } from "@/components/brand/BarangayLogo";
import { useAsync } from "@/hooks/useAsync";
import { Modal } from "@/components/ui/overlay";
import { Button, Checkbox } from "@/components/ui/primitives";
import { SectionHeader } from "@/components/ui/page";
import { ErrorState, InlineLoading } from "@/components/ui/feedback";
import { useAuthStore } from "@/store/authStore";
import { BARANGAY } from "@/lib/navigation";
import { fmtRelative } from "@/lib/format";

const ICONS: Record<CatchupIcon, React.ComponentType<{ className?: string }>> = {
  residents: Users,
  households: Home,
  certificates: FileText,
  clearances: FileBadge,
  blotter: ClipboardList,
};

const DAY = 86400000;

const todayStr = () => new Date().toISOString().slice(0, 10);

/**
 * Daily catch-up briefing for Barangay / Admin users.
 */
export default function DailyCatchUp() {
  const user = useAuthStore((s) => s.user);
  const [sessionDismissed, setSessionDismissed] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(true);

  const KEY = user ? `bims-bips.catchup.${user.id}` : "";

  const shouldShowToday = useMemo(() => {
    if (!user || user.role === "resident") return false;
    if (sessionDismissed) return false;
    try {
      return localStorage.getItem(KEY) !== todayStr();
    } catch {
      return true;
    }
  }, [user, sessionDismissed, KEY]);

  const baseline = useMemo(() => {
    if (!user) return new Date(Date.now() - 7 * DAY).toISOString();
    const stored = localStorage.getItem(KEY);
    if (stored && stored !== todayStr()) {
      return new Date(`${stored}T00:00:00`).toISOString();
    }
    // First visit (or no stored date): default to a one-week briefing window.
    return new Date(Date.now() - 7 * DAY).toISOString();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const { data, loading, error, reload } = useAsync(
    () => (shouldShowToday ? catchupService.getDailySummary(baseline) : Promise.resolve(null)),
    [shouldShowToday, baseline],
  );

  if (!shouldShowToday) return null;

  const dismiss = () => {
    setSessionDismissed(true);
    if (dontShowAgain) {
      try {
        localStorage.setItem(KEY, todayStr());
      } catch {
        /* ignore storage failures in the prototype */
      }
    }
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  };

  const firstName = user?.fullName.split(" ")[0] ?? "there";

  return (
    <Modal
      open
      onClose={dismiss}
      title="Daily catch-up"
      description={`${BARANGAY.name} · ${BARANGAY.city}`}
      size="lg"
      footer={
        <Button onClick={dismiss} size="lg">
          Continue to dashboard
        </Button>
      }
    >
      {loading && <InlineLoading label="Preparing your briefing…" />}

      {error && !loading && (
        <ErrorState
          title="Unable to prepare your briefing"
          description={error}
          onRetry={reload}
        />
      )}

      {data && !loading && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <BarangayLogo size={48} className="drop-shadow-sm" />
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                {greeting()}, {firstName}.
              </h3>
              <p className="mt-0.5 text-sm text-slate-500">
                Here&rsquo;s a summary of what&rsquo;s happened in {BARANGAY.name} since your last visit.
              </p>
            </div>
          </div>

          {!data.hasActivity && (
            <p className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
              No new activity to report.
            </p>
          )}

          {data.activity.length > 0 && (
            <div>
              <SectionHeader title="Recent activity" description="Since your last visit" />
              <ul className="mt-2 grid gap-2.5 sm:grid-cols-2">
                {data.activity.map((a) => {
                  const Icon = ICONS[a.icon];
                  return (
                    <li
                      key={a.key}
                      className="flex items-center gap-3 rounded-md border border-slate-200 bg-white p-3"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-700">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-lg font-semibold tabular-nums leading-none text-slate-900">
                          {a.count}
                        </p>
                        <p className="mt-0.5 truncate text-sm font-medium text-slate-800">{a.label}</p>
                        <p className="truncate text-[11px] text-slate-500">{a.detail}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {data.attention.length > 0 && (
            <div>
              <SectionHeader title="Requires attention" description="Items that may need action today." />
              <ul className="mt-2 space-y-1.5">
                {data.attention.map((a) => (
                  <li
                    key={a.label}
                    className="flex items-start gap-2.5 rounded-md border border-amber-200 bg-amber-50 p-2.5"
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-amber-900">
                        <span className="tabular-nums">{a.count}</span> · {a.label}
                      </p>
                      <p className="text-[11px] text-amber-800">{a.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.recentActivity.length > 0 && (
            <div>
              <SectionHeader title="Latest system activity" />
              <ul className="mt-2 divide-y divide-slate-100 rounded-md border border-slate-200">
                {data.recentActivity.map((r) => (
                  <li key={r.id} className="flex items-start justify-between gap-2 px-3 py-2">
                    <p className="min-w-0 flex-1 text-xs text-slate-700">
                      <span className="font-medium text-slate-800">{r.actor}</span>{" "}
                      {r.action.toLowerCase()}  {r.description}
                    </p>
                    <span className="shrink-0 text-[11px] text-slate-400">{fmtRelative(r.at)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Checkbox
            id="dont-show-again-today"
            label="Don't show this again today"
            description="The daily summary will return again tomorrow."
            checked={dontShowAgain}
            onChange={() => setDontShowAgain((v) => !v)}
          />
        </div>
      )}
    </Modal>
  );
}
