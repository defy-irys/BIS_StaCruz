import { Link, useNavigate } from "react-router-dom";
import {
  Activity,
  ClipboardList,
  FileBadge,
  FileText,
  Home,
  Plus,
  ServerCog,
  Users,
  Vote,
} from "lucide-react";
import { dashboardService } from "@/services/insightService";
import { useAsync } from "@/hooks/useAsync";
import { PageHeader, PrototypeNotice, StatCard } from "@/components/ui/page";
import { Card, CardHeader, Button, Badge } from "@/components/ui/primitives";
import { ErrorState, LoadingState, StatusBadge } from "@/components/ui/feedback";
import { calcAge, fmtDate, fmtNumber, fmtRelative } from "@/lib/format";
import { useAuthStore, hasPermission } from "@/store/authStore";
import { cn } from "@/utils/cn";

export default function DashboardPage() {
  const { data, loading, error, reload } = useAsync(() => dashboardService.getDashboard(), []);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const quickActions = [
    { label: "Add Resident", to: "/admin/residents/new", icon: Users, permission: "residents.create" as const },
    { label: "Add Household", to: "/admin/households?new=1", icon: Home, permission: "households.manage" as const },
    { label: "Issue Certificate", to: "/admin/certificates?new=1", icon: FileText, permission: "certificates.process" as const },
    { label: "Process Clearance", to: "/admin/clearances?status=Pending", icon: FileBadge, permission: "clearances.process" as const },
    { label: "Register Incident", to: "/admin/blotter?new=1", icon: ClipboardList, permission: "blotter.manage" as const },
  ].filter((a) => hasPermission(user, a.permission));

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Good day, ${user?.fullName.split(" ")[0] ?? "colleague"}`}
        description="Operational overview of Barangay Sta. Cruz records and pending transactions."
        breadcrumbs={[{ label: "BIMS-BIPS" }, { label: "Dashboard" }]}
        actions={
          quickActions.length > 0 ? (
            <Button onClick={() => navigate(quickActions[0].to)}>
              <Plus className="h-4 w-4" />
              {quickActions[0].label}
            </Button>
          ) : undefined
        }
      />

      <PrototypeNotice />

      {loading && (
        <Card>
          <LoadingState label="Loading dashboard metrics…" rows={4} />
        </Card>
      )}

      {error && !loading && (
        <Card>
          <ErrorState title="Unable to load the dashboard" description={error} onRetry={reload} />
        </Card>
      )}

      {data && !loading && (
        <>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
            <StatCard
              label="Total residents"
              value={fmtNumber(data.metrics.totalResidents)}
              hint={`${fmtNumber(data.metrics.activeResidents)} active`}
              icon={Users}
              to="/admin/residents"
            />
            <StatCard
              label="Households"
              value={fmtNumber(data.metrics.totalHouseholds)}
              hint="Registered in the barangay"
              icon={Home}
              to="/admin/households"
            />
            <StatCard
              label="Pending clearances"
              value={fmtNumber(data.metrics.pendingClearances)}
              hint="Awaiting review"
              icon={FileBadge}
              tone="amber"
              to="/admin/clearances?status=Pending"
            />
            <StatCard
              label="Open incidents"
              value={fmtNumber(data.metrics.openBlotter)}
              hint="Pending / under investigation"
              icon={ClipboardList}
              tone="red"
              to="/admin/blotter"
            />
            <StatCard
              label="Certificates this month"
              value={fmtNumber(data.metrics.certificatesThisMonth)}
              hint="Requests filed"
              icon={FileText}
              tone="emerald"
              to="/admin/certificates"
            />
          </div>

          {quickActions.length > 0 && (
            <Card>
              <CardHeader title="Quick actions" description="Frequently used front-desk operations." />
              <div className="flex flex-wrap gap-2 p-3">
                {quickActions.map((a) => (
                  <Link key={a.label} to={a.to}>
                    <Button variant="secondary" size="sm">
                      <a.icon className="h-3.5 w-3.5" />
                      {a.label}
                    </Button>
                  </Link>
                ))}
              </div>
            </Card>
          )}

          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader
                title="Pending clearance requests"
                description="Requests waiting for barangay action."
                icon={FileBadge}
                action={
                  <Link to="/admin/clearances" className="text-xs font-medium text-brand-700 hover:underline">
                    View all
                  </Link>
                }
              />
              {data.pendingClearances.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-slate-500">
                  No pending clearance requests.
                </p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {data.pendingClearances.map((c) => (
                    <li key={c.id}>
                      <Link
                        to={`/admin/clearances?search=${encodeURIComponent(c.referenceNo)}`}
                        className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-slate-50"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-800">{c.residentName}</p>
                          <p className="truncate text-xs text-slate-500">
                            {c.clearanceType} · {c.purpose}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className="hidden font-mono text-[11px] text-slate-400 sm:inline">
                            {c.referenceNo}
                          </span>
                          <Badge tone={c.channel === "Resident Portal" ? "info" : "neutral"}>
                            {c.channel}
                          </Badge>
                          <StatusBadge status={c.status} />
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <CardHeader title="System status" description="Prototype service health." icon={ServerCog} />
              <ul className="divide-y divide-slate-100">
                {data.systemStatus.map((s) => (
                  <li key={s.component} className="flex items-start justify-between gap-3 px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">{s.component}</p>
                      <p className="text-xs text-slate-500">{s.detail}</p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                        s.state === "operational"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : s.state === "simulated"
                            ? "border-amber-200 bg-amber-50 text-amber-800"
                            : "border-red-200 bg-red-50 text-red-800",
                      )}
                    >
                      {s.state}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <Card>
              <CardHeader
                title="Recently registered residents"
                icon={Users}
                action={
                  <Link to="/admin/residents" className="text-xs font-medium text-brand-700 hover:underline">
                    Open module
                  </Link>
                }
              />
              <ul className="divide-y divide-slate-100">
                {data.recentResidents.map((r) => (
                  <li key={r.id}>
                    <Link
                      to={`/admin/residents/${r.id}`}
                      className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">
                          {r.lastName}, {r.firstName}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {r.residentNo} · {calcAge(r.birthDate)} yrs · {r.address.purok}
                        </p>
                      </div>
                      <StatusBadge status={r.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>

            <Card>
              <CardHeader
                title="Recent blotter incidents"
                icon={ClipboardList}
                action={
                  <Link to="/admin/blotter" className="text-xs font-medium text-brand-700 hover:underline">
                    Open module
                  </Link>
                }
              />
              <ul className="divide-y divide-slate-100">
                {data.recentBlotter.map((b) => (
                  <li key={b.id}>
                    <Link
                      to={`/admin/blotter/${b.id}`}
                      className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">{b.incidentType}</p>
                        <p className="truncate font-mono text-[11px] text-slate-500">
                          {b.caseNo} · {fmtDate(b.incidentDate)}
                        </p>
                      </div>
                      <StatusBadge status={b.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>

            <Card>
              <CardHeader
                title="Recent certificate requests"
                icon={FileText}
                action={
                  <Link to="/admin/certificates" className="text-xs font-medium text-brand-700 hover:underline">
                    Open module
                  </Link>
                }
              />
              <ul className="divide-y divide-slate-100">
                {data.recentCertificates.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">{c.certificateType}</p>
                      <p className="truncate text-xs text-slate-500">
                        {c.residentName} · {fmtDate(c.requestedAt)}
                      </p>
                    </div>
                    <StatusBadge status={c.status} />
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader title="Recent activity" description="Audit trail of staff actions." icon={Activity} />
              <ul className="divide-y divide-slate-100">
                {data.activity.map((a) => (
                  <li key={a.id} className="flex items-start justify-between gap-3 px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm text-slate-800">
                        <span className="font-medium">{a.actor}</span>{" "}
                        <span className="text-slate-500">{a.action.toLowerCase()}</span>  {a.description}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-400">{a.module}</p>
                    </div>
                    <span className="shrink-0 text-[11px] text-slate-400">{fmtRelative(a.at)}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card>
              <CardHeader title="Population indicators" icon={Vote} />
              <div className="space-y-3 p-4">
                {[
                  { label: "Registered voters", value: data.metrics.registeredVoters, total: data.metrics.totalResidents },
                  { label: "Senior citizens (60+)", value: data.metrics.seniorCitizens, total: data.metrics.totalResidents },
                  { label: "Active records", value: data.metrics.activeResidents, total: data.metrics.totalResidents },
                ].map((m) => {
                  const pct = Math.round((m.value / Math.max(1, m.total)) * 100);
                  return (
                    <div key={m.label}>
                      <div className="flex items-baseline justify-between text-xs">
                        <span className="font-medium text-slate-700">{m.label}</span>
                        <span className="tabular-nums text-slate-500">
                          {fmtNumber(m.value)} · {pct}%
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-brand-600" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
