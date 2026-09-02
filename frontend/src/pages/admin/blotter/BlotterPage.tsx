import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ClipboardList, Eye, Plus, Search } from "lucide-react";
import { blotterService, BLOTTER_STATUSES, INCIDENT_TYPES } from "@/services/blotterService";
import { useAsync, useDebounced } from "@/hooks/useAsync";
import { PageHeader, PrototypeNotice, StatCard } from "@/components/ui/page";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { ActionMenu, Pagination, TableWrap, Td, Th, Tr } from "@/components/ui/data";
import { EmptyState, ErrorState, LoadingState, StatusBadge } from "@/components/ui/feedback";
import { Modal } from "@/components/ui/overlay";
import { fmtDate } from "@/lib/format";
import { hasPermission, useAuthStore } from "@/store/authStore";
import { toast } from "@/store/toastStore";
import type { BlotterStatus } from "@/types";

const schema = z.object({
  incidentType: z.string().min(1, "Select an incident type."),
  incidentDate: z.string().min(1, "Incident date is required."),
  location: z.string().min(3, "Location is required."),
  complainantName: z.string().min(3, "Complainant name is required."),
  complainantContact: z.string().regex(/^(09\d{9}|\+639\d{9})$/, "Use a valid PH mobile number."),
  respondentName: z.string().min(3, "Respondent name is required."),
  respondentAddress: z.string().min(3, "Respondent address is required."),
  description: z.string().min(20, "Provide a narrative of at least 20 characters."),
  assignedTo: z.string().min(3, "Assign a responsible officer."),
  status: z.enum(["Pending", "Under Investigation", "Resolved", "Closed"]),
});

type FormValues = z.infer<typeof schema>;

const ASSIGNEES = [
  "Rosalinda M. Ventura",
  "Joselito P. Carpio",
  "Teresita B. Galang",
  "Salvador C. Yabut",
  "Corazon V. Legaspi",
];

export default function BlotterPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const canManage = hasPermission(user, "blotter.manage");
  const [params, setParams] = useSearchParams();

  const [search, setSearch] = useState("");
  const debounced = useDebounced(search);
  const [status, setStatus] = useState<BlotterStatus | "">((params.get("status") as BlotterStatus) ?? "");
  const [incidentType, setIncidentType] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [formOpen, setFormOpen] = useState(params.get("new") === "1");
  const [working, setWorking] = useState(false);

  useEffect(() => setPage(1), [debounced, status, incidentType, pageSize]);

  const query = useMemo(
    () => ({ search: debounced, status, incidentType, page, pageSize }),
    [debounced, status, incidentType, page, pageSize],
  );
  const { data, loading, error, reload } = useAsync(
    () => blotterService.listBlotter(query),
    [JSON.stringify(query)],
  );
  const counts = useAsync(() => blotterService.listBlotter({ pageSize: 1000 }), []);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      incidentType: "Noise Complaint",
      incidentDate: new Date().toISOString().slice(0, 10),
      location: "",
      complainantName: "",
      complainantContact: "",
      respondentName: "",
      respondentAddress: "",
      description: "",
      assignedTo: ASSIGNEES[0],
      status: "Pending",
    },
  });

  const closeForm = () => {
    setFormOpen(false);
    const next = new URLSearchParams(params);
    next.delete("new");
    setParams(next, { replace: true });
    reset();
  };

  const onSubmit = async (values: FormValues) => {
    setWorking(true);
    try {
      const created = await blotterService.createCase({ ...values, resolution: "" }, user?.fullName);
      toast.success("Incident recorded successfully", `Case ${created.caseNo} was created.`);
      closeForm();
      navigate(`/admin/blotter/${created.id}`);
    } catch (e) {
      toast.error("Operation failed", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setWorking(false);
    }
  };

  const all = counts.data?.items ?? [];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Blotter & Incident Records"
        description="Barangay incident intake, mediation tracking and case resolution."
        breadcrumbs={[{ label: "BIMS-BIPS", to: "/admin" }, { label: "Blotter" }]}
        actions={
          canManage ? (
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4" />
              Register incident
            </Button>
          ) : undefined
        }
      />

      <PrototypeNotice compact />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {BLOTTER_STATUSES.map((s) => (
          <StatCard
            key={s}
            label={s}
            value={all.filter((b) => b.status === s).length}
            icon={ClipboardList}
            tone={s === "Pending" ? "amber" : s === "Resolved" ? "emerald" : s === "Closed" ? "slate" : "brand"}
          />
        ))}
      </div>

      <Card>
        <div className="flex flex-wrap items-end gap-2 border-b border-slate-200 p-3">
          <div className="relative min-w-56 flex-1">
            <label htmlFor="blt-search" className="sr-only">
              Search cases
            </label>
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              id="blt-search"
              className="pl-8"
              placeholder="Search by case no., party or location…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Field label="Status" htmlFor="blt-status" className="w-48">
            <Select id="blt-status" value={status} onChange={(e) => setStatus(e.target.value as BlotterStatus | "")}>
              <option value="">All statuses</option>
              {BLOTTER_STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </Field>
          <Field label="Incident type" htmlFor="blt-type" className="w-48">
            <Select id="blt-type" value={incidentType} onChange={(e) => setIncidentType(e.target.value)}>
              <option value="">All types</option>
              {INCIDENT_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Field>
        </div>

        {loading && <LoadingState label="Loading incident records…" />}
        {error && !loading && <ErrorState title="Unable to load blotter records" description={error} onRetry={reload} />}
        {data && !loading && !error && data.items.length === 0 && (
          <EmptyState
            icon={ClipboardList}
            title="No incident records found"
            description="No cases match the current filters."
            action={
              canManage ? (
                <Button size="sm" onClick={() => setFormOpen(true)}>
                  <Plus className="h-3.5 w-3.5" />
                  Register incident
                </Button>
              ) : undefined
            }
          />
        )}

        {data && !loading && !error && data.items.length > 0 && (
          <>
            <TableWrap>
              <thead>
                <tr>
                  <Th>Case no.</Th>
                  <Th className="hidden md:table-cell">Date</Th>
                  <Th>Complainant</Th>
                  <Th>Respondent</Th>
                  <Th className="hidden lg:table-cell">Incident type</Th>
                  <Th className="hidden xl:table-cell">Location</Th>
                  <Th className="hidden xl:table-cell">Assigned to</Th>
                  <Th>Status</Th>
                  <Th className="w-12 text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((b) => (
                  <Tr key={b.id} onClick={() => navigate(`/admin/blotter/${b.id}`)}>
                    <Td className="font-mono text-xs font-semibold text-slate-800">{b.caseNo}</Td>
                    <Td className="hidden whitespace-nowrap md:table-cell">{fmtDate(b.incidentDate)}</Td>
                    <Td className="font-medium text-slate-800">{b.complainantName}</Td>
                    <Td>{b.respondentName}</Td>
                    <Td className="hidden lg:table-cell">{b.incidentType}</Td>
                    <Td className="hidden xl:table-cell">
                      <span className="block max-w-48 truncate">{b.location}</span>
                    </Td>
                    <Td className="hidden xl:table-cell">{b.assignedTo}</Td>
                    <Td>
                      <StatusBadge status={b.status} />
                    </Td>
                    <Td className="text-right">
                      <ActionMenu
                        label={`Actions for ${b.caseNo}`}
                        actions={[
                          { label: "Open case", icon: Eye, onSelect: () => navigate(`/admin/blotter/${b.id}`) },
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
        onClose={closeForm}
        title="Register incident report"
        description="Record a new blotter entry. A case number is generated automatically."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeForm} disabled={working}>
              Cancel
            </Button>
            <Button onClick={handleSubmit(onSubmit)} loading={working}>
              File incident report
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2" noValidate>
          <Field label="Incident type" htmlFor="b-type" required error={errors.incidentType?.message}>
            <Select id="b-type" {...register("incidentType")}>
              {INCIDENT_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Field>
          <Field label="Date of incident" htmlFor="b-date" required error={errors.incidentDate?.message}>
            <Input id="b-date" type="date" invalid={!!errors.incidentDate} {...register("incidentDate")} />
          </Field>
          <Field label="Location" htmlFor="b-location" required error={errors.location?.message} className="sm:col-span-2">
            <Input id="b-location" placeholder="Street, purok, landmark…" invalid={!!errors.location} {...register("location")} />
          </Field>
          <Field label="Complainant" htmlFor="b-complainant" required error={errors.complainantName?.message}>
            <Input id="b-complainant" invalid={!!errors.complainantName} {...register("complainantName")} />
          </Field>
          <Field label="Complainant contact" htmlFor="b-contact" required error={errors.complainantContact?.message}>
            <Input id="b-contact" placeholder="09171234567" invalid={!!errors.complainantContact} {...register("complainantContact")} />
          </Field>
          <Field label="Respondent" htmlFor="b-respondent" required error={errors.respondentName?.message}>
            <Input id="b-respondent" invalid={!!errors.respondentName} {...register("respondentName")} />
          </Field>
          <Field label="Respondent address" htmlFor="b-raddress" required error={errors.respondentAddress?.message}>
            <Input id="b-raddress" invalid={!!errors.respondentAddress} {...register("respondentAddress")} />
          </Field>
          <Field
            label="Incident narrative"
            htmlFor="b-description"
            required
            error={errors.description?.message}
            className="sm:col-span-2"
          >
            <Textarea id="b-description" rows={4} invalid={!!errors.description} {...register("description")} />
          </Field>
          <Field label="Assigned personnel" htmlFor="b-assigned" required error={errors.assignedTo?.message}>
            <Select id="b-assigned" {...register("assignedTo")}>
              {ASSIGNEES.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </Select>
          </Field>
          <Field label="Initial status" htmlFor="b-status" required>
            <Select id="b-status" {...register("status")}>
              <option>Pending</option>
              <option>Under Investigation</option>
            </Select>
          </Field>
        </form>
      </Modal>
    </div>
  );
}
