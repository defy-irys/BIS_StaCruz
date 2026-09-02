import { Link } from "react-router-dom";
import { ArrowLeft, Crown, Home } from "lucide-react";
import { residentService } from "@/services/residentService";
import { householdService } from "@/services/householdService";
import { useAsync } from "@/hooks/useAsync";
import { DetailList } from "@/components/ui/page";
import { Badge, Card, CardHeader } from "@/components/ui/primitives";
import { EmptyState, ErrorState, InlineLoading, StatusBadge } from "@/components/ui/feedback";
import { calcAge, fmtDate, formatAddress } from "@/lib/format";
import { useAuthStore } from "@/store/authStore";

export default function PortalHouseholdPage() {
  const user = useAuthStore((s) => s.user);
  const residentId = user?.residentId ?? "";

  const { data, loading, error, reload } = useAsync(async () => {
    const resident = await residentService.getResident(residentId);
    if (!resident.householdId) return { resident, household: null, members: [] };
    const [household, members] = await Promise.all([
      householdService.getHousehold(resident.householdId),
      householdService.listMembers(resident.householdId),
    ]);
    return { resident, household, members };
  }, [residentId]);

  if (loading) return <InlineLoading label="Loading household information…" />;
  if (error || !data)
    return <ErrorState title="Unable to load your household" description={error ?? undefined} onRetry={reload} />;

  const { resident, household, members } = data;

  return (
    <div className="space-y-4">
      <Link to="/portal/profile" className="inline-flex items-center gap-1 text-xs font-medium text-brand-700">
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to profile
      </Link>

      <div>
        <h1 className="text-lg font-semibold text-slate-900">My household</h1>
        <p className="text-xs text-slate-500">Household registry information held by the barangay.</p>
      </div>

      {!household ? (
        <Card>
          <EmptyState
            icon={Home}
            title="No household on record"
            description="Your resident profile is not yet linked to a registered household. Please visit the Barangay Hall to complete your household registration."
          />
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader title="Household information" icon={Home} />
            <div className="p-3">
              <DetailList
                columns={1}
                items={[
                  { label: "Household no.", value: <span className="font-mono">{household.householdNo}</span> },
                  { label: "Household head", value: household.headName },
                  { label: "Address", value: formatAddress(household.address) },
                  { label: "Purok", value: household.address.purok },
                  { label: "Household size", value: `${household.memberCount} member(s)` },
                  { label: "Tenure", value: household.householdType },
                  { label: "Date registered", value: fmtDate(household.dateRegistered) },
                  { label: "Status", value: <StatusBadge status={household.status} /> },
                ]}
              />
            </div>
          </Card>

          <Card>
            <CardHeader title="Household members" description={`${members.length} registered member(s).`} />
            <ul className="divide-y divide-slate-100">
              {members.map((m) => (
                <li key={m.id} className="flex items-center gap-3 px-3 py-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-600">
                    {m.firstName[0]}
                    {m.lastName[0]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {m.firstName} {m.lastName}
                      {m.id === resident.id && <span className="ml-1 text-[11px] text-brand-700">(you)</span>}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {calcAge(m.birthDate)} yrs · {m.sex} · {m.civilStatus}
                    </p>
                  </div>
                  {m.id === household.headResidentId ? (
                    <Badge tone="brand">
                      <Crown className="h-3 w-3" />
                      Head
                    </Badge>
                  ) : (
                    <Badge tone="neutral">{m.relationshipToHead || "Member"}</Badge>
                  )}
                </li>
              ))}
            </ul>
          </Card>

          <p className="rounded-md border border-slate-200 bg-white px-3 py-2 text-[11px] leading-relaxed text-slate-600">
            To add or remove a household member, please visit the Barangay Hall with the appropriate supporting
            documents. Household composition cannot be edited from the resident portal.
          </p>
        </>
      )}
    </div>
  );
}
