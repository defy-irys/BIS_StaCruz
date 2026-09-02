import { db } from "@/mock/db";
import { calcAge } from "@/lib/format";
import type {
  ActivityLog,
  Announcement,
  AppNotification,
  BlotterRecord,
  CertificateRequest,
  ClearanceRequest,
  DashboardMetrics,
  Resident,
  SystemStatus,
  UUID,
} from "@/types";
import { clone, mockRequest } from "./http";

/* Dashboard*/

export interface DashboardPayload {
  metrics: DashboardMetrics;
  recentResidents: Resident[];
  pendingClearances: ClearanceRequest[];
  recentBlotter: BlotterRecord[];
  recentCertificates: CertificateRequest[];
  activity: ActivityLog[];
  systemStatus: SystemStatus[];
}

function monthKey(iso: string) {
  return iso.slice(0, 7);
}

export const dashboardService = {
  /** GET /dashboard/summary */
  async getDashboard(): Promise<DashboardPayload> {
    return mockRequest(() => {
      const thisMonth = new Date().toISOString().slice(0, 7);
      const metrics: DashboardMetrics = {
        totalResidents: db.residents.length,
        activeResidents: db.residents.filter((r) => r.status === "Active").length,
        totalHouseholds: db.households.length,
        pendingClearances: db.clearances.filter((c) => c.status === "Pending").length,
        openBlotter: db.blotter.filter(
          (b) => b.status === "Pending" || b.status === "Under Investigation",
        ).length,
        certificatesThisMonth: db.certificates.filter(
          (c) => monthKey(c.requestedAt) === thisMonth,
        ).length,
        registeredVoters: db.residents.filter((r) => r.voterStatus === "Registered").length,
        seniorCitizens: db.residents.filter((r) => calcAge(r.birthDate) >= 60).length,
      };

      const systemStatus: SystemStatus[] = [
        {
          component: "Frontend (React + Vite)",
          state: "operational",
          detail: "Prototype build running in the browser",
        },
        {
          component: "API Gateway (FastAPI)",
          state: "simulated",
          detail: "Requests resolved by the in-memory mock service layer",
        },
        {
          component: "Database (PostgreSQL)",
          state: "simulated",
          detail: "No live database connected in this prototype",
        },
        {
          component: "Last synchronisation",
          state: "simulated",
          detail: `Session data seeded at ${new Date().toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })}`,
        },
      ];

      return clone({
        metrics,
        recentResidents: [...db.residents]
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .slice(0, 6),
        pendingClearances: db.clearances.filter((c) => c.status === "Pending").slice(0, 6),
        recentBlotter: db.blotter.slice(0, 5),
        recentCertificates: db.certificates.slice(0, 6),
        activity: db.activity.slice(0, 8),
        systemStatus,
      });
    });
  },
};

/* Analytics*/

export interface Series {
  label: string;
  value: number;
}

export interface AnalyticsPayload {
  ageDistribution: Series[];
  sexDistribution: Series[];
  civilStatus: Series[];
  voterDistribution: Series[];
  householdSize: Series[];
  populationByPurok: Series[];
  documentVolume: { month: string; certificates: number; clearances: number }[];
  blotterByStatus: Series[];
  specialSectors: Series[];
}

export const analyticsService = {
  /** GET /analytics/overview */
  async getAnalytics(): Promise<AnalyticsPayload> {
    return mockRequest(() => {
      const buckets = [
        { label: "0–14", min: 0, max: 14 },
        { label: "15–24", min: 15, max: 24 },
        { label: "25–39", min: 25, max: 39 },
        { label: "40–59", min: 40, max: 59 },
        { label: "60+", min: 60, max: 200 },
      ];
      const ageDistribution = buckets.map((b) => ({
        label: b.label,
        value: db.residents.filter((r) => {
          const a = calcAge(r.birthDate);
          return a >= b.min && a <= b.max;
        }).length,
      }));

      const sexDistribution = ["Male", "Female"].map((s) => ({
        label: s,
        value: db.residents.filter((r) => r.sex === s).length,
      }));

      const civilStatus = ["Single", "Married", "Widowed", "Separated", "Annulled"]
        .map((s) => ({ label: s, value: db.residents.filter((r) => r.civilStatus === s).length }))
        .filter((s) => s.value > 0);

      const voterDistribution = [
        { label: "Registered", value: db.residents.filter((r) => r.voterStatus === "Registered").length },
        { label: "Not registered", value: db.residents.filter((r) => r.voterStatus !== "Registered").length },
      ];

      const sizeBuckets = ["1", "2–3", "4–5", "6+"];
      const householdSize = sizeBuckets.map((label) => ({ label, value: 0 }));
      db.households.forEach((h) => {
        const n = db.residents.filter((r) => r.householdId === h.id).length;
        const idx = n <= 1 ? 0 : n <= 3 ? 1 : n <= 5 ? 2 : 3;
        householdSize[idx].value += 1;
      });

      const purokMap = new Map<string, number>();
      db.residents.forEach((r) => {
        purokMap.set(r.address.purok, (purokMap.get(r.address.purok) ?? 0) + 1);
      });
      const populationByPurok = Array.from(purokMap.entries())
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => a.label.localeCompare(b.label));

      const months: { month: string; certificates: number; clearances: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setDate(1);
        d.setMonth(d.getMonth() - i);
        const key = d.toISOString().slice(0, 7);
        months.push({
          month: d.toLocaleDateString("en-PH", { month: "short" }),
          certificates: db.certificates.filter((c) => monthKey(c.requestedAt) === key).length,
          clearances: db.clearances.filter((c) => monthKey(c.requestedAt) === key).length,
        });
      }

      const blotterByStatus = ["Pending", "Under Investigation", "Resolved", "Closed"].map((s) => ({
        label: s,
        value: db.blotter.filter((b) => b.status === s).length,
      }));

      const specialSectors = [
        { label: "Senior citizens", value: db.residents.filter((r) => calcAge(r.birthDate) >= 60).length },
        { label: "PWD", value: db.residents.filter((r) => r.isPwd).length },
        { label: "4Ps beneficiaries", value: db.residents.filter((r) => r.is4Ps).length },
        { label: "Solo parents", value: db.residents.filter((r) => r.isSoloParent).length },
        { label: "Minors (under 18)", value: db.residents.filter((r) => calcAge(r.birthDate) < 18).length },
      ];

      return {
        ageDistribution,
        sexDistribution,
        civilStatus,
        voterDistribution,
        householdSize,
        populationByPurok,
        documentVolume: months,
        blotterByStatus,
        specialSectors,
      };
    }, { min: 320, max: 640 });
  },
};

/* Reports                                                             */

export type ReportKey =
  | "resident-population"
  | "household-statistics"
  | "certificates-issued"
  | "clearances-processed"
  | "blotter-incidents"
  | "demographic-summary";

export interface ReportDefinition {
  key: ReportKey;
  title: string;
  description: string;
  category: "Population" | "Transactions" | "Peace & Order";
  columns: string[];
}

export interface ReportResult {
  definition: ReportDefinition;
  generatedAt: string;
  parameters: { label: string; value: string }[];
  columns: string[];
  rows: (string | number)[][];
  summary: { label: string; value: string }[];
  note: string;
}

export const REPORT_DEFINITIONS: ReportDefinition[] = [
  {
    key: "resident-population",
    title: "Resident Population Report",
    description: "Registered residents grouped by purok with sex and voter breakdown.",
    category: "Population",
    columns: ["Purok", "Residents", "Male", "Female", "Registered voters", "Senior citizens"],
  },
  {
    key: "household-statistics",
    title: "Household Statistics Report",
    description: "Household counts, average size and tenure type per purok.",
    category: "Population",
    columns: ["Purok", "Households", "Members", "Average size", "Owned", "Rented"],
  },
  {
    key: "certificates-issued",
    title: "Certificates Report",
    description: "Certificate requests filtered by the selected reporting period.",
    category: "Transactions",
    columns: ["Certificate type", "Requests", "Released", "Pending", "Rejected", "Collected fees"],
  },
  {
    key: "clearances-processed",
    title: "Clearances Report",
    description: "Clearance requests with processing outcome and collections.",
    category: "Transactions",
    columns: ["Clearance type", "Requests", "Released", "Pending", "Rejected", "Collected fees"],
  },
  {
    key: "blotter-incidents",
    title: "Blotter Incident Report",
    description: "Incidents recorded by type with current case status.",
    category: "Peace & Order",
    columns: ["Incident type", "Cases", "Pending", "Under investigation", "Resolved", "Closed"],
  },
  {
    key: "demographic-summary",
    title: "Demographic Summary",
    description: "Age structure, civil status and special sector counts.",
    category: "Population",
    columns: ["Indicator", "Count", "Share of population"],
  },
];

function inRange(isoDate: string, from: string, to: string) {
  const d = isoDate.slice(0, 10);
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

export const reportService = {
  async listDefinitions(): Promise<ReportDefinition[]> {
    return mockRequest(() => clone(REPORT_DEFINITIONS), { min: 80, max: 160 });
  },

  /** POST /reports/{key}/generate */
  async generate(key: ReportKey, params: { from: string; to: string; purok?: string }): Promise<ReportResult> {
    return mockRequest(
      () => {
        const definition = REPORT_DEFINITIONS.find((d) => d.key === key)!;
        const { from, to, purok } = params;
        const rows: (string | number)[][] = [];
        const summary: { label: string; value: string }[] = [];

        const residents = db.residents.filter((r) => (purok ? r.address.purok === purok : true));

        if (key === "resident-population") {
          const puroks = Array.from(new Set(residents.map((r) => r.address.purok))).sort();
          puroks.forEach((p) => {
            const set = residents.filter((r) => r.address.purok === p);
            rows.push([
              p,
              set.length,
              set.filter((r) => r.sex === "Male").length,
              set.filter((r) => r.sex === "Female").length,
              set.filter((r) => r.voterStatus === "Registered").length,
              set.filter((r) => calcAge(r.birthDate) >= 60).length,
            ]);
          });
          summary.push(
            { label: "Total residents", value: String(residents.length) },
            { label: "Registered voters", value: String(residents.filter((r) => r.voterStatus === "Registered").length) },
            { label: "Puroks covered", value: String(puroks.length) },
          );
        }

        if (key === "household-statistics") {
          const households = db.households.filter((h) => (purok ? h.address.purok === purok : true));
          const puroks = Array.from(new Set(households.map((h) => h.address.purok))).sort();
          puroks.forEach((p) => {
            const set = households.filter((h) => h.address.purok === p);
            const members = set.reduce(
              (acc, h) => acc + db.residents.filter((r) => r.householdId === h.id).length,
              0,
            );
            rows.push([
              p,
              set.length,
              members,
              set.length ? (members / set.length).toFixed(1) : "0.0",
              set.filter((h) => h.householdType === "Owned").length,
              set.filter((h) => h.householdType === "Rented").length,
            ]);
          });
          summary.push(
            { label: "Total households", value: String(households.length) },
            {
              label: "Average household size",
              value: households.length
                ? (
                    households.reduce(
                      (acc, h) => acc + db.residents.filter((r) => r.householdId === h.id).length,
                      0,
                    ) / households.length
                  ).toFixed(1)
                : "0.0",
            },
          );
        }

        if (key === "certificates-issued") {
          const set = db.certificates.filter((c) => inRange(c.requestedAt, from, to));
          const types = Array.from(new Set(set.map((c) => c.certificateType))).sort();
          types.forEach((t) => {
            const g = set.filter((c) => c.certificateType === t);
            rows.push([
              t,
              g.length,
              g.filter((c) => c.status === "Released").length,
              g.filter((c) => !["Released", "Rejected"].includes(c.status)).length,
              g.filter((c) => c.status === "Rejected").length,
              `₱${g.filter((c) => c.status === "Released").reduce((a, c) => a + c.fee, 0).toLocaleString("en-PH")}`,
            ]);
          });
          summary.push(
            { label: "Requests in period", value: String(set.length) },
            { label: "Released", value: String(set.filter((c) => c.status === "Released").length) },
          );
        }

        if (key === "clearances-processed") {
          const set = db.clearances.filter((c) => inRange(c.requestedAt, from, to));
          const types = Array.from(new Set(set.map((c) => c.clearanceType))).sort();
          types.forEach((t) => {
            const g = set.filter((c) => c.clearanceType === t);
            rows.push([
              t,
              g.length,
              g.filter((c) => c.status === "Released").length,
              g.filter((c) => c.status === "Pending" || c.status === "Approved").length,
              g.filter((c) => c.status === "Rejected").length,
              `₱${g.filter((c) => c.status === "Released").reduce((a, c) => a + c.fee, 0).toLocaleString("en-PH")}`,
            ]);
          });
          summary.push(
            { label: "Requests in period", value: String(set.length) },
            { label: "Released", value: String(set.filter((c) => c.status === "Released").length) },
          );
        }

        if (key === "blotter-incidents") {
          const set = db.blotter.filter((b) => inRange(b.reportedAt, from, to));
          const types = Array.from(new Set(set.map((b) => b.incidentType))).sort();
          types.forEach((t) => {
            const g = set.filter((b) => b.incidentType === t);
            rows.push([
              t,
              g.length,
              g.filter((b) => b.status === "Pending").length,
              g.filter((b) => b.status === "Under Investigation").length,
              g.filter((b) => b.status === "Resolved").length,
              g.filter((b) => b.status === "Closed").length,
            ]);
          });
          summary.push(
            { label: "Incidents in period", value: String(set.length) },
            {
              label: "Open cases",
              value: String(
                set.filter((b) => b.status === "Pending" || b.status === "Under Investigation").length,
              ),
            },
          );
        }

        if (key === "demographic-summary") {
          const total = residents.length || 1;
          const add = (label: string, count: number) =>
            rows.push([label, count, `${((count / total) * 100).toFixed(1)}%`]);
          add("Children (0–14)", residents.filter((r) => calcAge(r.birthDate) <= 14).length);
          add("Youth (15–24)", residents.filter((r) => { const a = calcAge(r.birthDate); return a >= 15 && a <= 24; }).length);
          add("Adults (25–59)", residents.filter((r) => { const a = calcAge(r.birthDate); return a >= 25 && a <= 59; }).length);
          add("Senior citizens (60+)", residents.filter((r) => calcAge(r.birthDate) >= 60).length);
          add("Male", residents.filter((r) => r.sex === "Male").length);
          add("Female", residents.filter((r) => r.sex === "Female").length);
          add("Married", residents.filter((r) => r.civilStatus === "Married").length);
          add("Single", residents.filter((r) => r.civilStatus === "Single").length);
          add("Persons with disability", residents.filter((r) => r.isPwd).length);
          add("4Ps beneficiaries", residents.filter((r) => r.is4Ps).length);
          add("Solo parents", residents.filter((r) => r.isSoloParent).length);
          summary.push({ label: "Population base", value: String(residents.length) });
        }

        return {
          definition,
          generatedAt: new Date().toISOString(),
          parameters: [
            { label: "Period", value: from && to ? `${from} to ${to}` : "All available records" },
            { label: "Purok", value: purok || "All puroks" },
            { label: "Barangay", value: "Sta. Cruz, Quezon City" },
          ],
          columns: definition.columns,
          rows,
          summary,
          note: "Generated from simulated prototype data. Not an official barangay document.",
        };
      },
      { min: 600, max: 1100 },
    );
  },
};


/* GIS  moved to src/services/gisService.ts*/



/* Notifications, announcements & activity*/


export const notificationService = {
  async listForAdmin(): Promise<AppNotification[]> {
    return mockRequest(() => clone(db.notifications.filter((n) => n.audience === "admin")), {
      min: 120,
      max: 260,
    });
  },

  async listForResident(residentId: UUID): Promise<AppNotification[]> {
    return mockRequest(() =>
      clone(
        db.notifications.filter((n) => n.audience === "resident" && n.residentId === residentId),
      ),
    );
  },

  async markRead(id: UUID): Promise<void> {
    return mockRequest(() => {
      const n = db.notifications.find((x) => x.id === id);
      if (n) n.read = true;
    }, { min: 80, max: 160 });
  },

  async markAllRead(audience: "admin" | "resident", residentId?: UUID): Promise<void> {
    return mockRequest(() => {
      db.notifications
        .filter((n) => n.audience === audience && (!residentId || n.residentId === residentId))
        .forEach((n) => {
          n.read = true;
        });
    }, { min: 120, max: 240 });
  },
};

export const announcementService = {
  async list(): Promise<Announcement[]> {
    return mockRequest(() => clone(db.announcements));
  },
};

export const activityService = {
  async list(limit = 40): Promise<ActivityLog[]> {
    return mockRequest(() => clone(db.activity.slice(0, limit)));
  },
};
