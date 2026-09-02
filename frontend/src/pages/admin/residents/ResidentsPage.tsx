import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Eye,
  Filter,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  UserMinus,
  Users,
  X,
} from "lucide-react";
import { residentService } from "@/services/residentService";
import { useAsync, useDebounced } from "@/hooks/useAsync";
import { PageHeader, PrototypeNotice } from "@/components/ui/page";
import { Button, Card, Field, Input, Select } from "@/components/ui/primitives";
import { ActionMenu, Pagination, TableWrap, Td, Th, Tr } from "@/components/ui/data";
import { EmptyState, ErrorState, LoadingState, StatusBadge } from "@/components/ui/feedback";
import { ConfirmDialog } from "@/components/ui/overlay";
import { Textarea } from "@/components/ui/primitives";
import { calcAge, fmtDate } from "@/lib/format";
import { hasPermission, useAuthStore } from "@/store/authStore";
import { toast } from "@/store/toastStore";
import type { Resident, ResidentQuery } from "@/types";
import { PUROK_OPTIONS } from "@/components/domain/ResidentForm";

const emptyFilters: ResidentQuery = {
  status: "",
  sex: "",
  voterStatus: "",
  civilStatus: "",
  purok: "",
  minAge: "",
  maxAge: "",
};

export default function ResidentsPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [search, setSearch] = useState(params.get("search") ?? "");
  const debouncedSearch = useDebounced(search);
  const [filters, setFilters] = useState<ResidentQuery>({ ...emptyFilters });
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState("lastName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [target, setTarget] = useState<Resident | null>(null);
  const [reason, setReason] = useState("");
  const [working, setWorking] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters, pageSize]);

  useEffect(() => {
    const q = params.get("search");
    if (q !== null && q !== search) setSearch(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const query: ResidentQuery = useMemo(
    () => ({ ...filters, search: debouncedSearch, page, pageSize, sortBy, sortDir }),
    [filters, debouncedSearch, page, pageSize, sortBy, sortDir],
  );

  const { data, loading, error, reload } = useAsync(
    () => residentService.listResidents(query),
    [JSON.stringify(query)],
  );

  const canCreate = hasPermission(user, "residents.create");
  const canUpdate = hasPermission(user, "residents.update");
  const canDelete = hasPermission(user, "residents.delete");

  const activeFilterCount = Object.entries(filters).filter(([, v]) => v !== "" && v != null).length;

  const onSort = (key: string) => {
    if (sortBy === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(key);
      setSortDir("asc");
    }
  };

  const confirmDeactivate = async () => {
    if (!target) return;
    setWorking(true);
    try {
      if (target.status === "Active") {
        await residentService.deactivateResident(target.id, reason, user?.fullName);
        toast.success("Resident deactivated", `${target.firstName} ${target.lastName} is now inactive.`);
      } else {
        await residentService.reactivateResident(target.id, user?.fullName);
        toast.success("Resident reactivated", `${target.firstName} ${target.lastName} is active again.`);
      }
      setTarget(null);
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
        title="Resident Records"
        description="Barangay Inhabitant Profiling System  search, review and maintain resident profiles."
        breadcrumbs={[{ label: "BIMS-BIPS", to: "/admin" }, { label: "Residents" }]}
        actions={
          canCreate ? (
            <Link to="/admin/residents/new">
              <Button>
                <Plus className="h-4 w-4" />
                Add resident
              </Button>
            </Link>
          ) : undefined
        }
      />

      <PrototypeNotice compact />

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3">
          <div className="relative min-w-56 flex-1">
            <label htmlFor="resident-search" className="sr-only">
              Search residents
            </label>
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              id="resident-search"
              value={search}
              placeholder="Search by name, resident no., contact or address…"
              className="pl-8"
              onChange={(e) => {
                setSearch(e.target.value);
                const next = new URLSearchParams(params);
                if (e.target.value) next.set("search", e.target.value);
                else next.delete("search");
                setParams(next, { replace: true });
              }}
            />
          </div>
          <Button
            variant={showFilters ? "subtle" : "secondary"}
            onClick={() => setShowFilters((v) => !v)}
            aria-expanded={showFilters}
          >
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="rounded bg-brand-700 px-1.5 text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </Button>
          {(activeFilterCount > 0 || search) && (
            <Button
              variant="ghost"
              onClick={() => {
                setFilters({ ...emptyFilters });
                setSearch("");
                setParams(new URLSearchParams(), { replace: true });
              }}
            >
              <X className="h-4 w-4" />
              Clear
            </Button>
          )}
        </div>

        {showFilters && (
          <div className="grid gap-3 border-b border-slate-200 bg-slate-50 p-3 sm:grid-cols-3 lg:grid-cols-7">
            <Field label="Status" htmlFor="f-status">
              <Select
                id="f-status"
                value={filters.status ?? ""}
                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as ResidentQuery["status"] }))}
              >
                <option value="">All</option>
                {["Active", "Inactive", "Deceased", "Moved Out"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
            </Field>
            <Field label="Sex" htmlFor="f-sex">
              <Select
                id="f-sex"
                value={filters.sex ?? ""}
                onChange={(e) => setFilters((f) => ({ ...f, sex: e.target.value as ResidentQuery["sex"] }))}
              >
                <option value="">All</option>
                <option>Male</option>
                <option>Female</option>
              </Select>
            </Field>
            <Field label="Voter status" htmlFor="f-voter">
              <Select
                id="f-voter"
                value={filters.voterStatus ?? ""}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, voterStatus: e.target.value as ResidentQuery["voterStatus"] }))
                }
              >
                <option value="">All</option>
                <option>Registered</option>
                <option>Not Registered</option>
              </Select>
            </Field>
            <Field label="Civil status" htmlFor="f-civil">
              <Select
                id="f-civil"
                value={filters.civilStatus ?? ""}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, civilStatus: e.target.value as ResidentQuery["civilStatus"] }))
                }
              >
                <option value="">All</option>
                {["Single", "Married", "Widowed", "Separated", "Annulled"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
            </Field>
            <Field label="Purok" htmlFor="f-purok">
              <Select
                id="f-purok"
                value={filters.purok ?? ""}
                onChange={(e) => setFilters((f) => ({ ...f, purok: e.target.value }))}
              >
                <option value="">All</option>
                {PUROK_OPTIONS.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </Select>
            </Field>
            <Field label="Min. age" htmlFor="f-minage">
              <Input
                id="f-minage"
                type="number"
                min={0}
                max={120}
                value={filters.minAge === "" || filters.minAge == null ? "" : filters.minAge}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, minAge: e.target.value === "" ? "" : Number(e.target.value) }))
                }
              />
            </Field>
            <Field label="Max. age" htmlFor="f-maxage">
              <Input
                id="f-maxage"
                type="number"
                min={0}
                max={120}
                value={filters.maxAge === "" || filters.maxAge == null ? "" : filters.maxAge}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, maxAge: e.target.value === "" ? "" : Number(e.target.value) }))
                }
              />
            </Field>
          </div>
        )}

        {loading && <LoadingState label="Loading resident records…" />}
        {error && !loading && (
          <ErrorState title="Unable to load resident records" description={error} onRetry={reload} />
        )}

        {data && !loading && !error && data.items.length === 0 && (
          <EmptyState
            icon={Users}
            title="No residents found"
            description="No resident records match the current search and filter combination."
            action={
              canCreate ? (
                <Link to="/admin/residents/new">
                  <Button size="sm">
                    <Plus className="h-3.5 w-3.5" />
                    Add resident
                  </Button>
                </Link>
              ) : undefined
            }
          />
        )}

        {data && !loading && !error && data.items.length > 0 && (
          <>
            <TableWrap>
              <thead>
                <tr>
                  <Th sortKey="name" activeKey={sortBy} dir={sortDir} onSort={onSort}>
                    Resident
                  </Th>
                  <Th sortKey="birthDate" activeKey={sortBy} dir={sortDir} onSort={onSort} className="hidden lg:table-cell">
                    Birth date
                  </Th>
                  <Th sortKey="age" activeKey={sortBy} dir={sortDir} onSort={onSort} className="w-16">
                    Age
                  </Th>
                  <Th className="w-20">Sex</Th>
                  <Th className="hidden xl:table-cell">Contact</Th>
                  <Th sortKey="purok" activeKey={sortBy} dir={sortDir} onSort={onSort} className="hidden md:table-cell">
                    Address
                  </Th>
                  <Th className="hidden xl:table-cell">Civil status</Th>
                  <Th>Voter</Th>
                  <Th>Status</Th>
                  <Th className="w-12 text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((r) => (
                  <Tr key={r.id} onClick={() => navigate(`/admin/residents/${r.id}`)}>
                    <Td>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">
                          {r.lastName}
                          {r.suffix ? ` ${r.suffix}` : ""}, {r.firstName}
                          {r.middleName ? ` ${r.middleName.charAt(0)}.` : ""}
                        </p>
                        <p className="truncate font-mono text-[11px] text-slate-500">{r.residentNo}</p>
                      </div>
                    </Td>
                    <Td className="hidden whitespace-nowrap lg:table-cell">{fmtDate(r.birthDate)}</Td>
                    <Td className="tabular-nums">{calcAge(r.birthDate)}</Td>
                    <Td>{r.sex}</Td>
                    <Td className="hidden xl:table-cell">
                      <span className="tabular-nums">{r.contactNumber || ""}</span>
                    </Td>
                    <Td className="hidden md:table-cell">
                      <span className="block max-w-52 truncate">
                        {r.address.houseNo} {r.address.street}
                      </span>
                      <span className="text-[11px] text-slate-500">{r.address.purok}</span>
                    </Td>
                    <Td className="hidden xl:table-cell">{r.civilStatus}</Td>
                    <Td>
                      <StatusBadge status={r.voterStatus} />
                    </Td>
                    <Td>
                      <StatusBadge status={r.status} />
                    </Td>
                    <Td className="text-right">
                      <ActionMenu
                        label={`Actions for ${r.firstName} ${r.lastName}`}
                        actions={[
                          {
                            label: "View profile",
                            icon: Eye,
                            onSelect: () => navigate(`/admin/residents/${r.id}`),
                          },
                          {
                            label: "Edit record",
                            icon: Pencil,
                            disabled: !canUpdate,
                            onSelect: () => navigate(`/admin/residents/${r.id}/edit`),
                          },
                          {
                            label: r.status === "Active" ? "Deactivate record" : "Reactivate record",
                            icon: r.status === "Active" ? UserMinus : RotateCcw,
                            danger: r.status === "Active",
                            disabled: !canDelete,
                            onSelect: () => {
                              setTarget(r);
                              setReason("");
                            },
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

      <ConfirmDialog
        open={!!target}
        title={target?.status === "Active" ? "Deactivate resident record?" : "Reactivate resident record?"}
        message={
          target?.status === "Active"
            ? `${target?.firstName} ${target?.lastName} will be marked inactive. The record is retained for auditing  barangay records are never permanently deleted from this module.`
            : `${target?.firstName} ${target?.lastName} will be restored to active status.`
        }
        confirmLabel={target?.status === "Active" ? "Deactivate" : "Reactivate"}
        destructive={target?.status === "Active"}
        loading={working}
        onCancel={() => setTarget(null)}
        onConfirm={confirmDeactivate}
      >
        {target?.status === "Active" && (
          <Field label="Reason / remarks" htmlFor="deactivate-reason">
            <Textarea
              id="deactivate-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Transferred residence to another barangay"
            />
          </Field>
        )}
      </ConfirmDialog>
    </div>
  );
}
