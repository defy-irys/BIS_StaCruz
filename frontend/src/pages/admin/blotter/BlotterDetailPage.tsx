import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MessageSquarePlus, Workflow } from "lucide-react";
import { blotterService, BLOTTER_STATUSES } from "@/services/blotterService";
import { useAsync } from "@/hooks/useAsync";
import { DetailList, PageHeader } from "@/components/ui/page";
import { Button, Card, CardHeader, Field, Select, Textarea } from "@/components/ui/primitives";
import { ErrorState, InlineLoading, StatusBadge } from "@/components/ui/feedback";
import { Modal } from "@/components/ui/overlay";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { hasPermission, useAuthStore } from "@/store/authStore";
import { toast } from "@/store/toastStore";
import type { BlotterStatus } from "@/types";

export default function BlotterDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const canManage = hasPermission(user, "blotter.manage");

  const [statusOpen, setStatusOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [nextStatus, setNextStatus] = useState<BlotterStatus>("Under Investigation");
  const [note, setNote] = useState("");
  const [working, setWorking] = useState(false);

  const { data, loading, error, reload } = useAsync(() => blotterService.getCase(id), [id]);

  if (loading) {
    return (
      <Card>
        <InlineLoading label="Loading case record…" />
      </Card>
    );
  }
  if (error || !data) {
    return (
      <Card>
        <ErrorState
          title="Unable to load case record"
          description={error ?? "The requested blotter record could not be retrieved."}
          onRetry={reload}
        />
      </Card>
    );
  }

  const c = data;

  const changeStatus = async () => {
    setWorking(true);
    try {
      await blotterService.changeStatus(c.id, nextStatus, note, user?.fullName);
      toast.success("Case status updated", `${c.caseNo} is now ${nextStatus}.`);
      setStatusOpen(false);
      setNote("");
      void reload();
    } catch (e) {
      toast.error("Unable to update status", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setWorking(false);
    }
  };

  const addNote = async () => {
    if (note.trim().length < 3) {
      toast.warning("Note is too short", "Enter at least a few words.");
      return;
    }
    setWorking(true);
    try {
      await blotterService.addNote(c.id, note.trim(), user?.fullName ?? "Staff");
      toast.success("Case note added");
      setNoteOpen(false);
      setNote("");
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
        title={c.caseNo}
        description={`${c.incidentType} · reported ${fmtDate(c.reportedAt)}`}
        breadcrumbs={[
          { label: "BIMS-BIPS", to: "/admin" },
          { label: "Blotter", to: "/admin/blotter" },
          { label: c.caseNo },
        ]}
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate("/admin/blotter")}>
              <ArrowLeft className="h-4 w-4" />
              Back to list
            </Button>
            {canManage && (
              <>
                <Button variant="secondary" onClick={() => setNoteOpen(true)}>
                  <MessageSquarePlus className="h-4 w-4" />
                  Add note
                </Button>
                <Button onClick={() => setStatusOpen(true)}>
                  <Workflow className="h-4 w-4" />
                  Change status
                </Button>
              </>
            )}
          </>
        }
      />

      <div className="flex items-center gap-2">
        <StatusBadge status={c.status} />
        <span className="text-xs text-slate-500">Last updated {fmtDateTime(c.updatedAt)}</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="Case information" />
            <div className="p-4">
              <DetailList
                columns={3}
                items={[
                  { label: "Case number", value: <span className="font-mono">{c.caseNo}</span> },
                  { label: "Incident type", value: c.incidentType },
                  { label: "Status", value: <StatusBadge status={c.status} /> },
                  { label: "Date of incident", value: fmtDate(c.incidentDate) },
                  { label: "Reported at", value: fmtDateTime(c.reportedAt) },
                  { label: "Assigned personnel", value: c.assignedTo },
                  { label: "Location", value: c.location },
                ]}
              />
            </div>
          </Card>

          <Card>
            <CardHeader title="Parties involved" />
            <div className="grid gap-4 p-4 sm:grid-cols-2">
              <div className="rounded-md border border-slate-200 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Complainant</p>
                <p className="mt-1 text-sm font-medium text-slate-900">{c.complainantName}</p>
                <p className="text-xs text-slate-600">{c.complainantContact}</p>
              </div>
              <div className="rounded-md border border-slate-200 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Respondent</p>
                <p className="mt-1 text-sm font-medium text-slate-900">{c.respondentName}</p>
                <p className="text-xs text-slate-600">{c.respondentAddress}</p>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Incident description" />
            <div className="p-4">
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{c.description}</p>
              {c.resolution && (
                <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-800">Resolution</p>
                  <p className="mt-1 text-sm text-emerald-900">{c.resolution}</p>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Case notes" description={`${c.notes.length} note(s) recorded.`} />
            {c.notes.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">No case notes yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {c.notes.map((n) => (
                  <li key={n.id} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-800">{n.author}</p>
                      <span className="text-[11px] text-slate-400">{fmtDateTime(n.at)}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-700">{n.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader title="Status history" description="Chronological workflow trail." />
          <div className="p-4">
            <ol className="relative space-y-4 border-l border-slate-200 pl-4">
              {[...c.history].reverse().map((e) => (
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
        </Card>
      </div>

      <Modal
        open={statusOpen}
        onClose={() => setStatusOpen(false)}
        title="Change case status"
        description={`Current status: ${c.status}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setStatusOpen(false)} disabled={working}>
              Cancel
            </Button>
            <Button onClick={changeStatus} loading={working}>
              Update status
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="New status" htmlFor="new-status" required>
            <Select
              id="new-status"
              value={nextStatus}
              onChange={(e) => setNextStatus(e.target.value as BlotterStatus)}
            >
              {BLOTTER_STATUSES.filter((s) => s !== c.status).map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </Field>
          <Field
            label="Action note"
            htmlFor="status-note"
            hint="Recorded in the case status history."
          >
            <Textarea
              id="status-note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Both parties appeared; amicable settlement reached."
            />
          </Field>
        </div>
      </Modal>

      <Modal
        open={noteOpen}
        onClose={() => setNoteOpen(false)}
        title="Add case note"
        footer={
          <>
            <Button variant="secondary" onClick={() => setNoteOpen(false)} disabled={working}>
              Cancel
            </Button>
            <Button onClick={addNote} loading={working}>
              Save note
            </Button>
          </>
        }
      >
        <Field label="Note" htmlFor="case-note" required>
          <Textarea id="case-note" rows={4} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </Modal>
    </div>
  );
}
