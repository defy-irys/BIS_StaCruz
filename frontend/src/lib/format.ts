import { format, formatDistanceToNow, parseISO, differenceInYears } from "date-fns";

export function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  try {
    const d = parseISO(value);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

export function fmtDate(value?: string | Date | null, pattern = "MMM d, yyyy") {
  const d = toDate(value ?? null);
  return d ? format(d, pattern) : "";
}

export function fmtDateTime(value?: string | Date | null) {
  const d = toDate(value ?? null);
  return d ? format(d, "MMM d, yyyy • h:mm a") : "";
}

export function fmtRelative(value?: string | Date | null) {
  const d = toDate(value ?? null);
  return d ? formatDistanceToNow(d, { addSuffix: true }) : "";
}

export function calcAge(birthDate?: string | null): number {
  const d = toDate(birthDate ?? null);
  if (!d) return 0;
  return Math.max(0, differenceInYears(new Date(), d));
}

export function fmtPeso(amount: number) {
  return `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function fmtNumber(n: number) {
  return n.toLocaleString("en-PH");
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function fullName(p: {
  firstName: string;
  middleName?: string;
  lastName: string;
  suffix?: string;
}) {
  const mi = p.middleName ? ` ${p.middleName.charAt(0)}.` : "";
  const sfx = p.suffix ? ` ${p.suffix}` : "";
  return `${p.firstName}${mi} ${p.lastName}${sfx}`.replace(/\s+/g, " ").trim();
}

export function formalName(p: {
  firstName: string;
  middleName?: string;
  lastName: string;
  suffix?: string;
}) {
  const sfx = p.suffix ? ` ${p.suffix}` : "";
  return `${p.lastName}${sfx}, ${p.firstName}${p.middleName ? " " + p.middleName : ""}`.trim();
}

export function formatAddress(a: {
  houseNo: string;
  street: string;
  purok: string;
  barangay: string;
  city: string;
}) {
  return [a.houseNo, a.street, a.purok, `Brgy. ${a.barangay}`, a.city]
    .filter(Boolean)
    .join(", ");
}
