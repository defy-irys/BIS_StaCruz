import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FileBadge, FileText, Plus } from "lucide-react";
import { certificateService, clearanceService } from "@/services/documentService";
import { useAsync } from "@/hooks/useAsync";
import { Badge, Button, Card } from "@/components/ui/primitives";
import { Tabs } from "@/components/ui/data";
import { EmptyState, ErrorState, InlineLoading, StatusBadge } from "@/components/ui/feedback";
import { Modal } from "@/components/ui/overlay";
import { fmtDate, fmtDateTime, fmtPeso } from "@/lib/format";
import { useAuthStore } from "@/store/authStore";

type UnifiedRequest = {
  id: string;
  kind: "Certificate" | "Clearance";
  referenceNo: string;
  title: string;
  purpose: string;
  status: string;
  requestedAt: string;
  completedAt: string | null;
  fee: number;
  orNumber: string;
  remarks: string;
  history: { id: string; at: string; from: string; to: string; actor: string; note: string }[];
};

const CERT_STEPS = ["Submitted", "Under Review", "Approved", "Ready for Release", "Released"];
const CLR_STEPS = ["Pending", "Approved", "Released"];

export default function PortalRequestsPage() {
  const user = useAuthStore((s) => s.user);
  const residentId = user?.residentId ?? "";
  const [tab, setTab] = useState("all");
  const [selected, setSelected] = useState<UnifiedRequest | null>(null);

  const { data, loading, error, reload } = useAsync(async () => {
    const [certs, clrs] = await Promise.all([
      certificateService.listCertificates({ residentId, pageSize: 50 }),
      clearanceService.listClearances({ residentId, pageSize: 50 }),
    ]);
    const unified: UnifiedRequest[] = [
      ...certs.items.map((c) => ({
        id: c.id,
        kind: "Certificate" as const,
        referenceNo: c.referenceNo,
        title: c.certificateType,
        purpose: c.purpose,
        status: c.status,
        requestedAt: c.requestedAt,
        completedAt: c.issuedAt,
        fee: c.fee,
        orNumber: c.orNumber,
        remarks: c.remarks,
        history: c.history,
      })),
      ...clrs.items.map((c) => ({
        id: c.id,
        kind: "Clearance" as const,
        referenceNo: c.referenceNo,
        title: c.clearanceType,
        purpose: c.purpose,
        status: c.status,
        requestedAt: c.requestedAt,
        completedAt: c.releasedAt,
        fee: c.fee,
        orNumber: c.orNumber,
        remarks: c.remarks,
        history: c.history,
      })),
    ].sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
    return unified;
  }, [residentId]);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (tab === "active") return data.filter((r) => !["Released", "Rejected"].includes(r.status));
    if (tab === "completed") return data.filter((r) => ["Released", "Rejected"].includes(r.status));
    return data;
  }, [data, tab]);

  if (loading) return <InlineLoading label="Loading your requests…" />;
  if (error || !data)
    return <ErrorState title="Unable to load your requests" description={error ?? undefined} onRetry={reload} />;

  const steps = selected?.kind === "Certificate" ? CERT_STEPS : CLR_STEPS;
  const currentStep = selected ? steps.indexOf(selected.status) : -1;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">My requests</h1>
          <p className="text-xs text-slate-500">Track the status of documents you have requested.</p>
        </div>
        <Link to="/portal/requests/new">
          <Button size="sm">
            <Plus className="h-3.5 w-3.5" />
            New
          </Button>
        </Link>
      </div>

      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { key: "all", label: "All", count: data.length },
          { key: "active", label: "In progress", count: data.filter((r) => !["Released", "Rejected"].includes(r.status)).length },
          { key: "completed", label: "Completed", count: data.filter((r) => ["Released", "Rejected"].includes(r.status)).length },
        ]}
      />

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={FileText}
            title="No requests yet"
            description="When you request a certificate or clearance, it will appear here with its current status."
            action={
              <Link to="/portal/requests/new">
                <Button size="sm">File a request</Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <ul className="space-y-2">
          {filtered.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => setSelected(r)}
                className="w-full rounded-lg border border-slate-200 bg-white p-3 text-left hover:border-brand-300"
              >
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-700">
                    {r.kind === "Certificate" ? <FileText className="h-4 w-4" /> : <FileBadge className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{r.title}</p>
                    <p className="truncate font-mono text-[11px] text-slate-500">{r.referenceNo}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">{r.purpose}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <StatusBadge status={r.status} />
                      <Badge tone="neutral">{r.kind}</Badge>
                      <span className="text-[11px] text-slate-400">Filed {fmtDate(r.requestedAt)}</span>
                    </div>
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.title ?? ""}
        description={selected?.referenceNo}
        size="sm"
      >
        {selected && (
          <div className="space-y-4">
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Current status</p>
              <div className="mt-1">
                <StatusBadge status={selected.status} />
              </div>
              {selected.remarks && <p className="mt-2 text-xs text-slate-600">{selected.remarks}</p>}
            </div>

            {selected.status !== "Rejected" && (
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Progress</p>
                <ol className="space-y-2">
                  {steps.map((s, i) => {
                    const done = currentStep >= i;
                    return (
                      <li key={s} className="flex items-center gap-2.5">
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${
                            done ? "border-brand-700 bg-brand-700 text-white" : "border-slate-300 bg-white text-slate-400"
                          }`}
                        >
                          {i + 1}
                        </span>
                        <span className={`text-sm ${done ? "font-medium text-slate-800" : "text-slate-400"}`}>{s}</span>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}

            <dl className="space-y-1.5 text-xs">
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Purpose</dt>
                <dd className="text-right text-slate-800">{selected.purpose}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Date filed</dt>
                <dd className="text-slate-800">{fmtDate(selected.requestedAt)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-slate-500">Fee</dt>
                <dd className="text-slate-800">{fmtPeso(selected.fee)}</dd>
              </div>
              {selected.orNumber && (
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">OR number</dt>
                  <dd className="font-mono text-slate-800">{selected.orNumber}</dd>
                </div>
              )}
            </dl>

            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">History</p>
              <ol className="relative space-y-3 border-l border-slate-200 pl-3.5">
                {[...selected.history].reverse().map((e) => (
                  <li key={e.id} className="relative">
                    <span className="absolute -left-[19px] top-1 h-2 w-2 rounded-full border-2 border-white bg-brand-600" />
                    <p className="text-xs font-medium text-slate-800">{e.to}</p>
                    <p className="text-[11px] text-slate-500">{e.note}</p>
                    <p className="text-[10px] text-slate-400">{fmtDateTime(e.at)}</p>
                  </li>
                ))}
              </ol>
            </div>

            {selected.status === "Ready for Release" && (
              <p className="rounded-md border border-violet-200 bg-violet-50 p-2.5 text-[11px] text-violet-900">
                Your document is ready. Please claim it at the Barangay Hall and present a valid ID.
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
