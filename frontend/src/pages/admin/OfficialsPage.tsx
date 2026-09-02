import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Archive, Eye, Landmark, Pencil, Plus, Power, Search } from "lucide-react";
import { officialService } from "@/services/officialService";
import { useAsync, useDebounced } from "@/hooks/useAsync";
import { DetailList, PageHeader, PrototypeNotice } from "@/components/ui/page";
import { Button, Card, Field, Input, Select } from "@/components/ui/primitives";
import { ActionMenu, Pagination, TableWrap, Td, Th, Tr } from "@/components/ui/data";
import { EmptyState, ErrorState, LoadingState, StatusBadge } from "@/components/ui/feedback";
import { ConfirmDialog, Modal } from "@/components/ui/overlay";
import { fmtDate } from "@/lib/format";
import { hasPermission, useAuthStore } from "@/store/authStore";
import { toast } from "@/store/toastStore";
import type { Official } from "@/types";

const POSITIONS = [
  "Punong Barangay",
  "Barangay Kagawad",
  "SK Chairperson",
  "Barangay Secretary",
  "Barangay Treasurer",
  "Chief Tanod",
  "Barangay Health Worker",
];

const schema = z.object({
  fullName: z.string().min(3, "Full name is required."),
  position: z.string().min(1, "Select a position."),
  committee: z.string().min(2, "Committee or assignment is required."),
  office: z.string().min(2, "Office is required."),
  contactNumber: z.string().regex(/^(09\d{9}|\+639\d{9})$/, "Use a valid PH mobile number."),
  email: z.string().email("Enter a valid email address."),
  termStart: z.string().min(1, "Term start is required."),
  termEnd: z.string().min(1, "Term end is required."),
  status: z.enum(["Active", "Inactive", "Archived"]),
});

type FormValues = z.infer<typeof schema>;

export default function OfficialsPage() {
  const user = useAuthStore((s) => s.user);
  const canManage = hasPermission(user, "officials.manage");

  const [search, setSearch] = useState("");
  const debounced = useDebounced(search);
  const [status, setStatus] = useState<Official["status"] | "">("");
  const [position, setPosition] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [editing, setEditing] = useState<Official | null>(null);
  const [viewing, setViewing] = useState<Official | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<Official | null>(null);
  const [working, setWorking] = useState(false);

  useEffect(() => setPage(1), [debounced, status, position, pageSize]);

  const query = useMemo(
    () => ({ search: debounced, status, position, page, pageSize }),
    [debounced, status, position, page, pageSize],
  );
  const { data, loading, error, reload } = useAsync(
    () => officialService.listOfficials(query),
    [JSON.stringify(query)],
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const openCreate = () => {
    setEditing(null);
    reset({
      fullName: "",
      position: "Barangay Kagawad",
      committee: "",
      office: "Barangay Hall  Sta. Cruz",
      contactNumber: "",
      email: "",
      termStart: "2023-11-30",
      termEnd: "2026-11-30",
      status: "Active",
    });
    setFormOpen(true);
  };

  const openEdit = (o: Official) => {
    setEditing(o);
    reset({
      fullName: o.fullName,
      position: o.position,
      committee: o.committee,
      office: o.office,
      contactNumber: o.contactNumber,
      email: o.email,
      termStart: o.termStart,
      termEnd: o.termEnd,
      status: o.status,
    });
    setFormOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    setWorking(true);
    try {
      if (editing) {
        await officialService.updateOfficial(editing.id, values, user?.fullName);
        toast.success("Official updated successfully", `${values.fullName}'s record was saved.`);
      } else {
        await officialService.createOfficial({ ...values, residentId: null }, user?.fullName);
        toast.success("Official added successfully", `${values.fullName} was added to the roster.`);
      }
      setFormOpen(false);
      void reload();
    } catch (e) {
      toast.error("Operation failed", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setWorking(false);
    }
  };

  const doArchive = async () => {
    if (!archiveTarget) return;
    setWorking(true);
    try {
      const next = archiveTarget.status === "Archived" ? "Active" : "Archived";
      await officialService.setStatus(archiveTarget.id, next, user?.fullName);
      toast.success(next === "Archived" ? "Official archived" : "Official restored");
      setArchiveTarget(null);
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
        title="Barangay Officials"
        description="Roster of elected and appointed officials, committee assignments and terms of office."
        breadcrumbs={[{ label: "BIMS-BIPS", to: "/admin" }, { label: "Officials" }]}
        actions={
          canManage ? (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Add official
            </Button>
          ) : undefined
        }
      />

      <PrototypeNotice compact />

      <Card>
        <div className="flex flex-wrap items-end gap-2 border-b border-slate-200 p-3">
          <div className="relative min-w-56 flex-1">
            <label htmlFor="off-search" className="sr-only">
              Search officials
            </label>
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              id="off-search"
              className="pl-8"
              placeholder="Search by name, position or committee…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Field label="Position" htmlFor="off-position" className="w-52">
            <Select id="off-position" value={position} onChange={(e) => setPosition(e.target.value)}>
              <option value="">All positions</option>
              {POSITIONS.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </Select>
          </Field>
          <Field label="Status" htmlFor="off-status" className="w-36">
            <Select
              id="off-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as Official["status"] | "")}
            >
              <option value="">All</option>
              <option>Active</option>
              <option>Inactive</option>
              <option>Archived</option>
            </Select>
          </Field>
        </div>

        {loading && <LoadingState label="Loading officials…" />}
        {error && !loading && <ErrorState title="Unable to load officials" description={error} onRetry={reload} />}
        {data && !loading && !error && data.items.length === 0 && (
          <EmptyState icon={Landmark} title="No officials found" description="Adjust the filters or add a new official." />
        )}

        {data && !loading && !error && data.items.length > 0 && (
          <>
            <TableWrap>
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Position</Th>
                  <Th className="hidden lg:table-cell">Committee / assignment</Th>
                  <Th className="hidden xl:table-cell">Contact</Th>
                  <Th className="hidden md:table-cell">Term</Th>
                  <Th>Status</Th>
                  <Th className="w-12 text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((o) => (
                  <Tr key={o.id} onClick={() => setViewing(o)}>
                    <Td className="font-medium text-slate-900">{o.fullName}</Td>
                    <Td>{o.position}</Td>
                    <Td className="hidden lg:table-cell">{o.committee}</Td>
                    <Td className="hidden xl:table-cell">
                      <span className="block tabular-nums">{o.contactNumber}</span>
                      <span className="block max-w-48 truncate text-[11px] text-slate-500">{o.email}</span>
                    </Td>
                    <Td className="hidden whitespace-nowrap md:table-cell">
                      {fmtDate(o.termStart, "MMM yyyy")} – {fmtDate(o.termEnd, "MMM yyyy")}
                    </Td>
                    <Td>
                      <StatusBadge status={o.status} />
                    </Td>
                    <Td className="text-right">
                      <ActionMenu
                        label={`Actions for ${o.fullName}`}
                        actions={[
                          { label: "View profile", icon: Eye, onSelect: () => setViewing(o) },
                          { label: "Edit record", icon: Pencil, disabled: !canManage, onSelect: () => openEdit(o) },
                          {
                            label: o.status === "Archived" ? "Restore official" : "Archive official",
                            icon: o.status === "Archived" ? Power : Archive,
                            danger: o.status !== "Archived",
                            disabled: !canManage,
                            onSelect: () => setArchiveTarget(o),
                          },
                        ]}
                      />
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </TableWrap>
            <Pagination
              page={data.page}
              pageSize={data.pageSize}
              total={data.total}
              totalPages={data.totalPages}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </>
        )}
      </Card>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Edit official" : "Add barangay official"}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)} disabled={working}>
              Cancel
            </Button>
            <Button onClick={handleSubmit(onSubmit)} loading={working}>
              {editing ? "Save changes" : "Add official"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2" noValidate>
          <Field label="Full name" htmlFor="o-name" required error={errors.fullName?.message}>
            <Input id="o-name" invalid={!!errors.fullName} {...register("fullName")} />
          </Field>
          <Field label="Position" htmlFor="o-position" required error={errors.position?.message}>
            <Select id="o-position" {...register("position")}>
              {POSITIONS.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </Select>
          </Field>
          <Field label="Committee / assignment" htmlFor="o-committee" required error={errors.committee?.message}>
            <Input id="o-committee" invalid={!!errors.committee} {...register("committee")} />
          </Field>
          <Field label="Office" htmlFor="o-office" required error={errors.office?.message}>
            <Input id="o-office" invalid={!!errors.office} {...register("office")} />
          </Field>
          <Field label="Contact number" htmlFor="o-contact" required error={errors.contactNumber?.message}>
            <Input id="o-contact" placeholder="09171234567" invalid={!!errors.contactNumber} {...register("contactNumber")} />
          </Field>
          <Field label="Email address" htmlFor="o-email" required error={errors.email?.message}>
            <Input id="o-email" type="email" invalid={!!errors.email} {...register("email")} />
          </Field>
          <Field label="Term start" htmlFor="o-start" required error={errors.termStart?.message}>
            <Input id="o-start" type="date" {...register("termStart")} />
          </Field>
          <Field label="Term end" htmlFor="o-end" required error={errors.termEnd?.message}>
            <Input id="o-end" type="date" {...register("termEnd")} />
          </Field>
          <Field label="Status" htmlFor="o-status" required>
            <Select id="o-status" {...register("status")}>
              <option>Active</option>
              <option>Inactive</option>
              <option>Archived</option>
            </Select>
          </Field>
        </form>
      </Modal>

      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing?.fullName ?? "Official"}
        description={viewing ? `${viewing.position} · ${viewing.committee}` : undefined}
        footer={
          <Button variant="secondary" onClick={() => setViewing(null)}>
            Close
          </Button>
        }
      >
        {viewing && (
          <DetailList
            items={[
              { label: "Position", value: viewing.position },
              { label: "Committee", value: viewing.committee },
              { label: "Office", value: viewing.office },
              { label: "Status", value: <StatusBadge status={viewing.status} /> },
              { label: "Contact number", value: viewing.contactNumber },
              { label: "Email", value: viewing.email },
              { label: "Term start", value: fmtDate(viewing.termStart) },
              { label: "Term end", value: fmtDate(viewing.termEnd) },
            ]}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!archiveTarget}
        title={archiveTarget?.status === "Archived" ? "Restore official?" : "Archive official?"}
        message={
          archiveTarget?.status === "Archived"
            ? `${archiveTarget?.fullName} will be restored to the active roster.`
            : `${archiveTarget?.fullName} will be moved to the archive. Historical records remain intact.`
        }
        confirmLabel={archiveTarget?.status === "Archived" ? "Restore" : "Archive"}
        destructive={archiveTarget?.status !== "Archived"}
        loading={working}
        onCancel={() => setArchiveTarget(null)}
        onConfirm={doArchive}
      />
    </div>
  );
}
