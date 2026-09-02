import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, FileBadge, FileText, Send } from "lucide-react";
import {
  CERTIFICATE_TYPES,
  CLEARANCE_TYPES,
  certificateService,
  clearanceService,
} from "@/services/documentService";
import { residentService } from "@/services/residentService";
import { useAsync } from "@/hooks/useAsync";
import { Button, Card, CardHeader, Field, Select, Textarea } from "@/components/ui/primitives";
import { ErrorState, InlineLoading } from "@/components/ui/feedback";
import { fmtPeso } from "@/lib/format";
import { useAuthStore } from "@/store/authStore";
import { toast } from "@/store/toastStore";
import { cn } from "@/utils/cn";

const CERT_FEES: Record<string, number> = {
  "Certificate of Residency": 50,
  "Certificate of Indigency": 0,
  "Certificate of Good Moral Character": 75,
  "Barangay Business Certificate": 130,
  "Certificate of Live-in Partnership": 75,
  "First Time Job Seeker Certificate": 0,
};

const CLR_FEES: Record<string, number> = {
  "Barangay Clearance": 100,
  "Business Permit Clearance": 200,
  "Barangay ID Clearance": 50,
  "Building Permit Endorsement": 150,
  "Work Requirement Clearance": 100,
};

export default function PortalNewRequestPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const residentId = user?.residentId ?? "";

  const [kind, setKind] = useState<"certificate" | "clearance">(
    params.get("type") === "clearance" ? "clearance" : "certificate",
  );
  const [docType, setDocType] = useState(CERTIFICATE_TYPES[0]);
  const [purpose, setPurpose] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const resident = useAsync(() => residentService.getResident(residentId), [residentId]);

  if (resident.loading) return <InlineLoading label="Preparing request form…" />;
  if (resident.error || !resident.data)
    return (
      <ErrorState
        title="Unable to open the request form"
        description={resident.error ?? undefined}
        onRetry={resident.reload}
      />
    );

  const r = resident.data;
  const types = kind === "certificate" ? CERTIFICATE_TYPES : CLEARANCE_TYPES;
  const fee = kind === "certificate" ? (CERT_FEES[docType] ?? 50) : (CLR_FEES[docType] ?? 100);

  const switchKind = (next: "certificate" | "clearance") => {
    setKind(next);
    setDocType(next === "certificate" ? CERTIFICATE_TYPES[0] : CLEARANCE_TYPES[0]);
    setError(null);
  };

  const submit = async () => {
    if (purpose.trim().length < 5) {
      setError("Please describe the purpose of your request (at least 5 characters).");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const name = `${r.firstName} ${r.lastName}`;
      if (kind === "certificate") {
        const created = await certificateService.createRequest(
          {
            residentId: r.id,
            residentName: name,
            certificateType: docType,
            purpose: purpose.trim(),
            channel: "Resident Portal",
            fee,
          },
          name,
        );
        toast.success("Request submitted", `Reference ${created.referenceNo}. You will be notified of updates.`);
      } else {
        const created = await clearanceService.createRequest(
          {
            residentId: r.id,
            residentName: name,
            clearanceType: docType,
            purpose: purpose.trim(),
            channel: "Resident Portal",
            fee,
          },
          name,
        );
        toast.success("Request submitted", `Reference ${created.referenceNo}. You will be notified of updates.`);
      }
      navigate("/portal/requests");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Your request could not be submitted.";
      setError(message);
      toast.error("Submission failed", message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Link to="/portal/requests" className="inline-flex items-center gap-1 text-xs font-medium text-brand-700">
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to my requests
      </Link>

      <div>
        <h1 className="text-lg font-semibold text-slate-900">New request</h1>
        <p className="text-xs text-slate-500">
          Requests filed here are received by the barangay records office for review.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {(
          [
            { key: "certificate" as const, label: "Certificate", icon: FileText },
            { key: "clearance" as const, label: "Clearance", icon: FileBadge },
          ]
        ).map((o) => (
          <button
            key={o.key}
            type="button"
            onClick={() => switchKind(o.key)}
            aria-pressed={kind === o.key}
            className={cn(
              "flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg border p-3",
              kind === o.key
                ? "border-brand-600 bg-brand-50 text-brand-800"
                : "border-slate-200 bg-white text-slate-600",
            )}
          >
            <o.icon className="h-5 w-5" />
            <span className="text-sm font-medium">{o.label}</span>
          </button>
        ))}
      </div>

      <Card>
        <CardHeader title="Request details" />
        <div className="space-y-3 p-3">
          <Field label="Requesting resident" htmlFor="req-name">
            <input
              id="req-name"
              readOnly
              value={`${r.firstName} ${r.lastName} · ${r.residentNo}`}
              className="h-11 w-full rounded-md border border-slate-300 bg-slate-50 px-2.5 text-sm text-slate-600"
            />
          </Field>

          <Field label={kind === "certificate" ? "Certificate type" : "Clearance type"} htmlFor="req-type" required>
            <Select id="req-type" className="h-11" value={docType} onChange={(e) => setDocType(e.target.value)}>
              {types.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Field>

          <Field
            label="Purpose of request"
            htmlFor="req-purpose"
            required
            error={error ?? undefined}
            hint="e.g. Employment requirement, scholarship application, bank transaction"
          >
            <Textarea
              id="req-purpose"
              rows={4}
              value={purpose}
              invalid={!!error}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="Describe why you need this document…"
            />
          </Field>

          <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
            <span className="text-xs text-slate-600">Estimated fee</span>
            <span className="text-sm font-semibold text-slate-900">
              {fee === 0 ? "Free of charge" : fmtPeso(fee)}
            </span>
          </div>

          <Button size="lg" className="w-full" onClick={submit} loading={submitting}>
            <Send className="h-4 w-4" />
            Submit request
          </Button>

          <p className="text-[11px] leading-relaxed text-slate-500">
            Processing normally takes 1–3 working days. Fees are paid at the Barangay Hall upon release. This is a
            prototype  no actual document will be produced.
          </p>
        </div>
      </Card>
    </div>
  );
}
