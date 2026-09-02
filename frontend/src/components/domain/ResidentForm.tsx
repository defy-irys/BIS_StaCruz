import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Save, X } from "lucide-react";
import { Button, Card, CardHeader, Checkbox, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { ConfirmDialog } from "@/components/ui/overlay";
import type { HouseholdWithStats, Resident, ResidentInput } from "@/types";

export const residentSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters."),
  middleName: z.string().max(60).optional().or(z.literal("")),
  lastName: z.string().min(2, "Last name must be at least 2 characters."),
  suffix: z.string().max(10).optional().or(z.literal("")),
  birthDate: z
    .string()
    .min(1, "Date of birth is required.")
    .refine((v) => new Date(v) <= new Date(), "Date of birth cannot be in the future.")
    .refine((v) => new Date(v) > new Date("1900-01-01"), "Enter a valid date of birth."),
  birthPlace: z.string().optional().or(z.literal("")),
  sex: z.enum(["Male", "Female"], { message: "Select the resident's sex." }),
  civilStatus: z.enum(["Single", "Married", "Widowed", "Separated", "Annulled"]),
  contactNumber: z
    .string()
    .min(1, "Contact number is required.")
    .regex(/^(09\d{9}|\+639\d{9}|\(0\d{2}\)\s?\d{3}-?\d{4})$/, "Use a valid PH mobile number, e.g. 09171234567."),
  email: z.string().email("Enter a valid email address.").optional().or(z.literal("")),
  houseNo: z.string().min(1, "House / unit number is required."),
  street: z.string().min(2, "Street is required."),
  purok: z.string().min(1, "Select a purok."),
  barangay: z.string().min(1),
  city: z.string().min(1),
  province: z.string().min(1),
  zipCode: z.string().min(4, "ZIP code is required."),
  householdId: z.string().optional().or(z.literal("")),
  relationshipToHead: z.string().optional().or(z.literal("")),
  occupation: z.string().optional().or(z.literal("")),
  employmentStatus: z.enum([
    "Employed",
    "Self-employed",
    "Unemployed",
    "Student",
    "Retired",
    "Homemaker",
  ]),
  voterStatus: z.enum(["Registered", "Not Registered"]),
  precinctNo: z.string().optional().or(z.literal("")),
  nationality: z.string().min(2, "Nationality is required."),
  religion: z.string().optional().or(z.literal("")),
  bloodType: z.string().optional().or(z.literal("")),
  philsysNo: z.string().optional().or(z.literal("")),
  status: z.enum(["Active", "Inactive", "Deceased", "Moved Out"]),
  isPwd: z.boolean(),
  is4Ps: z.boolean(),
  isSoloParent: z.boolean(),
  remarks: z.string().max(500).optional().or(z.literal("")),
});

export type ResidentFormValues = z.infer<typeof residentSchema>;

export const PUROK_OPTIONS = [
  "Purok 1", "Purok 2", "Purok 3", "Purok 4", "Purok 5", "Purok 6", "Purok 7",
];

const RELATIONSHIPS = [
  "Head", "Spouse", "Son", "Daughter", "Parent", "Grandparent", "Sibling",
  "Relative", "Boarder", "Member",
];

export function toFormValues(r?: Resident | null): ResidentFormValues {
  return {
    firstName: r?.firstName ?? "",
    middleName: r?.middleName ?? "",
    lastName: r?.lastName ?? "",
    suffix: r?.suffix ?? "",
    birthDate: r?.birthDate ?? "",
    birthPlace: r?.birthPlace ?? "",
    sex: r?.sex ?? "Male",
    civilStatus: r?.civilStatus ?? "Single",
    contactNumber: r?.contactNumber ?? "",
    email: r?.email ?? "",
    houseNo: r?.address.houseNo ?? "",
    street: r?.address.street ?? "",
    purok: r?.address.purok ?? "",
    barangay: r?.address.barangay ?? "Sta. Cruz",
    city: r?.address.city ?? "Quezon City",
    province: r?.address.province ?? "Metro Manila",
    zipCode: r?.address.zipCode ?? "1104",
    householdId: r?.householdId ?? "",
    relationshipToHead: r?.relationshipToHead ?? "",
    occupation: r?.occupation ?? "",
    employmentStatus: r?.employmentStatus ?? "Employed",
    voterStatus: r?.voterStatus ?? "Not Registered",
    precinctNo: r?.precinctNo ?? "",
    nationality: r?.nationality ?? "Filipino",
    religion: r?.religion ?? "",
    bloodType: r?.bloodType ?? "",
    philsysNo: r?.philsysNo ?? "",
    status: r?.status ?? "Active",
    isPwd: r?.isPwd ?? false,
    is4Ps: r?.is4Ps ?? false,
    isSoloParent: r?.isSoloParent ?? false,
    remarks: r?.remarks ?? "",
  };
}

export function toResidentInput(v: ResidentFormValues): ResidentInput {
  return {
    firstName: v.firstName.trim(),
    middleName: v.middleName ?? "",
    lastName: v.lastName.trim(),
    suffix: v.suffix ?? "",
    birthDate: v.birthDate,
    birthPlace: v.birthPlace ?? "",
    sex: v.sex,
    civilStatus: v.civilStatus,
    contactNumber: v.contactNumber,
    email: v.email ?? "",
    address: {
      houseNo: v.houseNo,
      street: v.street,
      purok: v.purok,
      barangay: v.barangay,
      city: v.city,
      province: v.province,
      zipCode: v.zipCode,
    },
    householdId: v.householdId ? v.householdId : null,
    relationshipToHead: v.relationshipToHead ?? "",
    occupation: v.occupation ?? "",
    employmentStatus: v.employmentStatus,
    voterStatus: v.voterStatus,
    precinctNo: v.precinctNo ?? "",
    nationality: v.nationality,
    religion: v.religion ?? "",
    bloodType: v.bloodType ?? "",
    philsysNo: v.philsysNo ?? "",
    isPwd: v.isPwd,
    is4Ps: v.is4Ps,
    isSoloParent: v.isSoloParent,
    status: v.status,
    remarks: v.remarks ?? "",
  };
}

export default function ResidentForm({
  resident,
  households,
  submitting,
  onSubmit,
  onCancel,
}: {
  resident?: Resident | null;
  households: HouseholdWithStats[];
  submitting: boolean;
  onSubmit: (values: ResidentFormValues) => void | Promise<void>;
  onCancel: () => void;
}) {
  const [confirmCancel, setConfirmCancel] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty, isValid },
  } = useForm<ResidentFormValues>({
    resolver: zodResolver(residentSchema),
    defaultValues: toFormValues(resident),
    mode: "onBlur",
  });

  const handleCancel = () => {
    if (isDirty) setConfirmCancel(true);
    else onCancel();
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <Card>
          <CardHeader
            title="Personal information"
            description="Fields marked with an asterisk are required."
          />
          <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="First name" htmlFor="firstName" required error={errors.firstName?.message}>
              <Input id="firstName" invalid={!!errors.firstName} {...register("firstName")} />
            </Field>
            <Field label="Middle name" htmlFor="middleName" error={errors.middleName?.message}>
              <Input id="middleName" {...register("middleName")} />
            </Field>
            <Field label="Last name" htmlFor="lastName" required error={errors.lastName?.message}>
              <Input id="lastName" invalid={!!errors.lastName} {...register("lastName")} />
            </Field>
            <Field label="Suffix" htmlFor="suffix" hint="Jr., Sr., III…" error={errors.suffix?.message}>
              <Input id="suffix" {...register("suffix")} />
            </Field>
            <Field label="Date of birth" htmlFor="birthDate" required error={errors.birthDate?.message}>
              <Input id="birthDate" type="date" invalid={!!errors.birthDate} {...register("birthDate")} />
            </Field>
            <Field label="Place of birth" htmlFor="birthPlace" error={errors.birthPlace?.message}>
              <Input id="birthPlace" {...register("birthPlace")} />
            </Field>
            <Field label="Sex" htmlFor="sex" required error={errors.sex?.message}>
              <Select id="sex" invalid={!!errors.sex} {...register("sex")}>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </Select>
            </Field>
            <Field label="Civil status" htmlFor="civilStatus" required error={errors.civilStatus?.message}>
              <Select id="civilStatus" {...register("civilStatus")}>
                {["Single", "Married", "Widowed", "Separated", "Annulled"].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="Contact information" />
          <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field
              label="Contact number"
              htmlFor="contactNumber"
              required
              hint="Format: 09XXXXXXXXX"
              error={errors.contactNumber?.message}
            >
              <Input
                id="contactNumber"
                inputMode="tel"
                placeholder="09171234567"
                invalid={!!errors.contactNumber}
                {...register("contactNumber")}
              />
            </Field>
            <Field label="Email address" htmlFor="email" error={errors.email?.message}>
              <Input id="email" type="email" invalid={!!errors.email} {...register("email")} />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="Address" description="Barangay Sta. Cruz, Quezon City." />
          <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="House / unit no." htmlFor="houseNo" required error={errors.houseNo?.message}>
              <Input id="houseNo" invalid={!!errors.houseNo} {...register("houseNo")} />
            </Field>
            <Field label="Street" htmlFor="street" required error={errors.street?.message}>
              <Input id="street" invalid={!!errors.street} {...register("street")} />
            </Field>
            <Field label="Purok" htmlFor="purok" required error={errors.purok?.message}>
              <Select id="purok" invalid={!!errors.purok} {...register("purok")}>
                <option value="">Select purok…</option>
                {PUROK_OPTIONS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Barangay" htmlFor="barangay" required error={errors.barangay?.message}>
              <Input id="barangay" readOnly {...register("barangay")} />
            </Field>
            <Field label="City / municipality" htmlFor="city" required error={errors.city?.message}>
              <Input id="city" readOnly {...register("city")} />
            </Field>
            <Field label="Province" htmlFor="province" required error={errors.province?.message}>
              <Input id="province" readOnly {...register("province")} />
            </Field>
            <Field label="ZIP code" htmlFor="zipCode" required error={errors.zipCode?.message}>
              <Input id="zipCode" invalid={!!errors.zipCode} {...register("zipCode")} />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Household assignment"
            description="Link this resident to a registered household."
          />
          <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Household" htmlFor="householdId" className="lg:col-span-2">
              <Select id="householdId" {...register("householdId")}>
                <option value="">Not assigned</option>
                {households.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.householdNo}  {h.headName} ({h.address.purok})
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Relationship to head" htmlFor="relationshipToHead">
              <Select id="relationshipToHead" {...register("relationshipToHead")}>
                <option value=""></option>
                {RELATIONSHIPS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="Additional information" />
          <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Occupation" htmlFor="occupation" error={errors.occupation?.message}>
              <Input id="occupation" {...register("occupation")} />
            </Field>
            <Field label="Employment status" htmlFor="employmentStatus">
              <Select id="employmentStatus" {...register("employmentStatus")}>
                {["Employed", "Self-employed", "Unemployed", "Student", "Retired", "Homemaker"].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Voter status" htmlFor="voterStatus" required>
              <Select id="voterStatus" {...register("voterStatus")}>
                <option value="Registered">Registered</option>
                <option value="Not Registered">Not Registered</option>
              </Select>
            </Field>
            <Field label="Precinct no." htmlFor="precinctNo">
              <Input id="precinctNo" {...register("precinctNo")} />
            </Field>
            <Field label="Nationality" htmlFor="nationality" required error={errors.nationality?.message}>
              <Input id="nationality" invalid={!!errors.nationality} {...register("nationality")} />
            </Field>
            <Field label="Religion" htmlFor="religion">
              <Input id="religion" {...register("religion")} />
            </Field>
            <Field label="Blood type" htmlFor="bloodType">
              <Select id="bloodType" {...register("bloodType")}>
                <option value="">Unknown</option>
                {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="PhilSys no. (masked)" htmlFor="philsysNo" hint="Store masked values only.">
              <Input id="philsysNo" placeholder="****-****-1234" {...register("philsysNo")} />
            </Field>
            <Field label="Record status" htmlFor="status" required>
              <Select id="status" {...register("status")}>
                {["Active", "Inactive", "Deceased", "Moved Out"].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="grid gap-2 px-4 pb-4 sm:grid-cols-3">
            <Checkbox id="isPwd" label="Person with disability" {...register("isPwd")} />
            <Checkbox id="is4Ps" label="4Ps beneficiary" {...register("is4Ps")} />
            <Checkbox id="isSoloParent" label="Solo parent" {...register("isSoloParent")} />
          </div>
          <div className="px-4 pb-4">
            <Field label="Remarks" htmlFor="remarks" error={errors.remarks?.message}>
              <Textarea id="remarks" rows={3} {...register("remarks")} />
            </Field>
          </div>
        </Card>

        <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs text-slate-500">
            {isDirty ? "You have unsaved changes." : "No changes yet."}
          </p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" onClick={handleCancel} disabled={submitting}>
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button type="submit" loading={submitting} disabled={!isDirty || (!isValid && Object.keys(errors).length > 0)}>
              <Save className="h-4 w-4" />
              {resident ? "Save changes" : "Create resident record"}
            </Button>
          </div>
        </div>
      </form>

      <ConfirmDialog
        open={confirmCancel}
        title="Discard unsaved changes?"
        message="You have entered information that has not been saved. Leaving this form will discard those changes."
        confirmLabel="Discard changes"
        cancelLabel="Continue editing"
        destructive
        onCancel={() => setConfirmCancel(false)}
        onConfirm={() => {
          setConfirmCancel(false);
          onCancel();
        }}
      />
    </>
  );
}
