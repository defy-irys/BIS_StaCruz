import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { residentService } from "@/services/residentService";
import { householdService } from "@/services/householdService";
import { useAsync } from "@/hooks/useAsync";
import { PageHeader } from "@/components/ui/page";
import { Card } from "@/components/ui/primitives";
import { ErrorState, InlineLoading } from "@/components/ui/feedback";
import ResidentForm, { toResidentInput, type ResidentFormValues } from "@/components/domain/ResidentForm";
import { useAuthStore } from "@/store/authStore";
import { toast } from "@/store/toastStore";

export default function ResidentFormPage({ mode }: { mode: "create" | "edit" }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [submitting, setSubmitting] = useState(false);

  const { data, loading, error, reload } = useAsync(async () => {
    const [households, resident] = await Promise.all([
      householdService.lookup(),
      mode === "edit" && id ? residentService.getResident(id) : Promise.resolve(null),
    ]);
    return { households, resident };
  }, [mode, id]);

  const handleSubmit = async (values: ResidentFormValues) => {
    setSubmitting(true);
    try {
      const payload = toResidentInput(values);
      if (mode === "create") {
        const created = await residentService.createResident(payload, user?.fullName);
        toast.success(
          "Resident created successfully",
          `${created.firstName} ${created.lastName} was registered as ${created.residentNo}.`,
        );
        navigate(`/admin/residents/${created.id}`, { replace: true });
      } else if (id) {
        const updated = await residentService.updateResident(id, payload, user?.fullName);
        toast.success("Resident updated successfully", `Changes to ${updated.residentNo} were saved.`);
        navigate(`/admin/residents/${id}`, { replace: true });
      }
    } catch (e) {
      toast.error("Operation failed", e instanceof Error ? e.message : "Please review the form and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title={mode === "create" ? "Register new resident" : "Edit resident record"}
        description={
          mode === "create"
            ? "Encode a new inhabitant profile into the Barangay Inhabitant Profiling System."
            : "Update the stored profile. All changes are recorded in the activity log."
        }
        breadcrumbs={[
          { label: "BIMS-BIPS", to: "/admin" },
          { label: "Residents", to: "/admin/residents" },
          { label: mode === "create" ? "New record" : data?.resident ? `${data.resident.residentNo}` : "Edit" },
        ]}
      />

      {loading && (
        <Card>
          <InlineLoading label="Preparing form…" />
        </Card>
      )}

      {error && !loading && (
        <Card>
          <ErrorState title="Unable to load the form" description={error} onRetry={reload} />
        </Card>
      )}

      {data && !loading && !error && (
        <ResidentForm
          resident={data.resident}
          households={data.households}
          submitting={submitting}
          onSubmit={handleSubmit}
          onCancel={() =>
            navigate(mode === "edit" && id ? `/admin/residents/${id}` : "/admin/residents")
          }
        />
      )}
    </div>
  );
}
