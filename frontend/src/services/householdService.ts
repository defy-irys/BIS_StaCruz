import { db, logActivity, uid } from "@/mock/db";
import type {
  Household,
  HouseholdInput,
  HouseholdQuery,
  HouseholdWithStats,
  Paginated,
  Resident,
  UUID,
} from "@/types";
import { ApiError, clone, matches, mockRequest, paginate, sortBy } from "./http";

function headName(h: Household) {
  const head = db.residents.find((r) => r.id === h.headResidentId);
  return head ? `${head.firstName} ${head.lastName}` : " unassigned ";
}

function memberCount(h: Household) {
  return db.residents.filter((r) => r.householdId === h.id).length;
}

function decorate(h: Household): HouseholdWithStats {
  return { ...clone(h), headName: headName(h), memberCount: memberCount(h) };
}

export const householdService = {
  /** GET /households */
  async listHouseholds(query: HouseholdQuery = {}): Promise<Paginated<HouseholdWithStats>> {
    return mockRequest(() => {
      let items = db.households.filter((h) => {
        if (query.purok && h.address.purok !== query.purok) return false;
        if (query.householdType && h.householdType !== query.householdType) return false;
        if (query.status && h.status !== query.status) return false;
        return matches(
          [h.householdNo, h.address.street, h.address.purok, h.address.houseNo, headName(h)],
          query.search,
        );
      });
      const decorated = items.map(decorate);
      const sorted = sortBy(decorated, query.sortBy ?? "householdNo", query.sortDir ?? "asc", (h, key) => {
        if (key === "purok") return h.address.purok;
        if (key === "members") return h.memberCount;
        return (h as unknown as Record<string, unknown>)[key];
      });
      return paginate(sorted, query);
    });
  },

  /** GET /households/{id} */
  async getHousehold(id: UUID): Promise<HouseholdWithStats> {
    return mockRequest(() => {
      const h = db.households.find((x) => x.id === id);
      if (!h) throw new ApiError("Household record not found.", 404);
      return decorate(h);
    });
  },

  /** GET /households/{id}/members */
  async listMembers(id: UUID): Promise<Resident[]> {
    return mockRequest(() =>
      clone(
        db.residents
          .filter((r) => r.householdId === id)
          .sort((a, b) => (a.relationshipToHead === "Head" ? -1 : b.relationshipToHead === "Head" ? 1 : 0)),
      ),
    );
  },

  /** POST /households */
  async createHousehold(data: HouseholdInput, actor = "System"): Promise<Household> {
    return mockRequest(
      () => {
        db.counters.household += 1;
        const now = new Date().toISOString();
        const record: Household = {
          ...data,
          id: uid("hh"),
          householdNo: `HH-${data.address.purok.replace("Purok ", "P")}-${String(db.counters.household).padStart(4, "0")}`,
          geo: {
            lat: 14.6512 + (Math.random() - 0.5) * 0.012,
            lng: 121.0492 + (Math.random() - 0.5) * 0.014,
          },
          createdAt: now,
          updatedAt: now,
        };
        db.households.unshift(record);
        logActivity({
          actor,
          action: "Created",
          module: "Households",
          description: `Registered household ${record.householdNo} at ${record.address.street}`,
        });
        return clone(record);
      },
      { min: 350, max: 650 },
    );
  },

  /** PATCH /households/{id} */
  async updateHousehold(id: UUID, data: Partial<HouseholdInput>, actor = "System"): Promise<Household> {
    return mockRequest(() => {
      const idx = db.households.findIndex((h) => h.id === id);
      if (idx === -1) throw new ApiError("Household record not found.", 404);
      const updated: Household = {
        ...db.households[idx],
        ...data,
        address: { ...db.households[idx].address, ...(data.address ?? {}) },
        updatedAt: new Date().toISOString(),
      };
      db.households[idx] = updated;
      logActivity({
        actor,
        action: "Updated",
        module: "Households",
        description: `Updated household ${updated.householdNo}`,
      });
      return clone(updated);
    });
  },

  /** POST /households/{id}/members */
  async addMember(householdId: UUID, residentId: UUID, relationship: string, actor = "System"): Promise<void> {
    return mockRequest(() => {
      const household = db.households.find((h) => h.id === householdId);
      const resident = db.residents.find((r) => r.id === residentId);
      if (!household || !resident) throw new ApiError("Household or resident not found.", 404);
      resident.householdId = householdId;
      resident.relationshipToHead = relationship;
      resident.address = { ...household.address };
      resident.updatedAt = new Date().toISOString();
      if (relationship === "Head") household.headResidentId = resident.id;
      logActivity({
        actor,
        action: "Updated",
        module: "Households",
        description: `Added ${resident.firstName} ${resident.lastName} to ${household.householdNo} as ${relationship}`,
      });
    });
  },

  /** DELETE /households/{id}/members/{residentId} */
  async removeMember(householdId: UUID, residentId: UUID, actor = "System"): Promise<void> {
    return mockRequest(() => {
      const household = db.households.find((h) => h.id === householdId);
      const resident = db.residents.find((r) => r.id === residentId);
      if (!household || !resident) throw new ApiError("Household or resident not found.", 404);
      if (household.headResidentId === residentId) {
        throw new ApiError(
          "The household head cannot be removed. Assign a new head first.",
          409,
        );
      }
      resident.householdId = null;
      resident.relationshipToHead = "";
      resident.updatedAt = new Date().toISOString();
      logActivity({
        actor,
        action: "Updated",
        module: "Households",
        description: `Removed ${resident.firstName} ${resident.lastName} from ${household.householdNo}`,
      });
    });
  },

  /** POST /households/{id}/head */
  async setHead(householdId: UUID, residentId: UUID, actor = "System"): Promise<void> {
    return mockRequest(() => {
      const household = db.households.find((h) => h.id === householdId);
      const resident = db.residents.find((r) => r.id === residentId);
      if (!household || !resident) throw new ApiError("Household or resident not found.", 404);
      const previous = db.residents.find((r) => r.id === household.headResidentId);
      if (previous) previous.relationshipToHead = "Member";
      household.headResidentId = residentId;
      resident.relationshipToHead = "Head";
      household.updatedAt = new Date().toISOString();
      logActivity({
        actor,
        action: "Updated",
        module: "Households",
        description: `Set ${resident.firstName} ${resident.lastName} as head of ${household.householdNo}`,
      });
    });
  },

  async listPuroks(): Promise<string[]> {
    return mockRequest(
      () => Array.from(new Set(db.households.map((h) => h.address.purok))).sort(),
      { min: 60, max: 120 },
    );
  },

  /** Lightweight lookup used by pickers / GIS. */
  async lookup(): Promise<HouseholdWithStats[]> {
    return mockRequest(() => db.households.map(decorate), { min: 120, max: 260 });
  },
};
