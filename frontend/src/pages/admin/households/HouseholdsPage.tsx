import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, Home, Plus, Search, X } from "lucide-react";
import { householdService } from "@/services/householdService";
import { useAsync, useDebounced } from "@/hooks/useAsync";
import { PageHeader, PrototypeNotice, StatCard } from "@/components/ui/page";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { ActionMenu, Pagination, TableWrap, Td, Th, Tr } from "@/components/ui/data";
import { EmptyState, ErrorState, LoadingState, StatusBadge } from "@/components/ui/feedback";
import { Modal } from "@/components/ui/overlay";
import { fmtDate } from "@/lib/format";
import { hasPermission, useAuthStore } from "@/store/authStore";
import { toast } from "@/store/toastStore";
import { PUROK_OPTIONS } from "@/components/domain/ResidentForm";
import type { HouseholdQuery } from "@/types";

const householdSchema = z.object({
  houseNo: z.string().min(1, "House / unit number is required."),
  street: z.string().min(2, "Street is required."),
  purok: z.string().min(1, "Select a purok."),
  zipCode: z.string().min(4, "ZIP code is required."),
  householdType: z.enum(["Owned", "Rented", "Shared", "Caretaker"]),
  incomeBracket: z.enum(["Below ₱10,000", "₱10,000 – ₱20,000", "₱20,001 – ₱40,000", "Above ₱40,000"]),
  waterSource: z.string().min(1, "Water source is required."),
  toiletFacility: z.string().min(1, "Toilet facility is required."),
  dateRegistered: z.string().min(1, "Registration date is required."),
  status: z.enum(["Active", "Inactive"]),
  remarks: z.string().max(400).optional().or(z.literal("")),
});

type HouseholdFormValues = z.infer<typeof householdSchema>;

export default function HouseholdsPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [params, setParams] = useSearchParams();

  const [search, setSearch] = useState("");
  const debounced = useDebounced(search);
  const [filters, setFilters] = useState<HouseholdQuery>({ purok: "", householdType: "", status: "" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState("householdNo");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [modalOpen, setModalOpen] = useState(params.get("new") === "1");
  const [submitting, setSubmitting] = useState(false);

  const canManage = hasPermission(user, "households.manage");

  useEffect(() => {
    setPage(1);
  }, [debounced, filters, pageSize]);

  const query = useMemo(
    () => ({ ...filters, search: debounced, page, pageSize, sortBy, sortDir }),
    [filters, debounced, page, pageSize, sortBy, sortDir],
  );
  const { data, loading, error, reload } = useAsync(
    () => householdService.listHouseholds(query),
    [JSON.stringify(query)],
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<HouseholdFormValues>({
    resolver: zodResolver(householdSchema),
    defaultValues: {
      houseNo: "",
      street: "",
      purok: "",
      zipCode: "1104",
      householdType: "Owned",
      incomeBracket: "₱10,000 – ₱20,000",
      waterSource: "Maynilad / Manila Water",
      toiletFacility: "Water-sealed",
      dateRegistered: new Date().toISOString().slice(0, 10),
      status: "Active",
      remarks: "",
    },
  });

  const closeModal = () => {
    setModalOpen(false);
    const next = new URLSearchParams(params);
    next.delete("new");
    setParams(next, { replace: true });
    reset();
  };

  const onCreate = async (values: HouseholdFormValues) => {
    setSubmitting(true);
    try {
      const created = await householdService.createHousehold(
        {
          headResidentId: null,
          address: {
            houseNo: values.houseNo,
            street: values.street,
            purok: values.purok,
            barangay: "Sta. Cruz",
            city: "Quezon City",
            province: "Metro Manila",
            zipCode: values.zipCode,
          },
          householdType: values.householdType,
          incomeBracket: values.incomeBracket,
          waterSource: values.waterSource,
          toiletFacility: values.toiletFacility,
          dateRegistered: values.dateRegistered,
          status: values.status,
          remarks: values.remarks ?? "",
        },
        user?.fullName,
      );
      toast.success("Household created successfully", `${created.householdNo} was registered.`);
      closeModal();
      navigate(`/admin/households/${created.id}`);
    } catch (e) {
      toast.error("Operation failed", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const onSort = (key: string) => {
    if (sortBy === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(key);
      setSortDir("asc");
    }
  };

  const totalMembers = data?.items.reduce((a, h) => a + h.memberCount, 0) ?? 0;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Household Registry"
        description="Registered households of Barangay Sta. Cruz, with member composition and dwelling information."
        breadcrumbs={[{ label: "BIMS-BIPS", to: "/admin" }, { label: "Households" }]}
        actions={
          canManage ? (
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4" />
              Add household
            </Button>
          ) : undefined
        }
      />

      <PrototypeNotice compact />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Households (filtered)" value={data?.total ?? ""} icon={Home} />
        <StatCard label="Members on this page" value={totalMembers} tone="slate" />
        <StatCard
          label="Average size (page)"
          value={data && data.items.length ? (totalMembers / data.items.length).toFixed(1) : ""}
          tone="slate"
        />
        <StatCard label="Puroks covered" value={PUROK_OPTIONS.length} tone="slate" />
      </div>

      <Card>
        <div className="flex flex-wrap items-end gap-2 border-b border-slate-200 p-3">
          <div className="relative min-w-56 flex-1">
            <label htmlFor="hh-search" className="sr-only">
              Search households
            </label>
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              id="hh-search"
              className="pl-8"
              placeholder="Search by household no., head or address…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Field label="Purok" htmlFor="hh-purok" className="w-36">
            <Select
              id="hh-purok"
              value={filters.purok ?? ""}
              onChange={(e) => setFilters((f) => ({ ...f, purok: e.target.value }))}
            >
              <option value="">All</option>
              {PUROK_OPTIONS.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </Select>
          </Field>
          <Field label="Tenure" htmlFor="hh-type" className="w-36">
            <Select
              id="hh-type"
              value={filters.householdType ?? ""}
              onChange={(e) =>
                setFilters((f) => ({ ...f, householdType: e.target.value as HouseholdQuery["householdType"] }))
              }
            >
              <option value="">All</option>
              {["Owned", "Rented", "Shared", "Caretaker"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Field>
          <Field label="Status" htmlFor="hh-status" className="w-32">
            <Select
              id="hh-status"
              value={filters.status ?? ""}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as HouseholdQuery["status"] }))}
            >
              <option value="">All</option>
              <option>Active</option>
              <option>Inactive</option>
            </Select>
          </Field>
          {(search || filters.purok || filters.householdType || filters.status) && (
            <Button
              variant="ghost"
              onClick={() => {
                setSearch("");
                setFilters({ purok: "", householdType: "", status: "" });
              }}
            >
              <X className="h-4 w-4" />
              Clear
            </Button>
          )}
        </div>

        {loading && <LoadingState label="Loading household registry…" />}
        {error && !loading && (
          <ErrorState title="Unable to load households" description={error} onRetry={reload} />
        )}
        {data && !loading && !error && data.items.length === 0 && (
          <EmptyState
            icon={Home}
            title="No households found"
            description="Adjust your search or filters, or register a new household."
            action={
              canManage ? (
                <Button size="sm" onClick={() => setModalOpen(true)}>
                  <Plus className="h-3.5 w-3.5" />
                  Add household
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
                  <Th sortKey="householdNo" activeKey={sortBy} dir={sortDir} onSort={onSort}>
                    Household no.
                  </Th>
                  <Th>Household head</Th>
                  <Th className="hidden md:table-cell">Address</Th>
                  <Th sortKey="purok" activeKey={sortBy} dir={sortDir} onSort={onSort}>
                    Purok
                  </Th>
                  <Th sortKey="members" activeKey={sortBy} dir={sortDir} onSort={onSort} className="w-20">
                    Members
                  </Th>
                  <Th className="hidden lg:table-cell">Tenure</Th>
                  <Th className="hidden xl:table-cell">Registered</Th>
                  <Th>Status</Th>
                  <Th className="w-12 text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((h) => (
                  <Tr key={h.id} onClick={() => navigate(`/admin/households/${h.id}`)}>
                    <Td className="font-mono text-xs font-semibold text-slate-800">{h.householdNo}</Td>
                    <Td className="font-medium text-slate-800">{h.headName}</Td>
                    <Td className="hidden md:table-cell">
                      <span className="block max-w-64 truncate">
                        {h.address.houseNo} {h.address.street}
                      </span>
                    </Td>
                    <Td>{h.address.purok}</Td>
                    <Td className="tabular-nums">{h.memberCount}</Td>
                    <Td className="hidden lg:table-cell">{h.householdType}</Td>
                    <Td className="hidden whitespace-nowrap xl:table-cell">{fmtDate(h.dateRegistered)}</Td>
                    <Td>
                      <StatusBadge status={h.status} />
                    </Td>
                    <Td className="text-right">
                      <ActionMenu
                        label={`Actions for ${h.householdNo}`}
                        actions={[
                          {
                            label: "View household",
                            icon: Eye,
                            onSelect: () => navigate(`/admin/households/${h.id}`),
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
        open={modalOpen}
        onClose={closeModal}
        title="Register new household"
        description="Create a household record. Members can be assigned after the household is created."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit(onCreate)} loading={submitting}>
              Create household
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit(onCreate)} className="grid gap-4 sm:grid-cols-2" noValidate>
          <Field label="House / unit no." htmlFor="h-houseNo" required error={errors.houseNo?.message}>
            <Input id="h-houseNo" invalid={!!errors.houseNo} {...register("houseNo")} />
          </Field>
          <Field label="Street" htmlFor="h-street" required error={errors.street?.message}>
            <Input id="h-street" invalid={!!errors.street} {...register("street")} />
          </Field>
          <Field label="Purok" htmlFor="h-purok" required error={errors.purok?.message}>
            <Select id="h-purok" invalid={!!errors.purok} {...register("purok")}>
              <option value="">Select purok…</option>
              {PUROK_OPTIONS.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </Select>
          </Field>
          <Field label="ZIP code" htmlFor="h-zip" required error={errors.zipCode?.message}>
            <Input id="h-zip" invalid={!!errors.zipCode} {...register("zipCode")} />
          </Field>
          <Field label="Tenure / household type" htmlFor="h-type" required>
            <Select id="h-type" {...register("householdType")}>
              {["Owned", "Rented", "Shared", "Caretaker"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Field>
          <Field label="Monthly income bracket" htmlFor="h-income" required>
            <Select id="h-income" {...register("incomeBracket")}>
              {["Below ₱10,000", "₱10,000 – ₱20,000", "₱20,001 – ₱40,000", "Above ₱40,000"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Field>
          <Field label="Water source" htmlFor="h-water" required error={errors.waterSource?.message}>
            <Select id="h-water" {...register("waterSource")}>
              {["Maynilad / Manila Water", "Deep Well", "Shared Water Connection"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Field>
          <Field label="Toilet facility" htmlFor="h-toilet" required error={errors.toiletFacility?.message}>
            <Select id="h-toilet" {...register("toiletFacility")}>
              {["Water-sealed", "Shared / Communal", "None"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Field>
          <Field label="Date registered" htmlFor="h-date" required error={errors.dateRegistered?.message}>
            <Input id="h-date" type="date" {...register("dateRegistered")} />
          </Field>
          <Field label="Status" htmlFor="h-status" required>
            <Select id="h-status" {...register("status")}>
              <option>Active</option>
              <option>Inactive</option>
            </Select>
          </Field>
          <Field label="Remarks" htmlFor="h-remarks" className="sm:col-span-2">
            <Textarea id="h-remarks" rows={2} {...register("remarks")} />
          </Field>
        </form>
      </Modal>
    </div>
  );
}
