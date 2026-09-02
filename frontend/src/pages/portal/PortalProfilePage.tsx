import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Home, Info, Save, ShieldCheck } from "lucide-react";
import { residentService } from "@/services/residentService";
import { useAsync } from "@/hooks/useAsync";
import { DetailList } from "@/components/ui/page";
import { Button, Card, CardHeader, Field, Input } from "@/components/ui/primitives";
import { ErrorState, InlineLoading, StatusBadge } from "@/components/ui/feedback";
import { calcAge, fmtDate, formatAddress } from "@/lib/format";
import { useAuthStore } from "@/store/authStore";
import { toast } from "@/store/toastStore";

const schema = z.object({
  contactNumber: z
    .string()
    .regex(/^(09\d{9}|\+639\d{9})$/, "Use a valid PH mobile number, e.g. 09171234567."),
  email: z.string().email("Enter a valid email address.").optional().or(z.literal("")),
  occupation: z.string().max(80).optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

export default function PortalProfilePage() {
  const user = useAuthStore((s) => s.user);
  const residentId = user?.residentId ?? "";
  const [saving, setSaving] = useState(false);

  const { data, loading, error, reload } = useAsync(
    () => residentService.getResident(residentId),
    [residentId],
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: data
      ? { contactNumber: data.contactNumber, email: data.email, occupation: data.occupation }
      : undefined,
  });

  if (loading) return <InlineLoading label="Loading your profile…" />;
  if (error || !data)
    return <ErrorState title="Unable to load your profile" description={error ?? undefined} onRetry={reload} />;

  const r = data;

  const onSubmit = async (values: FormValues) => {
    setSaving(true);
    try {
      await residentService.updateResident(
        r.id,
        { contactNumber: values.contactNumber, email: values.email ?? "", occupation: values.occupation ?? "" },
        `${r.firstName} ${r.lastName} (resident portal)`,
      );
      toast.success("Profile updated", "Your contact details were submitted to the barangay records office.");
      reset(values);
      void reload();
    } catch (e) {
      toast.error("Update failed", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">My profile</h1>
        <p className="text-xs text-slate-500">
          Your record in the Barangay Inhabitant Profiling System.
        </p>
      </div>

      <Card>
        <div className="flex items-center gap-3 p-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-700 text-sm font-bold text-white">
            {r.firstName[0]}
            {r.lastName[0]}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">
              {r.firstName} {r.middleName ? r.middleName.charAt(0) + ". " : ""}
              {r.lastName}
            </p>
            <p className="truncate font-mono text-[11px] text-slate-500">{r.residentNo}</p>
          </div>
          <div className="ml-auto">
            <StatusBadge status={r.status} />
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Personal information" description="Managed by the barangay records office." />
        <div className="p-3">
          <DetailList
            columns={1}
            items={[
              { label: "Date of birth", value: `${fmtDate(r.birthDate)} (${calcAge(r.birthDate)} years old)` },
              { label: "Sex", value: r.sex },
              { label: "Civil status", value: r.civilStatus },
              { label: "Nationality", value: r.nationality },
              { label: "Voter status", value: <StatusBadge status={r.voterStatus} /> },
              { label: "Address", value: formatAddress(r.address) },
            ]}
          />
          <p className="mt-3 flex items-start gap-1.5 rounded-md border border-slate-200 bg-slate-50 p-2.5 text-[11px] text-slate-600">
            <Info className="mt-0.5 h-3 w-3 shrink-0" />
            Corrections to your name, birth date or civil status must be requested in person at the Barangay
            Hall with supporting documents.
          </p>
        </div>
      </Card>

      <Card>
        <CardHeader title="Editable details" description="You may update your contact information." />
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 p-3" noValidate>
          <Field label="Mobile number" htmlFor="p-contact" required error={errors.contactNumber?.message}>
            <Input
              id="p-contact"
              inputMode="tel"
              className="h-11"
              invalid={!!errors.contactNumber}
              {...register("contactNumber")}
            />
          </Field>
          <Field label="Email address" htmlFor="p-email" error={errors.email?.message}>
            <Input id="p-email" type="email" className="h-11" invalid={!!errors.email} {...register("email")} />
          </Field>
          <Field label="Occupation" htmlFor="p-occupation" error={errors.occupation?.message}>
            <Input id="p-occupation" className="h-11" {...register("occupation")} />
          </Field>
          <Button type="submit" size="lg" className="w-full" loading={saving} disabled={!isDirty}>
            <Save className="h-4 w-4" />
            Save changes
          </Button>
        </form>
      </Card>

      <Link
        to="/portal/household"
        className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white p-3"
      >
        <Home className="h-4 w-4 text-brand-700" />
        <span className="flex-1 text-sm font-medium text-slate-800">View my household</span>
        <span className="text-xs text-slate-400">›</span>
      </Link>

      <div className="flex items-start gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-600">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
        <p>
          Signed in as <span className="font-medium">{user?.username}</span> ({user?.roleName}). Resident
          accounts cannot access administrative modules.
        </p>
      </div>
    </div>
  );
}
