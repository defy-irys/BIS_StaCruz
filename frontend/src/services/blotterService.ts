import { db, logActivity, uid } from "@/mock/db";
import type {
  BlotterInput,
  BlotterQuery,
  BlotterRecord,
  BlotterStatus,
  Paginated,
  UUID,
} from "@/types";
import { ApiError, clone, matches, mockRequest, paginate, sortBy } from "./http";

export const BLOTTER_STATUSES: BlotterStatus[] = [
  "Pending",
  "Under Investigation",
  "Resolved",
  "Closed",
];

export const INCIDENT_TYPES = [
  "Noise Complaint",
  "Physical Altercation",
  "Property Dispute",
  "Theft",
  "Verbal Threat",
  "Trespassing",
  "Neighbor Dispute",
  "Unpaid Debt",
  "Vandalism",
  "Curfew Violation",
  "Other",
];

export const blotterService = {
  /** GET /blotter */
  async listBlotter(query: BlotterQuery = {}): Promise<Paginated<BlotterRecord>> {
    return mockRequest(() => {
      const items = db.blotter.filter((b) => {
        if (query.status && b.status !== query.status) return false;
        if (query.incidentType && b.incidentType !== query.incidentType) return false;
        return matches(
          [b.caseNo, b.complainantName, b.respondentName, b.incidentType, b.location, b.assignedTo],
          query.search,
        );
      });
      return paginate(
        clone(sortBy(items, query.sortBy ?? "reportedAt", query.sortDir ?? "desc")),
        query,
      );
    });
  },

  /** GET /blotter/{id} */
  async getCase(id: UUID): Promise<BlotterRecord> {
    return mockRequest(() => {
      const found = db.blotter.find((b) => b.id === id);
      if (!found) throw new ApiError("Blotter record not found.", 404);
      return clone(found);
    });
  },

  /** POST /blotter */
  async createCase(data: BlotterInput, actor = "System"): Promise<BlotterRecord> {
    return mockRequest(
      () => {
        db.counters.blotter += 1;
        const now = new Date().toISOString();
        const record: BlotterRecord = {
          ...data,
          id: uid("blt"),
          caseNo: `BLT-${new Date().getFullYear()}-${String(db.counters.blotter).padStart(4, "0")}`,
          reportedAt: now,
          notes: [],
          history: [
            {
              id: uid("evt"),
              at: now,
              from: "",
              to: data.status,
              actor,
              note: "Incident logged at the barangay desk.",
            },
          ],
          createdAt: now,
          updatedAt: now,
        };
        db.blotter.unshift(record);
        logActivity({
          actor,
          action: "Registered",
          module: "Blotter",
          description: `Filed incident ${record.caseNo}  ${record.incidentType}`,
        });
        return clone(record);
      },
      { min: 380, max: 700 },
    );
  },

  /** PATCH /blotter/{id} */
  async updateCase(id: UUID, data: Partial<BlotterInput>, actor = "System"): Promise<BlotterRecord> {
    return mockRequest(() => {
      const idx = db.blotter.findIndex((b) => b.id === id);
      if (idx === -1) throw new ApiError("Blotter record not found.", 404);
      const updated = { ...db.blotter[idx], ...data, updatedAt: new Date().toISOString() };
      db.blotter[idx] = updated;
      logActivity({
        actor,
        action: "Updated",
        module: "Blotter",
        description: `Updated case ${updated.caseNo}`,
      });
      return clone(updated);
    });
  },

  /** POST /blotter/{id}/status */
  async changeStatus(
    id: UUID,
    to: BlotterStatus,
    note: string,
    actor = "System",
  ): Promise<BlotterRecord> {
    return mockRequest(() => {
      const record = db.blotter.find((b) => b.id === id);
      if (!record) throw new ApiError("Blotter record not found.", 404);
      if (record.status === to) throw new ApiError(`Case is already marked as ${to}.`, 409);
      record.history.push({
        id: uid("evt"),
        at: new Date().toISOString(),
        from: record.status,
        to,
        actor,
        note: note || "Status updated.",
      });
      record.status = to;
      if (to === "Resolved" && note) record.resolution = note;
      record.updatedAt = new Date().toISOString();
      logActivity({
        actor,
        action: "Status changed",
        module: "Blotter",
        description: `${record.caseNo} moved to ${to}`,
      });
      return clone(record);
    });
  },

  /** POST /blotter/{id}/notes */
  async addNote(id: UUID, body: string, author: string): Promise<BlotterRecord> {
    return mockRequest(() => {
      const record = db.blotter.find((b) => b.id === id);
      if (!record) throw new ApiError("Blotter record not found.", 404);
      record.notes.unshift({ id: uid("note"), at: new Date().toISOString(), author, body });
      record.updatedAt = new Date().toISOString();
      return clone(record);
    });
  },
};
