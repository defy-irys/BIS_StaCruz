import { db } from "@/mock/db";
import type { ActivityLog } from "@/types";
import { mockRequest } from "./http";

/**
 * Daily catch-up summary.
 *
 * Computed from the same dataset used by the dashboard and analytics services
 * (no competing mock architecture). Passing a `sinceISO` window keeps the
 * implementation backend-ready - this will map to GET /dashboard/daily-summary
 * once the FastAPI service is wired.
 */

export type CatchupIcon =
  | "residents"
  | "households"
  | "certificates"
  | "clearances"
  | "blotter";

export interface CatchupActivity {
  key: string;
  icon: CatchupIcon;
  count: number;
  label: string;
  detail: string;
  to?: string;
}

export interface CatchupAttention {
  label: string;
  count: number;
  detail: string;
  to?: string;
}

export interface CatchupSummary {
  activity: CatchupActivity[];
  attention: CatchupAttention[];
  recentActivity: ActivityLog[];
  hasActivity: boolean;
}

export const catchupService = {
  /** GET /dashboard/daily-summary?since={sinceISO} */
  async getDailySummary(sinceISO: string): Promise<CatchupSummary> {
    return mockRequest(
      () => {
        const after = (iso: string) => iso >= sinceISO;

        const newResidents = db.residents.filter((r) => after(r.createdAt)).length;
        const newHouseholds = db.households.filter((h) => after(h.createdAt)).length;
        const newCertificates = db.certificates.filter((c) => after(c.requestedAt)).length;
        const newClearances = db.clearances.filter((c) => after(c.requestedAt)).length;
        const newBlotter = db.blotter.filter((b) => after(b.reportedAt)).length;

        const pendingClearances = db.clearances.filter((c) => c.status === "Pending").length;
        const openBlotter = db.blotter.filter(
          (b) => b.status === "Pending" || b.status === "Under Investigation",
        ).length;
        const certsAwaiting = db.certificates.filter((c) =>
          ["Submitted", "Under Review", "Approved", "Ready for Release"].includes(c.status),
        ).length;

        const activity: CatchupActivity[] = [];
        if (newResidents > 0)
          activity.push({
            key: "residents",
            icon: "residents",
            count: newResidents,
            label: "New Residents",
            detail: "Added to the registry",
            to: "/admin/residents",
          });
        if (newHouseholds > 0)
          activity.push({
            key: "households",
            icon: "households",
            count: newHouseholds,
            label: "Households",
            detail: "Registered in the barangay",
            to: "/admin/households",
          });
        if (newCertificates > 0)
          activity.push({
            key: "certificates",
            icon: "certificates",
            count: newCertificates,
            label: "Certificate Requests",
            detail: "Filed by residents and staff",
            to: "/admin/certificates",
          });
        if (newClearances > 0)
          activity.push({
            key: "clearances",
            icon: "clearances",
            count: newClearances,
            label: "Clearance Requests",
            detail: "Submitted for review",
            to: "/admin/clearances",
          });
        if (newBlotter > 0)
          activity.push({
            key: "blotter",
            icon: "blotter",
            count: newBlotter,
            label: "Incident Reports",
            detail: "Recorded in the blotter",
            to: "/admin/blotter",
          });

        const attention: CatchupAttention[] = [];
        if (pendingClearances > 0)
          attention.push({
            label: "Clearance requests awaiting review",
            count: pendingClearances,
            detail: "Pending action from records staff",
            to: "/admin/clearances?status=Pending",
          });
        if (openBlotter > 0)
          attention.push({
            label: "Incident cases not yet closed",
            count: openBlotter,
            detail: "Pending or under investigation",
            to: "/admin/blotter",
          });
        if (certsAwaiting > 0)
          attention.push({
            label: "Certificate requests still in progress",
            count: certsAwaiting,
            detail: "Submitted or under review",
            to: "/admin/certificates",
          });

        return {
          activity,
          attention,
          recentActivity: db.activity.slice(0, 4),
          hasActivity: activity.length > 0 || attention.length > 0,
        };
      },
      { min: 220, max: 460 },
    );
  },
};
