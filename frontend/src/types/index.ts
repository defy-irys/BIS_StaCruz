/**
 * BIMS-BIPS  Domain types
 *
 * IDs are treated as opaque strings (UUID) so the frontend never assumes
 * integer primary keys. This keeps the contract compatible with the
 * FastAPI + SQLAlchemy + PostgreSQL backend.
 */
export type UUID = string;

/* RBAC*/

export type RoleKey = "super_admin" | "admin" | "staff" | "resident";

export const PERMISSIONS = [
  "residents.view",
  "residents.create",
  "residents.update",
  "residents.delete",
  "households.view",
  "households.manage",
  "officials.view",
  "officials.manage",
  "blotter.view",
  "blotter.manage",
  "certificates.view",
  "certificates.process",
  "clearances.view",
  "clearances.process",
  "reports.view",
  "reports.generate",
  "analytics.view",
  "gis.view",
  "users.view",
  "users.manage",
  "roles.view",
  "roles.manage",
  "settings.manage",
  "portal.access",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export interface PermissionGroup {
  key: string;
  label: string;
  permissions: { key: Permission; label: string; description: string }[];
}

export interface Role {
  id: UUID;
  key: RoleKey;
  name: string;
  description: string;
  scope: "Administrative" | "Operational" | "Public";
  isSystem: boolean;
  permissions: Permission[];
}

/* Auth*/

export interface AuthUser {
  id: UUID;
  username: string;
  email: string;
  fullName: string;
  role: RoleKey;
  roleName: string;
  permissions: Permission[];
  residentId?: UUID;
  position?: string;
  lastLoginAt?: string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  tokenType: "bearer";
  expiresIn: number;
  user: AuthUser;
}

export interface LoginPayload {
  identifier: string;
  password: string;
}

/* Shared*/

export interface Address {
  houseNo: string;
  street: string;
  purok: string;
  barangay: string;
  city: string;
  province: string;
  zipCode: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

/* Residents*/

export type Sex = "Male" | "Female";
export type CivilStatus =
  | "Single"
  | "Married"
  | "Widowed"
  | "Separated"
  | "Annulled";
export type VoterStatus = "Registered" | "Not Registered";
export type ResidentStatus = "Active" | "Inactive" | "Deceased" | "Moved Out";
export type EmploymentStatus =
  | "Employed"
  | "Self-employed"
  | "Unemployed"
  | "Student"
  | "Retired"
  | "Homemaker";

export interface Resident {
  id: UUID;
  residentNo: string;
  firstName: string;
  middleName: string;
  lastName: string;
  suffix: string;
  birthDate: string;
  birthPlace: string;
  sex: Sex;
  civilStatus: CivilStatus;
  contactNumber: string;
  email: string;
  address: Address;
  householdId: UUID | null;
  relationshipToHead: string;
  occupation: string;
  employmentStatus: EmploymentStatus;
  voterStatus: VoterStatus;
  precinctNo: string;
  nationality: string;
  religion: string;
  bloodType: string;
  philsysNo: string;
  isPwd: boolean;
  is4Ps: boolean;
  isSoloParent: boolean;
  status: ResidentStatus;
  dateRegistered: string;
  remarks: string;
  createdAt: string;
  updatedAt: string;
}

export type ResidentInput = Omit<
  Resident,
  "id" | "residentNo" | "createdAt" | "updatedAt" | "dateRegistered"
>;

export interface ResidentQuery extends ListQuery {
  status?: ResidentStatus | "";
  sex?: Sex | "";
  voterStatus?: VoterStatus | "";
  civilStatus?: CivilStatus | "";
  purok?: string;
  minAge?: number | "";
  maxAge?: number | "";
  householdId?: UUID;
}

/* Households*/

export type HouseholdType = "Owned" | "Rented" | "Shared" | "Caretaker";
export type IncomeBracket =
  | "Below ₱10,000"
  | "₱10,000 – ₱20,000"
  | "₱20,001 – ₱40,000"
  | "Above ₱40,000";

export interface Household {
  id: UUID;
  householdNo: string;
  headResidentId: UUID | null;
  address: Address;
  householdType: HouseholdType;
  incomeBracket: IncomeBracket;
  waterSource: string;
  toiletFacility: string;
  dateRegistered: string;
  status: "Active" | "Inactive";
  remarks: string;
  /** Simulated coordinates for the conceptual GIS module (fictional). */
  geo: { lat: number; lng: number };
  createdAt: string;
  updatedAt: string;
}

export type HouseholdInput = Omit<
  Household,
  "id" | "householdNo" | "createdAt" | "updatedAt" | "geo"
>;

export interface HouseholdQuery extends ListQuery {
  purok?: string;
  householdType?: HouseholdType | "";
  status?: "Active" | "Inactive" | "";
}

export interface HouseholdWithStats extends Household {
  headName: string;
  memberCount: number;
}

/* Officials*/

export interface Official {
  id: UUID;
  fullName: string;
  position: string;
  committee: string;
  office: string;
  contactNumber: string;
  email: string;
  termStart: string;
  termEnd: string;
  status: "Active" | "Inactive" | "Archived";
  residentId: UUID | null;
  createdAt: string;
  updatedAt: string;
}

export type OfficialInput = Omit<Official, "id" | "createdAt" | "updatedAt">;

/* Blotter*/

export type BlotterStatus =
  | "Pending"
  | "Under Investigation"
  | "Resolved"
  | "Closed";

export interface StatusEvent {
  id: UUID;
  at: string;
  from: string;
  to: string;
  actor: string;
  note: string;
}

export interface CaseNote {
  id: UUID;
  at: string;
  author: string;
  body: string;
}

export interface BlotterRecord {
  id: UUID;
  caseNo: string;
  incidentType: string;
  incidentDate: string;
  reportedAt: string;
  location: string;
  complainantName: string;
  complainantContact: string;
  respondentName: string;
  respondentAddress: string;
  description: string;
  assignedTo: string;
  status: BlotterStatus;
  resolution: string;
  notes: CaseNote[];
  history: StatusEvent[];
  createdAt: string;
  updatedAt: string;
}

export type BlotterInput = Omit<
  BlotterRecord,
  "id" | "caseNo" | "notes" | "history" | "createdAt" | "updatedAt" | "reportedAt"
>;

export interface BlotterQuery extends ListQuery {
  status?: BlotterStatus | "";
  incidentType?: string;
}

/* Document requests (certificates + clearances)*/

export type CertificateStatus =
  | "Submitted"
  | "Under Review"
  | "Approved"
  | "Ready for Release"
  | "Released"
  | "Rejected";

export type ClearanceStatus = "Pending" | "Approved" | "Rejected" | "Released";

export type RequestChannel = "Walk-in" | "Resident Portal";

export interface CertificateRequest {
  id: UUID;
  referenceNo: string;
  residentId: UUID;
  residentName: string;
  certificateType: string;
  purpose: string;
  status: CertificateStatus;
  channel: RequestChannel;
  requestedAt: string;
  issuedAt: string | null;
  processedBy: string;
  fee: number;
  orNumber: string;
  remarks: string;
  history: StatusEvent[];
}

export interface ClearanceRequest {
  id: UUID;
  referenceNo: string;
  residentId: UUID;
  residentName: string;
  clearanceType: string;
  purpose: string;
  status: ClearanceStatus;
  channel: RequestChannel;
  requestedAt: string;
  releasedAt: string | null;
  processedBy: string;
  fee: number;
  orNumber: string;
  remarks: string;
  history: StatusEvent[];
}

export interface DocumentQuery extends ListQuery {
  status?: string;
  type?: string;
  residentId?: UUID;
  channel?: RequestChannel | "";
}

/* Users*/

export interface SystemUser {
  id: UUID;
  username: string;
  email: string;
  fullName: string;
  role: RoleKey;
  status: "Active" | "Inactive" | "Suspended";
  position: string;
  lastLoginAt: string | null;
  createdAt: string;
  residentId: UUID | null;
}

export type SystemUserInput = Omit<
  SystemUser,
  "id" | "createdAt" | "lastLoginAt" | "residentId"
>;

/* Facilities (GIS)*/

export type FacilityCategory =
  | "Government"
  | "Health"
  | "Education"
  | "Community"
  | "Safety";

export interface Facility {
  id: UUID;
  name: string;
  category: FacilityCategory;
  description: string;
  address: string;
  contactNumber: string;
  /** Simulated coordinates for the conceptual GIS module (fictional). */
  geo: { lat: number; lng: number };
}

/* Misc*/

export interface ActivityLog {
  id: UUID;
  at: string;
  actor: string;
  action: string;
  module: string;
  description: string;
}

export interface AppNotification {
  id: UUID;
  audience: "admin" | "resident";
  residentId?: UUID;
  title: string;
  message: string;
  level: "info" | "success" | "warning";
  at: string;
  read: boolean;
}

export interface Announcement {
  id: UUID;
  title: string;
  body: string;
  category: string;
  postedAt: string;
  postedBy: string;
}

export interface DashboardMetrics {
  totalResidents: number;
  activeResidents: number;
  totalHouseholds: number;
  pendingClearances: number;
  openBlotter: number;
  certificatesThisMonth: number;
  registeredVoters: number;
  seniorCitizens: number;
}

export interface SystemStatus {
  component: string;
  state: "operational" | "simulated" | "degraded";
  detail: string;
}
