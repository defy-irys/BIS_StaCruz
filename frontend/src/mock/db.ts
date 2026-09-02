/**
 * In-memory simulated datastore for the BIMS-BIPS prototype.
 *
 * IMPORTANT: This module exists ONLY as a stand in for the real FastAPI backend.
 * No UI component should import it directly, everything goes through
 * `src/services/*`, which mirrors the eventual REST contract.
 *
 * All persons, households and records below are FICTIONAL.
 */
import type {
  ActivityLog,
  Announcement,
  AppNotification,
  BlotterRecord,
  BlotterStatus,
  CertificateRequest,
  CertificateStatus,
  CivilStatus,
  ClearanceRequest,
  ClearanceStatus,
  EmploymentStatus,
  Facility,
  Household,
  HouseholdType,
  IncomeBracket,
  Official,
  Permission,
  Resident,
  Role,
  Sex,
  SystemUser,
  UUID,
} from "@/types";

/* ------------------------------------------------------------------ */
/* Deterministic pseudo-random generator (stable demo data)            */
/* ------------------------------------------------------------------ */

function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rnd = mulberry32(20250127);
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rnd() * arr.length)];
const int = (min: number, max: number) => Math.floor(rnd() * (max - min + 1)) + min;
const chance = (p: number) => rnd() < p;

let idCounter = 0;
export function uid(prefix = "id"): UUID {
  idCounter += 1;
  const hex = (n: number, len: number) => n.toString(16).padStart(len, "0");
  return `${prefix}-${hex(idCounter, 4)}-${hex(Math.floor(rnd() * 0xffffff), 6)}`;
}

const iso = (d: Date) => d.toISOString();
const daysAgo = (n: number) => {
  const d = new Date();
  d.setHours(9, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
};
const dateOnly = (d: Date) => d.toISOString().slice(0, 10);

/* ------------------------------------------------------------------ */
/* Name & attribute pools (fictional)                                  */
/* ------------------------------------------------------------------ */

const MALE_NAMES = [
  "Andres", "Benigno", "Carlito", "Danilo", "Eduardo", "Ferdinand", "Gregorio",
  "Hermogenes", "Isagani", "Joselito", "Kristoffer", "Leonardo", "Marcelo",
  "Nicanor", "Oscar", "Paulo", "Quirino", "Rodrigo", "Salvador", "Teodoro",
  "Ulysses", "Virgilio", "Wilfredo", "Ramon", "Emilio", "Jayson", "Michael",
  "Rafael", "Dominic", "Arturo",
];
const FEMALE_NAMES = [
  "Amihan", "Bituin", "Corazon", "Divina", "Elena", "Felicidad", "Gliceria",
  "Hermina", "Imelda", "Josefina", "Katrina", "Lorna", "Marisol", "Nenita",
  "Olivia", "Perlita", "Querubin", "Rosalinda", "Soledad", "Teresita",
  "Urduja", "Veronica", "Wilhelmina", "Yolanda", "Zenaida", "Angelica",
  "Charmaine", "Danica", "Kristine", "Maricel",
];
const MIDDLE_NAMES = [
  "Aguinaldo", "Bautista", "Cabrera", "Dimagiba", "Enriquez", "Fajardo",
  "Gutierrez", "Hilario", "Ignacio", "Javier", "Lacsamana", "Manalo",
  "Navarro", "Ocampo", "Pascual", "Quintos", "Rivera", "Sarmiento",
  "Tolentino", "Urbano", "Valdez",
];
const SURNAMES = [
  "Abadilla", "Bagtas", "Carpio", "Dalisay", "Escalona", "Ferrer", "Galang",
  "Hidalgo", "Inocencio", "Jocson", "Katigbak", "Legaspi", "Macaraeg",
  "Nepomuceno", "Obispo", "Panganiban", "Quijano", "Robles", "Sandoval",
  "Tabuena", "Umali", "Ventura", "Yabut", "Zamora", "Balagtas", "Cuenca",
  "Dizon", "Espiritu", "Fuentes", "Guevarra",
];
const STREETS = [
  "Sampaguita St.", "Ilang-Ilang St.", "Camia St.", "Dahlia St.", "Narra St.",
  "Acacia St.", "Molave St.", "Kalachuchi St.", "Rosal St.", "Adelfa St.",
  "Mabuhay Ave.", "Maharlika St.", "Pag-asa St.", "Masagana St.",
];
const PUROKS = [
  "Purok 1", "Purok 2", "Purok 3", "Purok 4", "Purok 5", "Purok 6", "Purok 7",
];
const OCCUPATIONS = [
  "Tricycle Driver", "Sari-sari Store Owner", "Public School Teacher",
  "Call Center Agent", "Construction Worker", "Barangay Health Worker",
  "Security Guard", "Government Employee", "Registered Nurse", "Carpenter",
  "Market Vendor", "Delivery Rider", "Seamstress", "Utility Worker",
  "Office Clerk", "Electrician", "Caregiver", "Bookkeeper",
];
const RELIGIONS = [
  "Roman Catholic", "Iglesia ni Cristo", "Born Again Christian", "Islam",
  "Seventh-day Adventist", "Aglipayan",
];
const BLOOD = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];
const INCIDENT_TYPES = [
  "Noise Complaint", "Physical Altercation", "Property Dispute", "Theft",
  "Verbal Threat", "Trespassing", "Neighbor Dispute", "Unpaid Debt",
  "Vandalism", "Curfew Violation",
];
const CERT_TYPES = [
  "Certificate of Residency",
  "Certificate of Indigency",
  "Certificate of Good Moral Character",
  "Barangay Business Certificate",
  "Certificate of Live-in Partnership",
  "First Time Job Seeker Certificate",
];
const CLEARANCE_TYPES = [
  "Barangay Clearance",
  "Business Permit Clearance",
  "Barangay ID Clearance",
  "Building Permit Endorsement",
  "Work Requirement Clearance",
];
const PURPOSES = [
  "Employment requirement", "Scholarship application", "Financial assistance",
  "Bank transaction", "Local business registration", "Medical assistance",
  "School enrollment", "Police clearance requirement", "SSS/Pag-IBIG claim",
];
const STAFF_NAMES = [
  "Rosalinda M. Ventura", "Joselito P. Carpio", "Teresita B. Galang",
  "Ramon D. Escalona", "Angelica S. Robles",
];

/* ------------------------------------------------------------------ */
/* Roles & permissions                                                 */
/* ------------------------------------------------------------------ */

const ALL_ADMIN_PERMS: Permission[] = [
  "residents.view", "residents.create", "residents.update", "residents.delete",
  "households.view", "households.manage",
  "officials.view", "officials.manage",
  "blotter.view", "blotter.manage",
  "certificates.view", "certificates.process",
  "clearances.view", "clearances.process",
  "reports.view", "reports.generate",
  "analytics.view", "gis.view",
  "users.view", "users.manage",
  "roles.view", "roles.manage",
  "settings.manage",
];

export const roles: Role[] = [
  {
    id: "role-super-admin",
    key: "super_admin",
    name: "Super Administrator",
    description:
      "Unrestricted access to every module including RBAC configuration and system settings.",
    scope: "Administrative",
    isSystem: true,
    permissions: [...ALL_ADMIN_PERMS],
  },
  {
    id: "role-admin",
    key: "admin",
    name: "Administrator",
    description:
      "Manages barangay records, transactions and reports. Limited RBAC visibility.",
    scope: "Administrative",
    isSystem: true,
    permissions: [
      "residents.view", "residents.create", "residents.update", "residents.delete",
      "households.view", "households.manage",
      "officials.view", "officials.manage",
      "blotter.view", "blotter.manage",
      "certificates.view", "certificates.process",
      "clearances.view", "clearances.process",
      "reports.view", "reports.generate",
      "analytics.view", "gis.view",
      "users.view", "users.manage",
      "roles.view",
    ],
  },
  {
    id: "role-staff",
    key: "staff",
    name: "Barangay Staff / Official",
    description:
      "Front-desk operations: resident profiling, document processing and incident intake.",
    scope: "Operational",
    isSystem: true,
    permissions: [
      "residents.view", "residents.create", "residents.update",
      "households.view",
      "officials.view",
      "blotter.view", "blotter.manage",
      "certificates.view", "certificates.process",
      "clearances.view", "clearances.process",
      "reports.view",
      "gis.view",
    ],
  },
  {
    id: "role-resident",
    key: "resident",
    name: "Resident",
    description:
      "Public self-service portal. May view own profile and household, and file document requests.",
    scope: "Public",
    isSystem: true,
    permissions: ["portal.access"],
  },
];

/* ------------------------------------------------------------------ */
/* Households + Residents                                              */
/* ------------------------------------------------------------------ */

const households: Household[] = [];
const residents: Resident[] = [];

const HOUSEHOLD_COUNT = 74;
// Approximate centroid used only as a simulated anchor  NOT real survey data.
const GEO_ANCHOR = { lat: 14.6512, lng: 121.0492 };

let residentSeq = 0;
let householdSeq = 0;

function makeResident(opts: {
  lastName: string;
  sex: Sex;
  age: number;
  household: Household;
  relationship: string;
  civilStatus?: CivilStatus;
}): Resident {
  residentSeq += 1;
  const { lastName, sex, age, household, relationship } = opts;
  const firstName = sex === "Male" ? pick(MALE_NAMES) : pick(FEMALE_NAMES);
  const birth = new Date();
  birth.setFullYear(birth.getFullYear() - age);
  birth.setMonth(int(0, 11));
  birth.setDate(int(1, 28));
  const civilStatus: CivilStatus =
    opts.civilStatus ?? (age < 18 ? "Single" : pick(["Single", "Married", "Married", "Widowed", "Separated"] as CivilStatus[]));
  const employment: EmploymentStatus =
    age < 18
      ? "Student"
      : age >= 63
        ? pick(["Retired", "Retired", "Self-employed", "Homemaker"] as EmploymentStatus[])
        : pick(["Employed", "Employed", "Self-employed", "Unemployed", "Homemaker", "Student"] as EmploymentStatus[]);
  const isVoter = age >= 18 && chance(0.78);
  const created = daysAgo(int(20, 720));

  return {
    id: uid("res"),
    residentNo: `SC-2024-${String(residentSeq).padStart(5, "0")}`,
    firstName,
    middleName: pick(MIDDLE_NAMES),
    lastName,
    suffix: sex === "Male" && chance(0.06) ? pick(["Jr.", "III", "II"]) : "",
    birthDate: dateOnly(birth),
    birthPlace: pick(["Quezon City", "Manila", "Caloocan", "Bulacan", "Laguna", "Cebu City"]),
    sex,
    civilStatus,
    contactNumber: `09${int(10, 99)}${String(int(1000000, 9999999))}`,
    email: chance(0.55)
      ? `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.ph`
      : "",
    address: { ...household.address },
    householdId: household.id,
    relationshipToHead: relationship,
    occupation: employment === "Student" ? "Student" : employment === "Unemployed" ? "" : pick(OCCUPATIONS),
    employmentStatus: employment,
    voterStatus: isVoter ? "Registered" : "Not Registered",
    precinctNo: isVoter ? `0${int(100, 199)}A` : "",
    nationality: "Filipino",
    religion: pick(RELIGIONS),
    bloodType: pick(BLOOD),
    philsysNo: chance(0.6) ? `****-****-${int(1000, 9999)}` : "",
    isPwd: chance(0.035),
    is4Ps: chance(0.11),
    isSoloParent: sex === "Female" && age > 24 && chance(0.07),
    status: chance(0.94) ? "Active" : pick(["Inactive", "Moved Out", "Deceased"] as const),
    dateRegistered: dateOnly(created),
    remarks: "",
    createdAt: iso(created),
    updatedAt: iso(daysAgo(int(1, 20))),
  };
}

for (let h = 0; h < HOUSEHOLD_COUNT; h++) {
  householdSeq += 1;
  const purok = PUROKS[h % PUROKS.length];
  const street = pick(STREETS);
  const registered = daysAgo(int(60, 900));
  const household: Household = {
    id: uid("hh"),
    householdNo: `HH-${purok.replace("Purok ", "P")}-${String(householdSeq).padStart(4, "0")}`,
    headResidentId: null,
    address: {
      houseNo: `${int(1, 240)}${chance(0.2) ? "-" + pick(["A", "B", "C"]) : ""}`,
      street,
      purok,
      barangay: "Sta. Cruz",
      city: "Quezon City",
      province: "Metro Manila",
      zipCode: "1104",
    },
    householdType: pick(["Owned", "Owned", "Rented", "Shared", "Caretaker"] as HouseholdType[]),
    incomeBracket: pick([
      "Below ₱10,000", "₱10,000 – ₱20,000", "₱10,000 – ₱20,000",
      "₱20,001 – ₱40,000", "Above ₱40,000",
    ] as IncomeBracket[]),
    waterSource: pick(["Maynilad / Manila Water", "Deep Well", "Shared Water Connection"]),
    toiletFacility: pick(["Water-sealed", "Water-sealed", "Shared / Communal"]),
    dateRegistered: dateOnly(registered),
    status: chance(0.96) ? "Active" : "Inactive",
    remarks: "",
    geo: {
      lat: GEO_ANCHOR.lat + (rnd() - 0.5) * 0.014,
      lng: GEO_ANCHOR.lng + (rnd() - 0.5) * 0.016,
    },
    createdAt: iso(registered),
    updatedAt: iso(daysAgo(int(1, 40))),
  };

  const lastName = SURNAMES[h % SURNAMES.length];
  const headSex: Sex = chance(0.62) ? "Male" : "Female";
  const head = makeResident({
    lastName,
    sex: headSex,
    age: int(30, 74),
    household,
    relationship: "Head",
    civilStatus: chance(0.75) ? "Married" : pick(["Widowed", "Single", "Separated"] as CivilStatus[]),
  });
  head.status = "Active";
  household.headResidentId = head.id;
  residents.push(head);

  if (head.civilStatus === "Married") {
    const spouse = makeResident({
      lastName,
      sex: headSex === "Male" ? "Female" : "Male",
      age: Math.max(24, calcAgeFrom(head.birthDate) + int(-6, 5)),
      household,
      relationship: "Spouse",
      civilStatus: "Married",
    });
    spouse.status = "Active";
    residents.push(spouse);
  }

  const children = int(0, 4);
  for (let c = 0; c < children; c++) {
    residents.push(
      makeResident({
        lastName,
        sex: chance(0.5) ? "Male" : "Female",
        age: int(1, 27),
        household,
        relationship: pick(["Son", "Daughter"]),
        civilStatus: "Single",
      }),
    );
  }
  if (chance(0.18)) {
    residents.push(
      makeResident({
        lastName,
        sex: chance(0.5) ? "Male" : "Female",
        age: int(66, 88),
        household,
        relationship: pick(["Parent", "Grandparent"]),
        civilStatus: "Widowed",
      }),
    );
  }

  households.push(household);
}

function calcAgeFrom(birthDate: string) {
  const b = new Date(birthDate);
  const now = new Date();
  let a = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) a -= 1;
  return a;
}

/* ---- Demo resident account (linked to the mobile portal) ---------- */

const demoHousehold = households[2];
const demoResident: Resident = {
  ...makeResident({
    lastName: "Dalisay",
    sex: "Female",
    age: 34,
    household: demoHousehold,
    relationship: "Spouse",
    civilStatus: "Married",
  }),
  firstName: "Maricel",
  middleName: "Bautista",
  lastName: "Dalisay",
  suffix: "",
  email: "maricel.dalisay@example.ph",
  contactNumber: "09171234567",
  occupation: "Public School Teacher",
  employmentStatus: "Employed",
  voterStatus: "Registered",
  status: "Active",
  residentNo: "SC-2024-00001",
};
residents.unshift(demoResident);

/* ------------------------------------------------------------------ */
/* Officials                                                           */
/* ------------------------------------------------------------------ */

const officials: Official[] = [
  ["Punong Barangay", "Executive", "Rodrigo T. Panganiban"],
  ["Barangay Kagawad", "Committee on Peace & Order", "Corazon V. Legaspi"],
  ["Barangay Kagawad", "Committee on Health & Sanitation", "Emilio S. Nepomuceno"],
  ["Barangay Kagawad", "Committee on Education", "Teresita B. Galang"],
  ["Barangay Kagawad", "Committee on Infrastructure", "Wilfredo A. Jocson"],
  ["Barangay Kagawad", "Committee on Budget & Appropriation", "Perlita M. Sandoval"],
  ["Barangay Kagawad", "Committee on Women & Family", "Divina R. Ferrer"],
  ["Barangay Kagawad", "Committee on Youth & Sports", "Kristoffer L. Umali"],
  ["SK Chairperson", "Sangguniang Kabataan", "Danica P. Robles"],
  ["Barangay Secretary", "Administration", "Rosalinda M. Ventura"],
  ["Barangay Treasurer", "Administration", "Joselito P. Carpio"],
  ["Chief Tanod", "Peace & Order", "Salvador C. Yabut"],
].map(([position, committee, fullName], i) => ({
  id: uid("off"),
  fullName,
  position,
  committee,
  office: position === "SK Chairperson" ? "SK Office" : "Barangay Hall  Sta. Cruz",
  contactNumber: `092${int(10, 99)}${int(1000000, 9999999)}`,
  email: `${fullName.split(" ")[0].toLowerCase()}.${fullName.split(" ").slice(-1)[0].toLowerCase()}@stacruz.qc.gov.ph.example`,
  termStart: "2023-11-30",
  termEnd: "2026-11-30",
  status: i === 11 && false ? "Inactive" : ("Active" as const),
  residentId: null,
  createdAt: iso(daysAgo(700)),
  updatedAt: iso(daysAgo(int(5, 120))),
}));
officials.push({
  id: uid("off"),
  fullName: "Nicanor D. Abadilla",
  position: "Barangay Kagawad",
  committee: "Committee on Environment",
  office: "Barangay Hall  Sta. Cruz",
  contactNumber: "09281234567",
  email: "nicanor.abadilla@stacruz.qc.gov.ph.example",
  termStart: "2018-06-30",
  termEnd: "2023-11-29",
  status: "Archived",
  residentId: null,
  createdAt: iso(daysAgo(1800)),
  updatedAt: iso(daysAgo(400)),
});

/* ------------------------------------------------------------------ */
/* Blotter                                                             */
/* ------------------------------------------------------------------ */

const blotter: BlotterRecord[] = [];
for (let i = 0; i < 38; i++) {
  const reported = daysAgo(int(1, 240));
  const status: BlotterStatus = pick([
    "Pending", "Pending", "Under Investigation", "Under Investigation",
    "Resolved", "Resolved", "Closed",
  ]);
  const complainant = residents[int(0, residents.length - 1)];
  const respondent = residents[int(0, residents.length - 1)];
  const caseNo = `BLT-${reported.getFullYear()}-${String(i + 1).padStart(4, "0")}`;
  const history = [
    {
      id: uid("evt"),
      at: iso(reported),
      from: "",
      to: "Pending",
      actor: pick(STAFF_NAMES),
      note: "Incident logged at the barangay desk.",
    },
  ];
  if (status !== "Pending") {
    history.push({
      id: uid("evt"),
      at: iso(daysAgo(int(1, 60))),
      from: "Pending",
      to: status === "Under Investigation" ? "Under Investigation" : "Under Investigation",
      actor: pick(STAFF_NAMES),
      note: "Parties notified; mediation scheduled.",
    });
  }
  if (status === "Resolved" || status === "Closed") {
    history.push({
      id: uid("evt"),
      at: iso(daysAgo(int(0, 30))),
      from: "Under Investigation",
      to: status,
      actor: pick(STAFF_NAMES),
      note: status === "Resolved" ? "Amicable settlement reached." : "Case closed by the Lupong Tagapamayapa.",
    });
  }
  blotter.push({
    id: uid("blt"),
    caseNo,
    incidentType: pick(INCIDENT_TYPES),
    incidentDate: dateOnly(reported),
    reportedAt: iso(reported),
    location: `${pick(STREETS)}, ${pick(PUROKS)}, Brgy. Sta. Cruz`,
    complainantName: `${complainant.firstName} ${complainant.lastName}`,
    complainantContact: complainant.contactNumber,
    respondentName: `${respondent.firstName} ${respondent.lastName}`,
    respondentAddress: `${respondent.address.houseNo} ${respondent.address.street}, ${respondent.address.purok}`,
    description:
      "Simulated narrative for prototype purposes. The complainant reported the incident to the barangay desk and requested assistance from the Lupong Tagapamayapa.",
    assignedTo: pick(STAFF_NAMES),
    status,
    resolution: status === "Resolved" ? "Settled through barangay mediation." : "",
    notes: chance(0.5)
      ? [
          {
            id: uid("note"),
            at: iso(daysAgo(int(1, 40))),
            author: pick(STAFF_NAMES),
            body: "Follow-up conducted. Both parties acknowledged the summons.",
          },
        ]
      : [],
    history,
    createdAt: iso(reported),
    updatedAt: iso(daysAgo(int(0, 20))),
  });
}
blotter.sort((a, b) => b.reportedAt.localeCompare(a.reportedAt));

/* ------------------------------------------------------------------ */
/* Certificates & Clearances                                           */
/* ------------------------------------------------------------------ */

const certificates: CertificateRequest[] = [];
for (let i = 0; i < 64; i++) {
  const r = residents[int(0, Math.min(residents.length - 1, 120))];
  const requested = daysAgo(int(0, 120));
  const status: CertificateStatus = pick([
    "Submitted", "Under Review", "Approved", "Ready for Release",
    "Released", "Released", "Released", "Rejected",
  ]);
  const issued = status === "Released" ? daysAgo(int(0, 20)) : null;
  certificates.push({
    id: uid("cert"),
    referenceNo: `CTF-${requested.getFullYear()}-${String(i + 1).padStart(4, "0")}`,
    residentId: r.id,
    residentName: `${r.firstName} ${r.lastName}`,
    certificateType: pick(CERT_TYPES),
    purpose: pick(PURPOSES),
    status,
    channel: chance(0.4) ? "Resident Portal" : "Walk-in",
    requestedAt: iso(requested),
    issuedAt: issued ? iso(issued) : null,
    processedBy: status === "Submitted" ? "" : pick(STAFF_NAMES),
    fee: chance(0.3) ? 0 : pick([50, 75, 100, 130]),
    orNumber: status === "Released" ? `OR-${int(100000, 999999)}` : "",
    remarks: status === "Rejected" ? "Incomplete supporting documents submitted." : "",
    history: [
      {
        id: uid("evt"),
        at: iso(requested),
        from: "",
        to: "Submitted",
        actor: "System",
        note: "Request received.",
      },
    ],
  });
}
certificates.sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));

const clearances: ClearanceRequest[] = [];
for (let i = 0; i < 52; i++) {
  const r = residents[int(0, Math.min(residents.length - 1, 120))];
  const requested = daysAgo(int(0, 110));
  const status: ClearanceStatus = pick([
    "Pending", "Pending", "Approved", "Approved", "Released", "Released", "Rejected",
  ]);
  clearances.push({
    id: uid("clr"),
    referenceNo: `CLR-${requested.getFullYear()}-${String(i + 1).padStart(4, "0")}`,
    residentId: r.id,
    residentName: `${r.firstName} ${r.lastName}`,
    clearanceType: pick(CLEARANCE_TYPES),
    purpose: pick(PURPOSES),
    status,
    channel: chance(0.35) ? "Resident Portal" : "Walk-in",
    requestedAt: iso(requested),
    releasedAt: status === "Released" ? iso(daysAgo(int(0, 18))) : null,
    processedBy: status === "Pending" ? "" : pick(STAFF_NAMES),
    fee: pick([50, 100, 150, 200]),
    orNumber: status === "Released" ? `OR-${int(100000, 999999)}` : "",
    remarks: status === "Rejected" ? "Pending unresolved blotter record." : "",
    history: [
      {
        id: uid("evt"),
        at: iso(requested),
        from: "",
        to: "Pending",
        actor: "System",
        note: "Request received.",
      },
    ],
  });
}
clearances.sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));

/* Seed a few requests owned by the demo resident so the portal is populated */
certificates.unshift({
  id: uid("cert"),
  referenceNo: "CTF-2026-0101",
  residentId: demoResident.id,
  residentName: `${demoResident.firstName} ${demoResident.lastName}`,
  certificateType: "Certificate of Residency",
  purpose: "Employment requirement",
  status: "Ready for Release",
  channel: "Resident Portal",
  requestedAt: iso(daysAgo(4)),
  issuedAt: null,
  processedBy: "Rosalinda M. Ventura",
  fee: 50,
  orNumber: "",
  remarks: "",
  history: [
    { id: uid("evt"), at: iso(daysAgo(4)), from: "", to: "Submitted", actor: "System", note: "Filed through the resident portal." },
    { id: uid("evt"), at: iso(daysAgo(3)), from: "Submitted", to: "Under Review", actor: "Rosalinda M. Ventura", note: "Verifying residency records." },
    { id: uid("evt"), at: iso(daysAgo(2)), from: "Under Review", to: "Approved", actor: "Rosalinda M. Ventura", note: "Approved by the Barangay Secretary." },
    { id: uid("evt"), at: iso(daysAgo(1)), from: "Approved", to: "Ready for Release", actor: "Rosalinda M. Ventura", note: "Document printed; awaiting pick-up." },
  ],
});
clearances.unshift({
  id: uid("clr"),
  referenceNo: "CLR-2026-0087",
  residentId: demoResident.id,
  residentName: `${demoResident.firstName} ${demoResident.lastName}`,
  clearanceType: "Barangay Clearance",
  purpose: "Bank transaction",
  status: "Pending",
  channel: "Resident Portal",
  requestedAt: iso(daysAgo(1)),
  releasedAt: null,
  processedBy: "",
  fee: 100,
  orNumber: "",
  remarks: "",
  history: [
    { id: uid("evt"), at: iso(daysAgo(1)), from: "", to: "Pending", actor: "System", note: "Filed through the resident portal." },
  ],
});

/* ------------------------------------------------------------------ */
/* Users                                                               */
/* ------------------------------------------------------------------ */

const users: SystemUser[] = [
  {
    id: "usr-0001-superadmin",
    username: "superadmin",
    email: "superadmin@stacruz.qc.gov.ph.example",
    fullName: "Ferdinand A. Macaraeg",
    role: "super_admin",
    status: "Active",
    position: "System Administrator (MIS)",
    lastLoginAt: iso(daysAgo(0)),
    createdAt: iso(daysAgo(720)),
    residentId: null,
  },
  {
    id: "usr-0002-admin",
    username: "admin.ventura",
    email: "rosalinda.ventura@stacruz.qc.gov.ph.example",
    fullName: "Rosalinda M. Ventura",
    role: "admin",
    status: "Active",
    position: "Barangay Secretary",
    lastLoginAt: iso(daysAgo(1)),
    createdAt: iso(daysAgo(640)),
    residentId: null,
  },
  {
    id: "usr-0003-staff",
    username: "staff.carpio",
    email: "joselito.carpio@stacruz.qc.gov.ph.example",
    fullName: "Joselito P. Carpio",
    role: "staff",
    status: "Active",
    position: "Barangay Treasurer",
    lastLoginAt: iso(daysAgo(2)),
    createdAt: iso(daysAgo(520)),
    residentId: null,
  },
  {
    id: "usr-0004-staff",
    username: "staff.galang",
    email: "teresita.galang@stacruz.qc.gov.ph.example",
    fullName: "Teresita B. Galang",
    role: "staff",
    status: "Active",
    position: "Records Officer",
    lastLoginAt: iso(daysAgo(5)),
    createdAt: iso(daysAgo(410)),
    residentId: null,
  },
  {
    id: "usr-0005-staff",
    username: "staff.robles",
    email: "angelica.robles@stacruz.qc.gov.ph.example",
    fullName: "Angelica S. Robles",
    role: "staff",
    status: "Inactive",
    position: "Barangay Health Worker",
    lastLoginAt: iso(daysAgo(96)),
    createdAt: iso(daysAgo(300)),
    residentId: null,
  },
  {
    id: "usr-0006-resident",
    username: "resident.dalisay",
    email: "maricel.dalisay@example.ph",
    fullName: "Maricel B. Dalisay",
    role: "resident",
    status: "Active",
    position: "Resident",
    lastLoginAt: iso(daysAgo(0)),
    createdAt: iso(daysAgo(180)),
    residentId: demoResident.id,
  },
  {
    id: "usr-0007-resident",
    username: "resident.galang",
    email: "andres.galang@example.ph",
    fullName: "Andres T. Galang",
    role: "resident",
    status: "Suspended",
    position: "Resident",
    lastLoginAt: iso(daysAgo(41)),
    createdAt: iso(daysAgo(210)),
    residentId: residents[8]?.id ?? null,
  },
];

/* ------------------------------------------------------------------ */
/* Public facilities (simulated GIS reference points)                  */
/* ------------------------------------------------------------------ */

const facilities: Facility[] = [
  {
    id: "fac-0001-hall",
    name: "Barangay Hall  Sta. Cruz",
    category: "Government",
    description: "Office of the Punong Barangay, Barangay Secretary and Treasurer. Front desk for document requests and blotter intake.",
    address: "Sampaguita St., Purok 2, Brgy. Sta. Cruz",
    contactNumber: "(02) 8000-0000",
    geo: { lat: 14.65158, lng: 121.04901 },
  },
  {
    id: "fac-0002-health",
    name: "Barangay Health Center",
    category: "Health",
    description: "Primary health services, maternal care, immunization and BHW station.",
    address: "Ilang-Ilang St., Purok 3, Brgy. Sta. Cruz",
    contactNumber: "(02) 8000-0001",
    geo: { lat: 14.65312, lng: 121.05134 },
  },
  {
    id: "fac-0003-daycare",
    name: "Barangay Daycare Center",
    category: "Education",
    description: "Early childhood care and development center.",
    address: "Camia St., Purok 4, Brgy. Sta. Cruz",
    contactNumber: "(02) 8000-0002",
    geo: { lat: 14.64921, lng: 121.05077 },
  },
  {
    id: "fac-0004-court",
    name: "Covered Court & Multipurpose Hall",
    category: "Community",
    description: "Barangay assemblies, sports activities and community events.",
    address: "Mabuhay Ave., Purok 2, Brgy. Sta. Cruz",
    contactNumber: "",
    geo: { lat: 14.65066, lng: 121.04742 },
  },
  {
    id: "fac-0005-outpost1",
    name: "Tanod Outpost 1",
    category: "Safety",
    description: "Barangay peacekeeping outpost  northern sector.",
    address: "Narra St., Purok 1, Brgy. Sta. Cruz",
    contactNumber: "(02) 8000-0003",
    geo: { lat: 14.65568, lng: 121.04812 },
  },
  {
    id: "fac-0006-outpost2",
    name: "Tanod Outpost 2",
    category: "Safety",
    description: "Barangay peacekeeping outpost  southern sector.",
    address: "Rosal St., Purok 6, Brgy. Sta. Cruz",
    contactNumber: "(02) 8000-0004",
    geo: { lat: 14.64672, lng: 121.04988 },
  },
  {
    id: "fac-0007-school",
    name: "Sta. Cruz Elementary School (simulated)",
    category: "Education",
    description: "Public elementary school serving the barangay (fictional reference point).",
    address: "Maharlika St., Purok 5, Brgy. Sta. Cruz",
    contactNumber: "(02) 8000-0005",
    geo: { lat: 14.64825, lng: 121.04618 },
  },
  {
    id: "fac-0008-seniors",
    name: "Senior Citizens Center",
    category: "Community",
    description: "OSCA satellite desk and senior citizens' activity center.",
    address: "Adelfa St., Purok 3, Brgy. Sta. Cruz",
    contactNumber: "",
    geo: { lat: 14.65228, lng: 121.04653 },
  },
  {
    id: "fac-0009-mrf",
    name: "Materials Recovery Facility",
    category: "Government",
    description: "Barangay solid waste segregation and recovery facility.",
    address: "Pag-asa St., Purok 7, Brgy. Sta. Cruz",
    contactNumber: "",
    geo: { lat: 14.64588, lng: 121.04729 },
  },
];

/* ------------------------------------------------------------------ */
/* Announcements, notifications, activity                              */
/* ------------------------------------------------------------------ */

const announcements: Announcement[] = [
  {
    id: uid("ann"),
    title: "Free Anti-Rabies Vaccination Drive",
    body: "The Barangay Health Center will conduct a free anti-rabies vaccination for pets on Saturday, 8:00 AM – 3:00 PM at the covered court. Bring your pet on a leash or in a carrier.",
    category: "Health",
    postedAt: iso(daysAgo(2)),
    postedBy: "Committee on Health & Sanitation",
  },
  {
    id: uid("ann"),
    title: "Scheduled Water Interruption  Purok 3 & 4",
    body: "A scheduled water service interruption will take place from 10:00 PM to 4:00 AM due to pipeline maintenance. Residents are advised to store water in advance.",
    category: "Advisory",
    postedAt: iso(daysAgo(5)),
    postedBy: "Office of the Punong Barangay",
  },
  {
    id: uid("ann"),
    title: "Barangay Assembly  Quarterly Report",
    body: "All household heads are invited to the quarterly barangay assembly at the multipurpose hall. The financial report and upcoming projects will be presented.",
    category: "Governance",
    postedAt: iso(daysAgo(9)),
    postedBy: "Barangay Secretary",
  },
  {
    id: uid("ann"),
    title: "Online Document Requests Now Available",
    body: "Certificates and clearances may now be requested through the BIMS-BIPS resident portal. Processing takes 1–3 working days.",
    category: "Services",
    postedAt: iso(daysAgo(14)),
    postedBy: "Barangay Information Office",
  },
];

const notifications: AppNotification[] = [
  {
    id: uid("ntf"),
    audience: "resident",
    residentId: demoResident.id,
    title: "Certificate ready for release",
    message: "Your Certificate of Residency (CTF-2026-0101) is ready for pick-up at the Barangay Hall.",
    level: "success",
    at: iso(daysAgo(1)),
    read: false,
  },
  {
    id: uid("ntf"),
    audience: "resident",
    residentId: demoResident.id,
    title: "Clearance request received",
    message: "Your Barangay Clearance request (CLR-2026-0087) has been received and is pending review.",
    level: "info",
    at: iso(daysAgo(1)),
    read: false,
  },
  {
    id: uid("ntf"),
    audience: "resident",
    residentId: demoResident.id,
    title: "Barangay assembly reminder",
    message: "The quarterly barangay assembly will be held this Sunday at the multipurpose hall.",
    level: "info",
    at: iso(daysAgo(6)),
    read: true,
  },
  {
    id: uid("ntf"),
    audience: "admin",
    title: "12 clearance requests awaiting action",
    message: "Pending clearance requests have exceeded the 10-item threshold for today.",
    level: "warning",
    at: iso(daysAgo(0)),
    read: false,
  },
  {
    id: uid("ntf"),
    audience: "admin",
    title: "Resident profiling backlog",
    message: "8 walk-in profiling forms from Purok 5 have not yet been encoded.",
    level: "info",
    at: iso(daysAgo(1)),
    read: false,
  },
];

const activity: ActivityLog[] = [
  ["Rosalinda M. Ventura", "Approved", "Certificates", "Approved CTF-2026-0101  Certificate of Residency"],
  ["Joselito P. Carpio", "Released", "Clearances", "Released CLR-2026-0075 with OR-448120"],
  ["Teresita B. Galang", "Created", "Residents", "Encoded new resident profile SC-2024-00238"],
  ["Rosalinda M. Ventura", "Updated", "Households", "Updated household HH-P3-0021 members"],
  ["Ferdinand A. Macaraeg", "Updated", "Roles & Permissions", "Adjusted permissions for Barangay Staff / Official"],
  ["Joselito P. Carpio", "Registered", "Blotter", "Filed incident BLT-2026-0038  Noise Complaint"],
  ["Teresita B. Galang", "Generated", "Reports", "Generated Resident Population Summary (Q1)"],
].map(([actor, action, module, description], i) => ({
  id: uid("act"),
  at: iso(daysAgo(i)),
  actor,
  action,
  module,
  description,
}));

/* ------------------------------------------------------------------ */
/* Exported store                                                      */
/* ------------------------------------------------------------------ */

export const db = {
  residents,
  households,
  officials,
  blotter,
  certificates,
  clearances,
  users,
  roles,
  announcements,
  notifications,
  activity,
  facilities,
  demoResidentId: demoResident.id,
  counters: { resident: residentSeq, household: householdSeq, blotter: 38, cert: 200, clr: 200 },
};

export function logActivity(entry: Omit<ActivityLog, "id" | "at">) {
  db.activity.unshift({ id: uid("act"), at: new Date().toISOString(), ...entry });
  db.activity = db.activity.slice(0, 60);
}

export function pushNotification(n: Omit<AppNotification, "id" | "at" | "read">) {
  db.notifications.unshift({
    id: uid("ntf"),
    at: new Date().toISOString(),
    read: false,
    ...n,
  });
}
