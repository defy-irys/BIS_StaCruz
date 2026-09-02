import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Bell, CheckCheck, CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { notificationService } from "@/services/insightService";
import { useAsync } from "@/hooks/useAsync";
import { Button, Card } from "@/components/ui/primitives";
import { EmptyState, ErrorState, InlineLoading } from "@/components/ui/feedback";
import { fmtRelative } from "@/lib/format";
import { useAuthStore } from "@/store/authStore";
import { toast } from "@/store/toastStore";
import { cn } from "@/utils/cn";

const ICONS = {
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
} as const;

const TONES = {
  info: "text-brand-700",
  success: "text-emerald-600",
  warning: "text-amber-600",
} as const;

export default function PortalNotificationsPage() {
  const user = useAuthStore((s) => s.user);
  const residentId = user?.residentId ?? "";
  const [working, setWorking] = useState(false);

  const { data, loading, error, reload } = useAsync(
    () => notificationService.listForResident(residentId),
    [residentId],
  );

  const markAll = async () => {
    setWorking(true);
    try {
      await notificationService.markAllRead("resident", residentId);
      toast.success("All notifications marked as read");
      void reload();
    } finally {
      setWorking(false);
    }
  };

  if (loading) return <InlineLoading label="Loading notifications…" />;
  if (error || !data)
    return <ErrorState title="Unable to load notifications" description={error ?? undefined} onRetry={reload} />;

  const unread = data.filter((n) => !n.read).length;

  return (
    <div className="space-y-4">
      <Link to="/portal" className="inline-flex items-center gap-1 text-xs font-medium text-brand-700">
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to home
      </Link>

      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Notifications</h1>
          <p className="text-xs text-slate-500">
            {unread > 0 ? `${unread} unread update(s)` : "You are up to date."}
          </p>
        </div>
        {unread > 0 && (
          <Button size="sm" variant="secondary" onClick={markAll} loading={working}>
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all read
          </Button>
        )}
      </div>

      {data.length === 0 ? (
        <Card>
          <EmptyState
            icon={Bell}
            title="No notifications"
            description="Updates about your requests and barangay announcements will appear here."
          />
        </Card>
      ) : (
        <ul className="space-y-2">
          {data.map((n) => {
            const Icon = ICONS[n.level];
            return (
              <li
                key={n.id}
                className={cn(
                  "flex items-start gap-2.5 rounded-lg border bg-white p-3",
                  n.read ? "border-slate-200" : "border-brand-200 bg-brand-50/40",
                )}
              >
                <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", TONES[n.level])} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-800">{n.title}</p>
                    {!n.read && (
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-600" aria-label="Unread" />
                    )}
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{n.message}</p>
                  <p className="mt-1 text-[11px] text-slate-400">{fmtRelative(n.at)}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
