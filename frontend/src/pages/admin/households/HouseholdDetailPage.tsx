import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Crown, Pencil, Trash2, UserPlus, Users } from "lucide-react";
import { householdService } from "@/services/householdService";
import { residentService } from "@/services/residentService";
import { useAsync, useDebounced } from "@/hooks/useAsync";
import { DetailList, PageHeader } from "@/components/ui/page";
import { Badge, Button, Card, CardHeader, Field, Input, Select } from "@/components/ui/primitives";
import { ErrorState, InlineLoading, StatusBadge } from "@/components/ui/feedback";
import { ConfirmDialog, Modal } from "@/components/ui/overlay";
import { ActionMenu } from "@/components/ui/data";
import { calcAge, fmtDate, formatAddress } from "@/lib/format";
import { hasPermission, useAuthStore } from "@/store/authStore";
import { toast } from "@/store/toastStore";
import type { Resident } from "@/types";

const RELATIONSHIPS = ["Spouse", "Son", "Daughter", "Parent", "Grandparent", "Sibling", "Relative", "Boarder", "Member"];

export default function HouseholdDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const canManage = hasPermission(user, "households.manage");

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<Resident | null>(null);
  const [working, setWorking] = useState(false);

  const [memberSearch, setMemberSearch] = useState("");
  const debouncedMemberSearch = useDebounced(memberSearch);
  const [selectedResident, setSelectedResident] = useState("");
  const [relationship, setRelationship] = useState("Member");

  const { data, loading, error, reload } = useAsync(async () => {
    const household = await householdService.getHousehold(id);
    const members = await householdService.listMembers(id);
    return { household, members };
  }, [id]);

  const candidates = useAsync(
    () =>
      debouncedMemberSearch.trim().length >= 2
        ? residentService.listResidents({ search: debouncedMemberSearch, pageSize: 8 })
        : Promise.resolve(null),
    [debouncedMemberSearch],
  );

  const [form, setForm] = useState({ householdType: "", incomeBracket: "", status: "", remarks: "" });

  if (loading) {
    return (
      <Card>
        <InlineLoading label="Loading household record…" />
      </Card>
    );
  }
  if (error || !data) {
    return (
      <Card>
        <ErrorState
          title="Unable to load household record"
          description={error ?? "The requested household could not be retrieved."}
          onRetry={reload}
        />
      </Card>
    );
  }

  const { household: h, members } = data;

  const openEdit = () => {
    setForm({
      householdType: h.householdType,
      incomeBracket: h.incomeBracket,
      status: h.status,
      remarks: h.remarks,
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    setWorking(true);
    try {
      await householdService.updateHousehold(
        h.id,
        {
          householdType: form.householdType as typeof h.householdType,
          incomeBracket: form.incomeBracket as typeof h.incomeBracket,
          status: form.status as typeof h.status,
          remarks: form.remarks,
        },
        user?.fullName,
      );
      toast.success("Household updated successfully");
      setEditOpen(false);
      void reload();
    } catch (e) {
      toast.error("Operation failed", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setWorking(false);
    }
  };

  const addMember = async () => {
    if (!selectedResident) {
      toast.warning("Select a resident", "Search for a resident record first.");
      return;
    }
    setWorking(true);
    try {
      await householdService.addMember(h.id, selectedResident, relationship, user?.fullName);
      toast.success("Member added successfully", "The resident was linked to this household.");
      setAddOpen(false);
      setSelectedResident("");
      setMemberSearch("");
      void reload();
    } catch (e) {
      toast.error("Operation failed", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setWorking(false);
    }
  };

  const removeMember = async () => {
    if (!removeTarget) return;
    setWorking(true);
    try {
      await householdService.removeMember(h.id, removeTarget.id, user?.fullName);
      toast.success("Member removed", `${removeTarget.firstName} ${removeTarget.lastName} is no longer linked.`);
      setRemoveTarget(null);
      void reload();
    } catch (e) {
      toast.error("Unable to remove member", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setWorking(false);
    }
  };

  const setHead = async (resident: Resident) => {
    try {
      await householdService.setHead(h.id, resident.id, user?.fullName);
      toast.success("Household head updated", `${resident.firstName} ${resident.lastName} is now the head.`);
      void reload();
    } catch (e) {
      toast.error("Operation failed", e instanceof Error ? e.message : "Please try again.");
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title={h.householdNo}
        description={formatAddress(h.address)}
        breadcrumbs={[
          { label: "BIMS-BIPS", to: "/admin" },
          { label: "Households", to: "/admin/households" },
          { label: h.householdNo },
        ]}
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate("/admin/households")}>
              <ArrowLeft className="h-4 w-4" />
              Back to registry
            </Button>
            {canManage && (
              <>
                <Button variant="secondary" onClick={openEdit}>
                  <Pencil className="h-4 w-4" />
                  Edit household
                </Button>
                <Button onClick={() => setAddOpen(true)}>
                  <UserPlus className="h-4 w-4" />
                  Add member
                </Button>
              </>
            )}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Household information" />
          <div className="p-4">
            <DetailList
              columns={3}
              items={[
                { label: "Household no.", value: <span className="font-mono">{h.householdNo}</span> },
                { label: "Household head", value: h.headName },
                { label: "Status", value: <StatusBadge status={h.status} /> },
                { label: "House / unit", value: h.address.houseNo },
                { label: "Street", value: h.address.street },
                { label: "Purok", value: h.address.purok },
                { label: "Barangay", value: h.address.barangay },
                { label: "City / province", value: `${h.address.city}, ${h.address.province}` },
                { label: "ZIP code", value: h.address.zipCode },
                { label: "Tenure", value: h.householdType },
                { label: "Income bracket", value: h.incomeBracket },
                { label: "Household size", value: `${h.memberCount} member(s)` },
                { label: "Water source", value: h.waterSource },
                { label: "Toilet facility", value: h.toiletFacility },
                { label: "Date registered", value: fmtDate(h.dateRegistered) },
              ]}
            />
            {h.remarks && (
              <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Remarks</p>
                <p className="mt-1 text-sm text-slate-700">{h.remarks}</p>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Simulated location" description="Conceptual GIS reference for this household." />
          <div className="p-4">
            <div className="relative h-40 overflow-hidden rounded-md border border-slate-200 bg-[linear-gradient(90deg,#e2e8f0_1px,transparent_1px),linear-gradient(#e2e8f0_1px,transparent_1px)] bg-[size:20px_20px]">
              <span className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-brand-700 shadow" />
              <span className="absolute bottom-1 right-1 rounded bg-white/85 px-1.5 py-0.5 text-[10px] text-slate-500">
                Simulated coordinates
              </span>
            </div>
            <dl className="mt-3 space-y-1 text-xs text-slate-600">
              <div className="flex justify-between">
                <dt>Latitude</dt>
                <dd className="font-mono">{h.geo.lat.toFixed(5)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Longitude</dt>
                <dd className="font-mono">{h.geo.lng.toFixed(5)}</dd>
              </div>
            </dl>
            <Link to="/admin/gis" className="mt-3 inline-block text-xs font-medium text-brand-700 hover:underline">
              Open GIS module →
            </Link>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Household members"
          description="Residents linked to this household. Click a member to open their profile."
          icon={Users}
          action={<Badge tone="neutral">{members.length} member(s)</Badge>}
        />
        {members.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-slate-500">
            No members are linked to this household yet.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {members.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-slate-50">
                <Link to={`/admin/residents/${m.id}`} className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">
                    {m.lastName}, {m.firstName} {m.middleName ? m.middleName.charAt(0) + "." : ""}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {m.residentNo} · {calcAge(m.birthDate)} yrs · {m.sex} · {m.civilStatus}
                  </p>
                </Link>
                <div className="flex shrink-0 items-center gap-2">
                  {m.id === h.headResidentId ? (
                    <Badge tone="brand">
                      <Crown className="h-3 w-3" />
                      Household head
                    </Badge>
                  ) : (
                    <Badge tone="neutral">{m.relationshipToHead || "Member"}</Badge>
                  )}
                  <StatusBadge status={m.status} />
                  <ActionMenu
                    label={`Actions for ${m.firstName} ${m.lastName}`}
                    actions={[
                      {
                        label: "Set as household head",
                        icon: Crown,
                        disabled: !canManage || m.id === h.headResidentId,
                        onSelect: () => void setHead(m),
                      },
                      {
                        label: "Remove from household",
                        icon: Trash2,
                        danger: true,
                        disabled: !canManage || m.id === h.headResidentId,
                        onSelect: () => setRemoveTarget(m),
                      },
                    ]}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Add member */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add household member"
        description="Search for an existing resident record and link it to this household."
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddOpen(false)} disabled={working}>
              Cancel
            </Button>
            <Button onClick={addMember} loading={working}>
              Add member
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Search resident" htmlFor="member-search" hint="Type at least 2 characters.">
            <Input
              id="member-search"
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              placeholder="Name or resident number…"
            />
          </Field>

          {candidates.loading && <p className="text-xs text-slate-500">Searching…</p>}
          {candidates.data && candidates.data.items.length === 0 && (
            <p className="text-xs text-slate-500">No matching resident records.</p>
          )}
          {candidates.data && candidates.data.items.length > 0 && (
            <ul className="max-h-56 divide-y divide-slate-100 overflow-y-auto rounded-md border border-slate-200">
              {candidates.data.items.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedResident(c.id)}
                    className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-slate-50 ${
                      selectedResident === c.id ? "bg-brand-50" : ""
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-slate-800">
                        {c.lastName}, {c.firstName}
                      </span>
                      <span className="block truncate text-[11px] text-slate-500">
                        {c.residentNo} · {c.address.purok}
                        {c.householdId && c.householdId !== h.id ? " · currently in another household" : ""}
                      </span>
                    </span>
                    {selectedResident === c.id && <Badge tone="brand">Selected</Badge>}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <Field label="Relationship to head" htmlFor="member-relationship" required>
            <Select
              id="member-relationship"
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
            >
              {RELATIONSHIPS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </Select>
          </Field>
        </div>
      </Modal>

      {/* Edit household */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit household"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditOpen(false)} disabled={working}>
              Cancel
            </Button>
            <Button onClick={saveEdit} loading={working}>
              Save changes
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tenure / household type" htmlFor="e-type" required>
            <Select
              id="e-type"
              value={form.householdType}
              onChange={(e) => setForm((f) => ({ ...f, householdType: e.target.value }))}
            >
              {["Owned", "Rented", "Shared", "Caretaker"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Field>
          <Field label="Income bracket" htmlFor="e-income" required>
            <Select
              id="e-income"
              value={form.incomeBracket}
              onChange={(e) => setForm((f) => ({ ...f, incomeBracket: e.target.value }))}
            >
              {["Below ₱10,000", "₱10,000 – ₱20,000", "₱20,001 – ₱40,000", "Above ₱40,000"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Field>
          <Field label="Status" htmlFor="e-status" required>
            <Select
              id="e-status"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            >
              <option>Active</option>
              <option>Inactive</option>
            </Select>
          </Field>
          <Field label="Remarks" htmlFor="e-remarks" className="sm:col-span-2">
            <Input
              id="e-remarks"
              value={form.remarks}
              onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
            />
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!removeTarget}
        title="Remove member from household?"
        message={`${removeTarget?.firstName ?? ""} ${removeTarget?.lastName ?? ""} will be unlinked from ${h.householdNo}. The resident record itself is retained.`}
        confirmLabel="Remove member"
        destructive
        loading={working}
        onCancel={() => setRemoveTarget(null)}
        onConfirm={removeMember}
      />
    </div>
  );
}
