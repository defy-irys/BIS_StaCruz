import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FileBadge, FileCheck2, FileText, Plus } from "lucide-react";
import { certificateService, clearanceService } from "@/services/documentService";
import { useAsync } from "@/hooks/useAsync";
import { Badge, Button, Card } from "@/components/ui/primitives";
import { BarangayLogo } from "@/components/brand/BarangayLogo";
import { Tabs } from "@/components/ui/data";
import { EmptyState, ErrorState, InlineLoading, StatusBadge } from "@/components/ui/feedback";
import { Modal } from "@/components/ui/overlay";
import { fmtDate, fmtPeso } from "@/lib/format";
import { useAuthStore } from "@/store/authStore";
import { BARANGAY } from "@/lib/navigation";

interface DocRecord {
  id: string;
  kind: "Certificate" | "Clearance";
  title: string;
  referenceNo: string;
  status: string;
  issuedAt: string | null;
  orNumber: string;
  fee: number;
  purpose: string;
  residentName: string;
}

export default function PortalDocumentsPage() {
  const user = useAuthStore((s) => s.user);
  const residentId = user?.residentId ?? "";
  const [params] = useSearchParams();
  const [tab, setTab] = useState(params.get("type") === "clearances" ? "clearances" : "all");
  const [preview, setPreview] = useState<DocRecord | null>(null);

  const { data, loading, error, reload } = useAsync(async () => {
    const [certs, clrs] = await Promise.all([
      certificateService.listCertificates({ residentId, pageSize: 50 }),
      clearanceService.listClearances({ residentId, pageSize: 50 }),
    ]);
    const docs: DocRecord[] = [
      ...certs.items.map((c) => ({
        id: c.id,
        kind: "Certificate" as const,
        title: c.certificateType,
        referenceNo: c.referenceNo,
        status: c.status,
        issuedAt: c.issuedAt,
        orNumber: c.orNumber,
        fee: c.fee,
        purpose: c.purpose,
        residentName: c.residentName,
      })),
      ...clrs.items.map((c) => ({
        id: c.id,
        kind: "Clearance" as const,
        title: c.clearanceType,
        referenceNo: c.referenceNo,
        status: c.status,
        issuedAt: c.releasedAt,
        orNumber: c.orNumber,
        fee: c.fee,
        purpose: c.purpose,
        residentName: c.residentName,
      })),
    ].filter((d) => d.status === "Released" || d.status === "Ready for Release");
    return docs.sort((a, b) => (b.issuedAt ?? "").localeCompare(a.issuedAt ?? ""));
  }, [residentId]);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (tab === "certificates") return data.filter((d) => d.kind === "Certificate");
    if (tab === "clearances") return data.filter((d) => d.kind === "Clearance");
    return data;
  }, [data, tab]);

  if (loading) return <InlineLoading label="Loading your documents…" />;
  if (error || !data)
    return <ErrorState title="Unable to load your documents" description={error ?? undefined} onRetry={reload} />;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">My documents</h1>
          <p className="text-xs text-slate-500">Issued and ready-to-claim barangay documents.</p>
        </div>
        <Link to="/portal/requests/new">
          <Button size="sm" variant="secondary">
            <Plus className="h-3.5 w-3.5" />
            Request
          </Button>
        </Link>
      </div>

      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { key: "all", label: "All", count: data.length },
          { key: "certificates", label: "Certificates", count: data.filter((d) => d.kind === "Certificate").length },
          { key: "clearances", label: "Clearances", count: data.filter((d) => d.kind === "Clearance").length },
        ]}
      />

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={FileCheck2}
            title="No documents yet"
            description="Approved and released documents will appear here. Start by filing a request."
            action={
              <Link to="/portal/requests/new">
                <Button size="sm">File a request</Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <ul className="space-y-2">
          {filtered.map((d) => (
            <li key={d.id}>
              <button
                type="button"
                onClick={() => setPreview(d)}
                className="flex w-full items-start gap-2.5 rounded-lg border border-slate-200 bg-white p-3 text-left hover:border-brand-300"
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-700">
                  {d.kind === "Certificate" ? <FileText className="h-4 w-4" /> : <FileBadge className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{d.title}</p>
                  <p className="truncate font-mono text-[11px] text-slate-500">{d.referenceNo}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <StatusBadge status={d.status} />
                    {d.issuedAt && <span className="text-[11px] text-slate-400">Issued {fmtDate(d.issuedAt)}</span>}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={!!preview}
        onClose={() => setPreview(null)}
        title="Document copy (simulated)"
        description="Preview only  claim the signed original at the Barangay Hall."
        size="sm"
      >
        {preview && (
          <div className="space-y-3">
            <div className="rounded-md border border-slate-300 bg-white p-4">
              <div className="border-b border-slate-200 pb-2 text-center">
                <BarangayLogo size={44} className="mx-auto mb-1.5" />
                <p className="text-[9px] uppercase tracking-widest text-slate-500">Republic of the Philippines</p>
                <p className="text-xs font-bold uppercase text-slate-900">{BARANGAY.name}</p>
                <p className="text-[9px] text-slate-500">{BARANGAY.city}</p>
              </div>
              <p className="my-3 text-center text-sm font-bold uppercase text-slate-900">{preview.title}</p>
              <p className="text-xs leading-relaxed text-slate-700">
                This certifies that <span className="font-semibold">{preview.residentName}</span> is a bona fide
                resident of {BARANGAY.name}. Issued for {preview.purpose.toLowerCase()}.
              </p>
              <div className="mt-4 space-y-0.5 text-[10px] text-slate-500">
                <p>Reference: {preview.referenceNo}</p>
                <p>OR no.: {preview.orNumber || " claim at Barangay Hall "}</p>
                <p>Fee: {preview.fee === 0 ? "Free of charge" : fmtPeso(preview.fee)}</p>
              </div>
              <p className="mt-3 rounded border border-amber-200 bg-amber-50 p-1.5 text-center text-[9px] text-amber-800">
                SIMULATED PREVIEW  not an official document.
              </p>
            </div>
            <div className="flex items-center justify-between gap-2">
              <Badge tone="neutral">{preview.kind}</Badge>
              <StatusBadge status={preview.status} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
