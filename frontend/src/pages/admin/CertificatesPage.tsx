import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckCircle2, FileText, Plus, Printer, Search, XCircle } from "lucide-react";
import {
  certificateService,
  CERTIFICATE_STATUSES,
  CERTIFICATE_TRANSITIONS,
  CERTIFICATE_TYPES,
} from "@/services/documentService";
import { residentService } from "@/services/residentService";
import { useAsync, useDebounced } from "@/hooks/useAsync";
import { DetailList, PageHeader, PrototypeNotice, StatCard } from "@/components/ui/page";
import { BarangayLogo } from "@/components/brand/BarangayLogo";
import { Badge, Button, Card, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { ActionMenu, Pagination, TableWrap, Td, Th, Tr } from "@/components/ui/data";
import { EmptyState, ErrorState, LoadingState, StatusBadge } from "@/components/ui/feedback";
import { Modal } from "@/components/ui/overlay";
import { fmtDate, fmtDateTime, fmtPeso } from "@/lib/format";
import { hasPermission, useAuthStore } from "@/store/authStore";
import { toast } from "@/store/toastStore";
import { BARANGAY } from "@/lib/navigation";
import type { CertificateRequest, CertificateStatus } from "@/types";

export default function CertificatesPage() {
  const user = useAuthStore((s) => s.user);
  const canProcess = hasPermission(user, "certificates.process");
  const [params, setParams] = useSearchParams();

  const [search, setSearch] = useState(params.get("search") ?? "");
  const debounced = useDebounced(search);
  const [status, setStatus] = useState<string>(params.get("status") ?? "");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [selected, setSelected] = useState<CertificateRequest | null>(null);
  const [action, setAction] = useState<{ target: CertificateRequest; to: CertificateStatus } | null>(null);
  const [note, setNote] = useState("");
  const [preview, setPreview] = useState<CertificateRequest | null>(null);
  const [newOpen, setNewOpen] = useState(params.get("new") === "1");
  const [working, setWorking] = useState(false);

  // New (walk-in) request form state
  const [residentSearch, setResidentSearch] = useState("");
  const debouncedResident = useDebounced(residentSearch);
  const [residentId, setResidentId] = useState("");
  const [residentName, setResidentName] = useState("");
  const [certType, setCertType] = useState(CERTIFICATE_TYPES[0]);
  const [purpose, setPurpose] = useState("");
  const [fee, setFee] = useState(50);

  useEffect(() => setPage(1), [debounced, status, type, pageSize]);

  const query = useMemo(
    () => ({ search: debounced, status, type, page, pageSize }),
    [debounced, status, type, page, pageSize],
  );
  const { data, loading, error, reload } = useAsync(
    () => certificateService.listCertificates(query),
    [JSON.stringify(query)],
  );
  const all = useAsync(() => certificateService.listCertificates({ pageSize: 1000 }), []);
  const candidates = useAsync(
    () =>
      debouncedResident.trim().length >= 2
        ? residentService.listResidents({ search: debouncedResident, pageSize: 6, status: "Active" })
        : Promise.resolve(null),
    [debouncedResident],
  );

  const counts = all.data?.items ?? [];

  const runTransition = async () => {
    if (!action) return;
    setWorking(true);
    try {
      await certificateService.transition(action.target.id, action.to, note, user?.fullName);
      toast.success(
        action.to === "Rejected" ? "Request rejected" : `Request marked ${action.to}`,
        `${action.target.referenceNo}  ${action.target.certificateType}`,
      );
      setAction(null);
      setNote("");
      setSelected(null);
      void reload();
      void all.reload();
    } catch (e) {
      toast.error("Unable to update request", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setWorking(false);
    }
  };

  const createWalkIn = async () => {
    if (!residentId) {
      toast.warning("Select a resident", "Search for the requesting resident first.");
      return;
    }
    if (purpose.trim().length < 4) {
      toast.warning("Purpose required", "State the purpose of the certificate request.");
      return;
    }
    setWorking(true);
    try {
      const created = await certificateService.createRequest(
        { residentId, residentName, certificateType: certType, purpose, channel: "Walk-in", fee },
        user?.fullName,
      );
      toast.success("Request created successfully", `${created.referenceNo} was filed.`);
      setNewOpen(false);
      setResidentId("");
      setResidentName("");
      setResidentSearch("");
      setPurpose("");
      const next = new URLSearchParams(params);
      next.delete("new");
      setParams(next, { replace: true });
      void reload();
      void all.reload();
    } catch (e) {
      toast.error("Operation failed", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Certificate Requests"
        description="Request → review → approve → issue workflow for barangay-issued certificates."
        breadcrumbs={[{ label: "BIMS-BIPS", to: "/admin" }, { label: "Certificates" }]}
        actions={
          canProcess ? (
            <Button onClick={() => setNewOpen(true)}>
              <Plus className="h-4 w-4" />
              New walk-in request
            </Button>
          ) : undefined
        }
      />

      <PrototypeNotice compact />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Total requests" value={counts.length} icon={FileText} />
        <StatCard label="Under review" value={counts.filter((c) => c.status === "Under Review").length} tone="brand" />
        <StatCard label="Awaiting release" value={counts.filter((c) => c.status === "Ready for Release").length} tone="amber" />
        <StatCard label="Released" value={counts.filter((c) => c.status === "Released").length} tone="emerald" />
        <StatCard label="Rejected" value={counts.filter((c) => c.status === "Rejected").length} tone="red" />
      </div>

      <Card>
        <div className="flex flex-wrap items-end gap-2 border-b border-slate-200 p-3">
          <div className="relative min-w-56 flex-1">
            <label htmlFor="cert-search" className="sr-only">
              Search certificate requests
            </label>
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              id="cert-search"
              className="pl-8"
              placeholder="Search by reference no., resident or purpose…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Field label="Status" htmlFor="cert-status" className="w-48">
            <Select id="cert-status" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              {CERTIFICATE_STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </Field>
          <Field label="Certificate type" htmlFor="cert-type" className="w-64">
            <Select id="cert-type" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">All types</option>
              {CERTIFICATE_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Field>
        </div>

        {loading && <LoadingState label="Loading certificate requests…" />}
        {error && !loading && <ErrorState title="Unable to load certificate requests" description={error} onRetry={reload} />}
        {data && !loading && !error && data.items.length === 0 && (
          <EmptyState icon={FileText} title="No certificate requests found" description="No requests match the current filters." />
        )}

        {data && !loading && !error && data.items.length > 0 && (
          <>
            <TableWrap>
              <thead>
                <tr>
                  <Th>Reference no.</Th>
                  <Th>Requester</Th>
                  <Th className="hidden lg:table-cell">Certificate type</Th>
                  <Th className="hidden xl:table-cell">Purpose</Th>
                  <Th className="hidden md:table-cell">Requested</Th>
                  <Th className="hidden xl:table-cell">Channel</Th>
                  <Th>Status</Th>
                  <Th className="hidden lg:table-cell">Issued</Th>
                  <Th className="w-12 text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((c) => (
                  <Tr key={c.id} onClick={() => setSelected(c)}>
                    <Td className="font-mono text-xs font-semibold text-slate-800">{c.referenceNo}</Td>
                    <Td className="font-medium text-slate-800">{c.residentName}</Td>
                    <Td className="hidden lg:table-cell">{c.certificateType}</Td>
                    <Td className="hidden xl:table-cell">
                      <span className="block max-w-48 truncate">{c.purpose}</span>
                    </Td>
                    <Td className="hidden whitespace-nowrap md:table-cell">{fmtDate(c.requestedAt)}</Td>
                    <Td className="hidden xl:table-cell">
                      <Badge tone={c.channel === "Resident Portal" ? "info" : "neutral"}>{c.channel}</Badge>
                    </Td>
                    <Td>
                      <StatusBadge status={c.status} />
                    </Td>
                    <Td className="hidden whitespace-nowrap lg:table-cell">{c.issuedAt ? fmtDate(c.issuedAt) : ""}</Td>
                    <Td className="text-right">
                      <ActionMenu
                        label={`Actions for ${c.referenceNo}`}
                        actions={[
                          { label: "View request", icon: FileText, onSelect: () => setSelected(c) },
                          { label: "Document preview", icon: Printer, onSelect: () => setPreview(c) },
                          ...CERTIFICATE_TRANSITIONS[c.status].map((to) => ({
                            label: `Mark as ${to}`,
                            icon: to === "Rejected" ? XCircle : CheckCircle2,
                            danger: to === "Rejected",
                            disabled: !canProcess,
                            onSelect: () => {
                              setAction({ target: c, to });
                              setNote("");
                            },
                          })),
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

      {/* Request detail */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.certificateType}` : "Request"}
        description={selected?.referenceNo}
        size="lg"
        footer={
          selected && (
            <>
              <Button variant="secondary" onClick={() => setPreview(selected)}>
                <Printer className="h-4 w-4" />
                Document preview
              </Button>
              {canProcess &&
                CERTIFICATE_TRANSITIONS[selected.status].map((to) => (
                  <Button
                    key={to}
                    variant={to === "Rejected" ? "danger" : "primary"}
                    onClick={() => {
                      setAction({ target: selected, to });
                      setNote("");
                    }}
                  >
                    Mark as {to}
                  </Button>
                ))}
            </>
          )
        }
      >
        {selected && (
          <div className="space-y-4">
            <DetailList
              items={[
                { label: "Reference no.", value: <span className="font-mono">{selected.referenceNo}</span> },
                { label: "Status", value: <StatusBadge status={selected.status} /> },
                { label: "Requester", value: selected.residentName },
                { label: "Certificate type", value: selected.certificateType },
                { label: "Purpose", value: selected.purpose },
                { label: "Channel", value: selected.channel },
                { label: "Date requested", value: fmtDateTime(selected.requestedAt) },
                { label: "Date issued", value: selected.issuedAt ? fmtDateTime(selected.issuedAt) : "" },
                { label: "Processing fee", value: fmtPeso(selected.fee) },
                { label: "OR number", value: selected.orNumber || "" },
                { label: "Processed by", value: selected.processedBy || "" },
                { label: "Remarks", value: selected.remarks || "" },
              ]}
            />
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Workflow history</h4>
              <ol className="relative space-y-3 border-l border-slate-200 pl-4">
                {[...selected.history].reverse().map((e) => (
                  <li key={e.id} className="relative">
                    <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-brand-600" />
                    <p className="text-sm font-medium text-slate-800">
                      {e.from} → {e.to}
                    </p>
                    <p className="text-xs text-slate-600">{e.note}</p>
                    <p className="text-[11px] text-slate-400">
                      {e.actor} · {fmtDateTime(e.at)}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </Modal>

      {/* Transition confirmation */}
      <Modal
        open={!!action}
        onClose={() => setAction(null)}
        title={action ? `Mark request as ${action.to}` : ""}
        description={action?.target.referenceNo}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAction(null)} disabled={working}>
              Cancel
            </Button>
            <Button variant={action?.to === "Rejected" ? "danger" : "primary"} onClick={runTransition} loading={working}>
              Confirm
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            The requester will be notified of this status change in the resident portal.
          </p>
          <Field
            label={action?.to === "Rejected" ? "Reason for rejection" : "Action note"}
            htmlFor="transition-note"
            required={action?.to === "Rejected"}
          >
            <Textarea id="transition-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </div>
      </Modal>

      {/* Simulated document preview */}
      <Modal
        open={!!preview}
        onClose={() => setPreview(null)}
        title="Document preview (simulated)"
        description="Layout mock-up only  this prototype does not produce legally valid documents."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPreview(null)}>
              Close
            </Button>
            <Button onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              Print preview
            </Button>
          </>
        }
      >
        {preview && (
          <div className="print-area rounded-md border border-slate-300 bg-white p-8">
            <div className="border-b border-slate-300 pb-4 text-center">
              <BarangayLogo size={64} className="mx-auto mb-2" />
              <p className="text-[11px] uppercase tracking-widest text-slate-500">Republic of the Philippines</p>
              <p className="text-[11px] uppercase tracking-widest text-slate-500">
                {BARANGAY.city} · {BARANGAY.region}
              </p>
              <h3 className="mt-1 text-base font-bold uppercase text-slate-900">{BARANGAY.name}</h3>
              <p className="text-[11px] text-slate-500">Office of the Punong Barangay</p>
            </div>
            <h4 className="my-6 text-center text-lg font-bold uppercase tracking-wide text-slate-900">
              {preview.certificateType}
            </h4>
            <div className="space-y-4 text-sm leading-relaxed text-slate-700">
              <p>TO WHOM IT MAY CONCERN:</p>
              <p>
                This is to certify that <span className="font-semibold">{preview.residentName}</span> is a bona
                fide resident of {BARANGAY.name}, {BARANGAY.city}, based on the records of the Barangay
                Inhabitant Profiling System.
              </p>
              <p>
                This certification is issued upon the request of the above-named person for{" "}
                <span className="font-semibold">{preview.purpose.toLowerCase()}</span>.
              </p>
              <p>
                Issued this {fmtDate(preview.issuedAt ?? preview.requestedAt, "do 'day of' MMMM, yyyy")} at{" "}
                {BARANGAY.name}, {BARANGAY.city}.
              </p>
            </div>
            <div className="mt-10 flex items-end justify-between">
              <div className="text-[11px] text-slate-500">
                <p>Reference no.: {preview.referenceNo}</p>
                <p>OR no.: {preview.orNumber || " not yet issued "}</p>
                <p>Fee: {fmtPeso(preview.fee)}</p>
              </div>
              <div className="text-center">
                <p className="border-t border-slate-400 px-8 pt-1 text-sm font-semibold text-slate-800">
                  Rodrigo T. Panganiban
                </p>
                <p className="text-[11px] text-slate-500">Punong Barangay</p>
              </div>
            </div>
            <p className="mt-8 rounded border border-amber-200 bg-amber-50 p-2 text-center text-[10px] text-amber-800">
              SIMULATED PREVIEW  prototype output, not an official barangay document.
            </p>
          </div>
        )}
      </Modal>

      {/* Walk-in request */}
      <Modal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        title="New walk-in certificate request"
        description="File a request on behalf of a resident at the barangay front desk."
        footer={
          <>
            <Button variant="secondary" onClick={() => setNewOpen(false)} disabled={working}>
              Cancel
            </Button>
            <Button onClick={createWalkIn} loading={working}>
              File request
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Search resident" htmlFor="cert-resident" required hint="Type at least 2 characters.">
            <Input
              id="cert-resident"
              value={residentSearch}
              onChange={(e) => setResidentSearch(e.target.value)}
              placeholder="Name or resident number…"
            />
          </Field>
          {candidates.data && candidates.data.items.length > 0 && (
            <ul className="max-h-44 divide-y divide-slate-100 overflow-y-auto rounded-md border border-slate-200">
              {candidates.data.items.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setResidentId(r.id);
                      setResidentName(`${r.firstName} ${r.lastName}`);
                    }}
                    className={`flex w-full items-center justify-between px-3 py-2 text-left hover:bg-slate-50 ${
                      residentId === r.id ? "bg-brand-50" : ""
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-slate-800">
                        {r.lastName}, {r.firstName}
                      </span>
                      <span className="block text-[11px] text-slate-500">
                        {r.residentNo} · {r.address.purok}
                      </span>
                    </span>
                    {residentId === r.id && <Badge tone="brand">Selected</Badge>}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Field label="Certificate type" htmlFor="cert-new-type" required>
            <Select id="cert-new-type" value={certType} onChange={(e) => setCertType(e.target.value)}>
              {CERTIFICATE_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Field>
          <Field label="Purpose" htmlFor="cert-purpose" required>
            <Input
              id="cert-purpose"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g. Employment requirement"
            />
          </Field>
          <Field label="Processing fee (₱)" htmlFor="cert-fee" required>
            <Input id="cert-fee" type="number" min={0} value={fee} onChange={(e) => setFee(Number(e.target.value))} />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
