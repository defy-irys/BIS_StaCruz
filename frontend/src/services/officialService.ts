import { db, logActivity, uid } from "@/mock/db";
import type { ListQuery, Official, OfficialInput, Paginated, UUID } from "@/types";
import { ApiError, clone, matches, mockRequest, paginate, sortBy } from "./http";

export interface OfficialQuery extends ListQuery {
  status?: Official["status"] | "";
  position?: string;
}

export const officialService = {
  /** GET /officials */
  async listOfficials(query: OfficialQuery = {}): Promise<Paginated<Official>> {
    return mockRequest(() => {
      const items = db.officials.filter((o) => {
        if (query.status && o.status !== query.status) return false;
        if (query.position && o.position !== query.position) return false;
        return matches([o.fullName, o.position, o.committee, o.email, o.contactNumber], query.search);
      });
      return paginate(clone(sortBy(items, query.sortBy ?? "position", query.sortDir ?? "asc")), query);
    });
  },

  /** GET /officials/{id} */
  async getOfficial(id: UUID): Promise<Official> {
    return mockRequest(() => {
      const found = db.officials.find((o) => o.id === id);
      if (!found) throw new ApiError("Official record not found.", 404);
      return clone(found);
    });
  },

  /** POST /officials */
  async createOfficial(data: OfficialInput, actor = "System"): Promise<Official> {
    return mockRequest(() => {
      const now = new Date().toISOString();
      const record: Official = { ...data, id: uid("off"), createdAt: now, updatedAt: now };
      db.officials.unshift(record);
      logActivity({
        actor,
        action: "Created",
        module: "Officials",
        description: `Added ${record.position}  ${record.fullName}`,
      });
      return clone(record);
    });
  },

  /** PATCH /officials/{id} */
  async updateOfficial(id: UUID, data: Partial<OfficialInput>, actor = "System"): Promise<Official> {
    return mockRequest(() => {
      const idx = db.officials.findIndex((o) => o.id === id);
      if (idx === -1) throw new ApiError("Official record not found.", 404);
      const updated = { ...db.officials[idx], ...data, updatedAt: new Date().toISOString() };
      db.officials[idx] = updated;
      logActivity({
        actor,
        action: "Updated",
        module: "Officials",
        description: `Updated official record  ${updated.fullName}`,
      });
      return clone(updated);
    });
  },

  /** POST /officials/{id}/archive */
  async setStatus(id: UUID, status: Official["status"], actor = "System"): Promise<Official> {
    return mockRequest(() => {
      const record = db.officials.find((o) => o.id === id);
      if (!record) throw new ApiError("Official record not found.", 404);
      record.status = status;
      record.updatedAt = new Date().toISOString();
      logActivity({
        actor,
        action: status === "Archived" ? "Archived" : "Updated",
        module: "Officials",
        description: `${record.fullName} marked as ${status}`,
      });
      return clone(record);
    });
  },

  async listPositions(): Promise<string[]> {
    return mockRequest(() => Array.from(new Set(db.officials.map((o) => o.position))).sort(), {
      min: 60,
      max: 120,
    });
  },
};
