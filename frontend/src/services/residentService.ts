import { db, logActivity, uid } from "@/mock/db";
import { calcAge } from "@/lib/format";
import type {
  Paginated,
  Resident,
  ResidentInput,
  ResidentQuery,
  UUID,
} from "@/types";
import { ApiError, clone, matches, mockRequest, paginate, sortBy } from "./http";

function filterResidents(query: ResidentQuery = {}) {
  let items = db.residents.filter((r) => {
    if (query.status && r.status !== query.status) return false;
    if (query.sex && r.sex !== query.sex) return false;
    if (query.voterStatus && r.voterStatus !== query.voterStatus) return false;
    if (query.civilStatus && r.civilStatus !== query.civilStatus) return false;
    if (query.purok && r.address.purok !== query.purok) return false;
    if (query.householdId && r.householdId !== query.householdId) return false;
    const age = calcAge(r.birthDate);
    if (query.minAge !== "" && query.minAge != null && age < query.minAge) return false;
    if (query.maxAge !== "" && query.maxAge != null && age > query.maxAge) return false;
    return matches(
      [
        r.firstName,
        r.middleName,
        r.lastName,
        `${r.firstName} ${r.lastName}`,
        r.residentNo,
        r.contactNumber,
        r.email,
        r.address.street,
        r.address.purok,
        r.occupation,
      ],
      query.search,
    );
  });

  items = sortBy(items, query.sortBy ?? "lastName", query.sortDir ?? "asc", (r, key) => {
    if (key === "age") return calcAge(r.birthDate);
    if (key === "name") return `${r.lastName} ${r.firstName}`;
    if (key === "purok") return r.address.purok;
    return (r as unknown as Record<string, unknown>)[key];
  });
  return items;
}

export const residentService = {
  /** GET /residents */
  async listResidents(query: ResidentQuery = {}): Promise<Paginated<Resident>> {
    return mockRequest(() => paginate(clone(filterResidents(query)), query));
  },

  /** GET /residents/{id} */
  async getResident(id: UUID): Promise<Resident> {
    return mockRequest(() => {
      const found = db.residents.find((r) => r.id === id);
      if (!found) throw new ApiError("Resident record not found.", 404);
      return clone(found);
    });
  },

  /** POST /residents */
  async createResident(data: ResidentInput, actor = "System"): Promise<Resident> {
    return mockRequest(
      () => {
        db.counters.resident += 1;
        const now = new Date().toISOString();
        const record: Resident = {
          ...data,
          id: uid("res"),
          residentNo: `SC-${new Date().getFullYear()}-${String(db.counters.resident).padStart(5, "0")}`,
          dateRegistered: now.slice(0, 10),
          createdAt: now,
          updatedAt: now,
        };
        db.residents.unshift(record);
        logActivity({
          actor,
          action: "Created",
          module: "Residents",
          description: `Encoded new resident profile ${record.residentNo}  ${record.firstName} ${record.lastName}`,
        });
        return clone(record);
      },
      { min: 380, max: 700 },
    );
  },

  /** PATCH /residents/{id} */
  async updateResident(id: UUID, data: Partial<ResidentInput>, actor = "System"): Promise<Resident> {
    return mockRequest(
      () => {
        const idx = db.residents.findIndex((r) => r.id === id);
        if (idx === -1) throw new ApiError("Resident record not found.", 404);
        const updated: Resident = {
          ...db.residents[idx],
          ...data,
          address: { ...db.residents[idx].address, ...(data.address ?? {}) },
          updatedAt: new Date().toISOString(),
        };
        db.residents[idx] = updated;
        logActivity({
          actor,
          action: "Updated",
          module: "Residents",
          description: `Updated resident profile ${updated.residentNo}  ${updated.firstName} ${updated.lastName}`,
        });
        return clone(updated);
      },
      { min: 320, max: 620 },
    );
  },

  /**
   * DELETE /residents/{id}
   * Soft-deactivation is the default: barangay records are legal documents and
   * should not be destroyed casually.
   */
  async deactivateResident(id: UUID, reason: string, actor = "System"): Promise<Resident> {
    return mockRequest(() => {
      const record = db.residents.find((r) => r.id === id);
      if (!record) throw new ApiError("Resident record not found.", 404);
      record.status = "Inactive";
      record.remarks = reason || record.remarks;
      record.updatedAt = new Date().toISOString();
      logActivity({
        actor,
        action: "Deactivated",
        module: "Residents",
        description: `Deactivated resident ${record.residentNo}  ${reason || "no reason provided"}`,
      });
      return clone(record);
    });
  },

  /** POST /residents/{id}/reactivate */
  async reactivateResident(id: UUID, actor = "System"): Promise<Resident> {
    return mockRequest(() => {
      const record = db.residents.find((r) => r.id === id);
      if (!record) throw new ApiError("Resident record not found.", 404);
      record.status = "Active";
      record.updatedAt = new Date().toISOString();
      logActivity({
        actor,
        action: "Reactivated",
        module: "Residents",
        description: `Reactivated resident ${record.residentNo}`,
      });
      return clone(record);
    });
  },

  /** Distinct purok values for filter controls. */
  async listPuroks(): Promise<string[]> {
    return mockRequest(
      () => Array.from(new Set(db.residents.map((r) => r.address.purok))).sort(),
      { min: 60, max: 140 },
    );
  },
};
