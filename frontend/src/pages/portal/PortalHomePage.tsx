import { Link } from "react-router-dom";
import {
  Bell,
  CheckCircle2,
  ChevronRight,
  FileBadge,
  FileText,
  Home,
  Megaphone,
  UserCircle2,
} from "lucide-react";
import { residentService } from "@/services/residentService";
import { certificateService, clearanceService } from "@/services/documentService";
import { announcementService, notificationService } from "@/services/insightService";
import { useAsync } from "@/hooks/useAsync";
import { Badge, Button, Card } from "@/components/ui/primitives";
import { ErrorState, InlineLoading, StatusBadge } from "@/components/ui/feedback";
import { fmtDate, fmtRelative } from "@/lib/format";
import { useAuthStore } from "@/store/authStore";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function PortalHomePage() {
  const user = useAuthStore((s) => s.user);
  const residentId = user?.residentId ?? "";

  const { data, loading, error, reload } = useAsync(async () => {
    const [resident, certificates, clearances, announcements, notifications] = await Promise.all([
      residentService.getResident(residentId),
      certificateService.listCertificates({ residentId, pageSize: 20 }),
      clearanceService.listClearances({ residentId, pageSize: 20 }),
      announcementService.list(),
      notificationService.listForResident(residentId),
    ]);
    return {
      resident,
      certificates: certificates.items,
      clearances: clearances.items,
      announcements,
      unread: notifications.filter((n) => !n.read).length,
    };
  }, [residentId]);

  if (loading) return <InlineLoading label="Loading your barangay profile…" />;
  if (error || !data)
    return (
      <ErrorState
        title="Unable to load your information"
        description={error ?? "Please try again in a moment."}
        onRetry={reload}
      />
    );

  const { resident, certificates, clearances, announcements, unread } = data;
  const activity = [
    ...certificates.map((c) => ({
      id: c.id,
      title: c.certificateType,
      ref: c.referenceNo,
      status: c.status,
      at: c.requestedAt,
    })),
    ...clearances.map((c) => ({
      id: c.id,
      title: c.clearanceType,
      ref: c.referenceNo,
      status: c.status,
      at: c.requestedAt,
    })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 4);

  const pending = activity.filter((a) => !["Released", "Rejected"].includes(a.status)).length;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-slate-500">{greeting()},</p>
        <h1 className="text-xl font-semibold text-slate-900">
          {resident.firstName} {resident.lastName}
        </h1>
      </div>

      <Card className="border-brand-200 bg-brand-50/60">
        <div className="flex items-start gap-3 p-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-700 text-white">
            <UserCircle2 className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="text-sm font-semibold text-slate-900">Profile verified</p>
              <StatusBadge status={resident.status} />
            </div>
            <p className="mt-0.5 text-xs text-slate-600">
              {resident.residentNo} · {resident.address.purok}, Brgy. {resident.address.barangay}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <Badge tone={resident.voterStatus === "Registered" ? "brand" : "neutral"}>
                {resident.voterStatus}
              </Badge>
              <Badge tone="neutral">{resident.civilStatus}</Badge>
            </div>
          </div>
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
        </div>
      </Card>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Quick actions</h2>
        <div className="grid grid-cols-3 gap-2">
          <Link
            to="/portal/requests/new?type=certificate"
            className="flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white p-2 text-center hover:border-brand-300 hover:bg-brand-50/40"
          >
            <FileText className="h-5 w-5 text-brand-700" />
            <span className="text-[11px] font-medium leading-tight text-slate-700">Request certificate</span>
          </Link>
          <Link
            to="/portal/requests/new?type=clearance"
            className="flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white p-2 text-center hover:border-brand-300 hover:bg-brand-50/40"
          >
            <FileBadge className="h-5 w-5 text-brand-700" />
            <span className="text-[11px] font-medium leading-tight text-slate-700">Request clearance</span>
          </Link>
          <Link
            to="/portal/household"
            className="flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white p-2 text-center hover:border-brand-300 hover:bg-brand-50/40"
          >
            <Home className="h-5 w-5 text-brand-700" />
            <span className="text-[11px] font-medium leading-tight text-slate-700">My household</span>
          </Link>
        </div>
      </section>

      {(pending > 0 || unread > 0) && (
        <Link
          to={pending > 0 ? "/portal/requests" : "/portal/notifications"}
          className="flex items-center gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3"
        >
          <Bell className="h-4 w-4 shrink-0 text-amber-600" />
          <p className="min-w-0 flex-1 text-xs text-amber-900">
            {pending > 0
              ? `You have ${pending} request(s) currently being processed.`
              : `You have ${unread} unread notification(s).`}
          </p>
          <ChevronRight className="h-4 w-4 shrink-0 text-amber-600" />
        </Link>
      )}

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recent activity</h2>
          <Link to="/portal/requests" className="text-xs font-medium text-brand-700">
            View all
          </Link>
        </div>
        {activity.length === 0 ? (
          <Card>
            <div className="p-6 text-center">
              <p className="text-sm text-slate-600">You have not filed any requests yet.</p>
              <Link to="/portal/requests/new" className="mt-3 inline-block">
                <Button size="sm">File a request</Button>
              </Link>
            </div>
          </Card>
        ) : (
          <ul className="space-y-2">
            {activity.map((a) => (
              <li key={a.id}>
                <Link
                  to="/portal/requests"
                  className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{a.title}</p>
                    <p className="truncate font-mono text-[11px] text-slate-500">
                      {a.ref} · {fmtDate(a.at)}
                    </p>
                  </div>
                  <StatusBadge status={a.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <Megaphone className="h-3.5 w-3.5" />
          Barangay announcements
        </h2>
        <ul className="space-y-2">
          {announcements.map((a) => (
            <li key={a.id} className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-slate-800">{a.title}</p>
                <Badge tone="info">{a.category}</Badge>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{a.body}</p>
              <p className="mt-1.5 text-[11px] text-slate-400">
                {a.postedBy} · {fmtRelative(a.postedAt)}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-900">
        <span className="font-semibold">Disclaimer:</span> This is not the final design. Everything shown may be
        subject to change. Functional prototype using simulated data.
      </p>
    </div>
  );
}
