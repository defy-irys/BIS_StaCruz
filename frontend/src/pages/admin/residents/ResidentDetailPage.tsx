import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, FileBadge, FileText, Home, Pencil, RotateCcw, UserMinus } from "lucide-react";
import { residentService } from "@/services/residentService";
import { householdService } from "@/services/householdService";
import { certificateService, clearanceService } from "@/services/documentService";
import { useAsync } from "@/hooks/useAsync";
import { PageHeader, DetailList } from "@/components/ui/page";
import { Badge, Button, Card, CardHeader, Field, Textarea } from "@/components/ui/primitives";
import { Tabs } from "@/components/ui/data";
import { ErrorState, InlineLoading, StatusBadge } from "@/components/ui/feedback";
import { ConfirmDialog } from "@/components/ui/overlay";
import { calcAge, fmtDate, fmtDateTime, fmtPeso, formatAddress } from "@/lib/format";
import { hasPermission, useAuthStore } from "@/store/authStore";
import { toast } from "@/store/toastStore";

export default function ResidentDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState("profile");
  const [confirm, setConfirm] = useState(false);
  const [reason, setReason] = useState("");
  const [working, setWorking] = useState(false);

  const { data, loading, error, reload } = useAsync(async () => {
    const resident = await residentService.getResident(id);
    const [household, members, certificates, clearances] = await Promise.all([
      resident.householdId ? householdService.getHousehold(resident.householdId) : Promise.resolve(null),
      resident.householdId ? householdService.listMembers(resident.householdId) : Promise.resolve([]),
      certificateService.listCertificates({ residentId: resident.id, pageSize: 50 }),
      clearanceService.listClearances({ residentId: resident.id, pageSize: 50 }),
    ]);
    return { resident, household, members, certificates: certificates.items, clearances: clearances.items };
  }, [id]);

  if (loading) {
    return (
      <Card>
        <InlineLoading label="Loading resident profile…" />
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <ErrorState
          title="Unable to load resident record"
          description={error ?? "The requested resident could not be retrieved."}
          onRetry={reload}
        />
      </Card>
    );
  }

  const { resident: r, household, members, certificates, clearances } = data;
  const canUpdate = hasPermission(user, "residents.update");
  const canDelete = hasPermission(user, "residents.delete");

  const toggleStatus = async () => {
    setWorking(true);
    try {
      if (r.status === "Active") {
        await residentService.deactivateResident(r.id, reason, user?.fullName);
        toast.success("Resident deactivated", "The record was marked inactive and retained for auditing.");
      } else {
        await residentService.reactivateResident(r.id, user?.fullName);
        toast.success("Resident reactivated", "The record is active again.");
      }
      setConfirm(false);
      setReason("");
      void reload();
    } catch (e) {
      toast.error("Operation failed", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title={`${r.firstName} ${r.middleName ? r.middleName.charAt(0) + ". " : ""}${r.lastName}${r.suffix ? " " + r.suffix : ""}`}
        description={`${r.residentNo} · ${calcAge(r.birthDate)} years old · ${r.sex} · ${r.address.purok}`}
        breadcrumbs={[
          { label: "BIMS-BIPS", to: "/admin" },
          { label: "Residents", to: "/admin/residents" },
          { label: r.residentNo },
        ]}
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate("/admin/residents")}>
              <ArrowLeft className="h-4 w-4" />
              Back to list
            </Button>
            {canUpdate && (
              <Link to={`/admin/residents/${r.id}/edit`}>
                <Button variant="secondary">
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
              </Link>
            )}
            {canDelete && (
              <Button
                variant={r.status === "Active" ? "danger" : "primary"}
                onClick={() => setConfirm(true)}
              >
                {r.status === "Active" ? (
                  <>
                    <UserMinus className="h-4 w-4" />
                    Deactivate
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-4 w-4" />
                    Reactivate
                  </>
                )}
              </Button>
            )}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={r.status} />
        <StatusBadge status={r.voterStatus} />
        {r.isPwd && <Badge tone="violet">PWD</Badge>}
        {r.is4Ps && <Badge tone="info">4Ps beneficiary</Badge>}
        {r.isSoloParent && <Badge tone="info">Solo parent</Badge>}
        {calcAge(r.birthDate) >= 60 && <Badge tone="warning">Senior citizen</Badge>}
        <span className="text-xs text-slate-500">Last updated {fmtDateTime(r.updatedAt)}</span>
      </div>

      <Card>
        <Tabs
          className="px-3 pt-1"
          active={tab}
          onChange={setTab}
          tabs={[
            { key: "profile", label: "Profile" },
            { key: "household", label: "Household", count: members.length },
            { key: "documents", label: "Documents", count: certificates.length + clearances.length },
            { key: "activity", label: "Record history" },
          ]}
        />

        {tab === "profile" && (
          <div className="grid gap-6 p-4 lg:grid-cols-2">
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Personal information
              </h3>
              <DetailList
                items={[
                  { label: "First name", value: r.firstName },
                  { label: "Middle name", value: r.middleName },
                  { label: "Last name", value: r.lastName },
                  { label: "Suffix", value: r.suffix },
                  { label: "Date of birth", value: fmtDate(r.birthDate) },
                  { label: "Age", value: `${calcAge(r.birthDate)} years` },
                  { label: "Place of birth", value: r.birthPlace },
                  { label: "Sex", value: r.sex },
                ]}
              />
            </section>

            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Contact information
              </h3>
              <DetailList
                items={[
                  { label: "Contact number", value: r.contactNumber },
                  { label: "Email address", value: r.email },
                ]}
              />
              <h3 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Address
              </h3>
              <DetailList
                items={[
                  { label: "House / unit", value: r.address.houseNo },
                  { label: "Street", value: r.address.street },
                  { label: "Purok", value: r.address.purok },
                  { label: "Barangay", value: r.address.barangay },
                  { label: "City", value: r.address.city },
                  { label: "Province / ZIP", value: `${r.address.province} ${r.address.zipCode}` },
                ]}
              />
            </section>

            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Civil status & identification
              </h3>
              <DetailList
                items={[
                  { label: "Civil status", value: r.civilStatus },
                  { label: "Nationality", value: r.nationality },
                  { label: "Religion", value: r.religion },
                  { label: "Blood type", value: r.bloodType },
                  { label: "PhilSys no.", value: r.philsysNo || "Not provided" },
                  { label: "Registered on", value: fmtDate(r.dateRegistered) },
                ]}
              />
            </section>

            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Voter & employment information
              </h3>
              <DetailList
                items={[
                  { label: "Voter status", value: <StatusBadge status={r.voterStatus} /> },
                  { label: "Precinct no.", value: r.precinctNo || "" },
                  { label: "Occupation", value: r.occupation },
                  { label: "Employment status", value: r.employmentStatus },
                ]}
              />
              {r.remarks && (
                <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Remarks</p>
                  <p className="mt-1 text-sm text-slate-700">{r.remarks}</p>
                </div>
              )}
            </section>
          </div>
        )}

        {tab === "household" && (
          <div className="p-4">
            {household ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Household</p>
                    <p className="mt-0.5 font-mono text-sm font-semibold text-slate-900">
                      {household.householdNo}
                    </p>
                    <p className="text-sm text-slate-600">{formatAddress(household.address)}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Head: {household.headName} · {household.memberCount} member(s) ·{" "}
                      {household.householdType}
                    </p>
                  </div>
                  <Link to={`/admin/households/${household.id}`}>
                    <Button variant="secondary" size="sm">
                      <Home className="h-3.5 w-3.5" />
                      Open household
                    </Button>
                  </Link>
                </div>
                <h3 className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Household members
                </h3>
                <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
                  {members.map((m) => (
                    <li key={m.id}>
                      <Link
                        to={`/admin/residents/${m.id}`}
                        className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-slate-50"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-800">
                            {m.firstName} {m.lastName}
                            {m.id === r.id && <span className="ml-1 text-xs text-brand-700">(this record)</span>}
                          </p>
                          <p className="text-xs text-slate-500">
                            {m.relationshipToHead || "Member"} · {calcAge(m.birthDate)} yrs · {m.sex}
                          </p>
                        </div>
                        <StatusBadge status={m.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="py-8 text-center text-sm text-slate-500">
                This resident is not currently assigned to a household.
              </p>
            )}
          </div>
        )}

        {tab === "documents" && (
          <div className="grid gap-4 p-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Certificate requests" icon={FileText} />
              {certificates.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-slate-500">No certificate requests on file.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {certificates.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">{c.certificateType}</p>
                        <p className="truncate font-mono text-[11px] text-slate-500">
                          {c.referenceNo} · {fmtDate(c.requestedAt)} · {fmtPeso(c.fee)}
                        </p>
                      </div>
                      <StatusBadge status={c.status} />
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card>
              <CardHeader title="Clearance requests" icon={FileBadge} />
              {clearances.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-slate-500">No clearance requests on file.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {clearances.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">{c.clearanceType}</p>
                        <p className="truncate font-mono text-[11px] text-slate-500">
                          {c.referenceNo} · {fmtDate(c.requestedAt)} · {fmtPeso(c.fee)}
                        </p>
                      </div>
                      <StatusBadge status={c.status} />
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        )}

        {tab === "activity" && (
          <div className="p-4">
            <ol className="relative space-y-4 border-l border-slate-200 pl-4">
              {[
                { at: r.updatedAt, label: "Record last updated", detail: "Profile information modified." },
                { at: r.createdAt, label: "Record created", detail: `Encoded as ${r.residentNo}.` },
              ].map((e, i) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-brand-600" />
                  <p className="text-sm font-medium text-slate-800">{e.label}</p>
                  <p className="text-xs text-slate-500">{e.detail}</p>
                  <p className="text-[11px] text-slate-400">{fmtDateTime(e.at)}</p>
                </li>
              ))}
            </ol>
            <p className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
              A full per-record audit trail will be sourced from the backend audit tables. This prototype
              displays the timestamps available in the simulated dataset.
            </p>
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={confirm}
        title={r.status === "Active" ? "Deactivate resident record?" : "Reactivate resident record?"}
        message={
          r.status === "Active"
            ? "The record will be marked inactive but retained for auditing. Barangay records are not permanently deleted in this module."
            : "The record will be restored to active status."
        }
        confirmLabel={r.status === "Active" ? "Deactivate" : "Reactivate"}
        destructive={r.status === "Active"}
        loading={working}
        onCancel={() => setConfirm(false)}
        onConfirm={toggleStatus}
      >
        {r.status === "Active" && (
          <Field label="Reason / remarks" htmlFor="detail-reason">
            <Textarea
              id="detail-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Permanently moved out of the barangay"
            />
          </Field>
        )}
      </ConfirmDialog>
    </div>
  );
}
