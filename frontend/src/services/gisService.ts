import { db } from "@/mock/db";
import { calcAge } from "@/lib/format";
import type { UUID } from "@/types";
import { clone, mockRequest } from "./http";

/**
 * GIS service - conceptual FastAPI contract for BIMS-BIPS / Barangay Sta. Cruz, Quezon City.
 *
 * All geographic representations in this prototype are SIMULATED and clearly
 * labelled as such. They use Quezon Memorial Circle for demonstration
 * purposes and are NOT official cadastral, survey, or government GIS data.
 * When the real backend is connected, these simulated features will be replaced
 * by actual geographic records served by the FastAPI GIS endpoints.
 */

/* Simulated geography*/

export const GEO_ANCHOR = { lat: 14.6512, lng: 121.0492 };

/** Simulated (non-authoritative) barangay boundary polygon. */
export const BARANGAY_BOUNDARY: [number, number][] = [
  [14.6512 + 0.009, 121.0492 - 0.0035],
  [14.6512 + 0.0075, 121.0492 + 0.005],
  [14.6512 + 0.003, 121.0492 + 0.0095],
  [14.6512 - 0.0035, 121.0492 + 0.0088],
  [14.6512 - 0.0082, 121.0492 + 0.0052],
  [14.6512 - 0.0095, 121.0492 - 0.001],
  [14.6512 - 0.006, 121.0492 - 0.0075],
  [14.6512 - 0.0005, 121.0492 - 0.0098],
  [14.6512 + 0.0055, 121.0492 - 0.008],
];

/* Feature types*/

export type GisLayerKey =
  | "boundary"
  | "puroks"
  | "households"
  | "residents"
  | "facilities"
  | "incidents";

export interface GisLayerDef {
  key: GisLayerKey;
  group: "Administrative" | "Population" | "Government" | "Peace & Order";
  label: string;
  description: string;
  defaultVisible: boolean;
}

export const GIS_LAYERS: GisLayerDef[] = [
  {
    key: "boundary",
    group: "Administrative",
    label: "Barangay Boundary",
    description: "Simulated administrative extent",
    defaultVisible: true,
  },
  {
    key: "puroks",
    group: "Administrative",
    label: "Purok Reference Areas",
    description: "Approximate purok groupings",
    defaultVisible: false,
  },
  {
    key: "households",
    group: "Population",
    label: "Households",
    description: "Registered household locations",
    defaultVisible: true,
  },
  {
    key: "residents",
    group: "Population",
    label: "Resident Density",
    description: "Registered residents per household",
    defaultVisible: false,
  },
  {
    key: "facilities",
    group: "Government",
    label: "Facilities & Offices",
    description: "Barangay hall, health, education, safety",
    defaultVisible: true,
  },
  {
    key: "incidents",
    group: "Peace & Order",
    label: "Incident Locations",
    description: "Blotter records (approximate)",
    defaultVisible: false,
  },
];

export interface HouseholdFeature {
  id: UUID;
  householdNo: string;
  headName: string;
  headContactMasked: string;
  purok: string;
  address: string;
  memberCount: number;
  activeResidentCount: number;
  voterCount: number;
  seniorCount: number;
  householdType: string;
  status: "Active" | "Inactive";
  dateRegistered: string;
  lat: number;
  lng: number;
}

export interface FacilityFeature {
  id: UUID;
  name: string;
  category: string;
  description: string;
  address: string;
  contactNumber: string;
  lat: number;
  lng: number;
}

export interface IncidentFeature {
  id: UUID;
  caseNo: string;
  incidentType: string;
  status: string;
  location: string;
  reportedAt: string;
  assignedTo: string;
  lat: number;
  lng: number;
}

export interface PurokArea {
  purok: string;
  lat: number;
  lng: number;
  /** Approximate radius in meters. */
  radius: number;
  households: number;
}

export interface GisWorkspaceData {
  households: HouseholdFeature[];
  facilities: FacilityFeature[];
  incidents: IncidentFeature[];
  puroks: PurokArea[];
}

export type GisFeatureLayer = "household" | "facility" | "incident";

export interface GisSearchResult {
  layer: GisFeatureLayer;
  id: UUID;
  kind: "Household" | "Resident" | "Facility" | "Incident";
  label: string;
  sublabel: string;
  lat: number;
  lng: number;
}

/* Helpers*/

function maskContact(contact: string) {
  if (!contact || contact.length < 8) return "";
  return `${contact.slice(0, 4)} ••• ${contact.slice(-4)}`;
}

/** Deterministic pseudo-coordinates for incidents (stable per case id). */
function hashUnit(seed: string, salt: number): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

function metersBetween(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371000;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function buildHouseholdFeatures(): HouseholdFeature[] {
  return db.households.map((h) => {
    const members = db.residents.filter((r) => r.householdId === h.id);
    const head = db.residents.find((r) => r.id === h.headResidentId);
    return {
      id: h.id,
      householdNo: h.householdNo,
      headName: head ? `${head.firstName} ${head.lastName}` : " unassigned ",
      headContactMasked: maskContact(head?.contactNumber ?? ""),
      purok: h.address.purok,
      address: `${h.address.houseNo} ${h.address.street}`,
      memberCount: members.length,
      activeResidentCount: members.filter((r) => r.status === "Active").length,
      voterCount: members.filter((r) => r.voterStatus === "Registered").length,
      seniorCount: members.filter((r) => calcAge(r.birthDate) >= 60).length,
      householdType: h.householdType,
      status: h.status,
      dateRegistered: h.dateRegistered,
      lat: h.geo.lat,
      lng: h.geo.lng,
    };
  });
}

function buildFacilityFeatures(): FacilityFeature[] {
  return db.facilities.map((f) => ({
    id: f.id,
    name: f.name,
    category: f.category,
    description: f.description,
    address: f.address,
    contactNumber: f.contactNumber,
    lat: f.geo.lat,
    lng: f.geo.lng,
  }));
}

function buildIncidentFeatures(): IncidentFeature[] {
  return db.blotter.map((b) => ({
    id: b.id,
    caseNo: b.caseNo,
    incidentType: b.incidentType,
    status: b.status,
    location: b.location,
    reportedAt: b.reportedAt,
    assignedTo: b.assignedTo,
    lat: GEO_ANCHOR.lat + (hashUnit(b.id, 17) - 0.5) * 0.014,
    lng: GEO_ANCHOR.lng + (hashUnit(b.id, 91) - 0.5) * 0.016,
  }));
}

function buildPurokAreas(households: HouseholdFeature[]): PurokArea[] {
  const byPurok = new Map<string, HouseholdFeature[]>();
  households.forEach((h) => {
    const list = byPurok.get(h.purok) ?? [];
    list.push(h);
    byPurok.set(h.purok, list);
  });
  return Array.from(byPurok.entries())
    .map(([purok, list]) => {
      const lat = list.reduce((a, h) => a + h.lat, 0) / list.length;
      const lng = list.reduce((a, h) => a + h.lng, 0) / list.length;
      const radius =
        Math.max(...list.map((h) => metersBetween(lat, lng, h.lat, h.lng)), 60) + 40;
      return { purok, lat, lng, radius, households: list.length };
    })
    .sort((a, b) => a.purok.localeCompare(b.purok));
}

/* Service*/

export const gisService = {
  /** GET /gis/layers */
  async listLayers(): Promise<GisLayerDef[]> {
    return mockRequest(() => clone(GIS_LAYERS), { min: 60, max: 140 });
  },

  /** GET /gis/features - bundled workspace payload. */
  async getWorkspace(): Promise<GisWorkspaceData> {
    return mockRequest(
      () => {
        const households = buildHouseholdFeatures();
        return {
          households,
          facilities: buildFacilityFeatures(),
          incidents: buildIncidentFeatures(),
          puroks: buildPurokAreas(households),
        };
      },
      { min: 280, max: 560 },
    );
  },

  /** GET /gis/search?q=… */
  async search(query: string): Promise<GisSearchResult[]> {
    return mockRequest(
      () => {
        const q = query.trim().toLowerCase();
        if (q.length < 2) return [];
        const results: GisSearchResult[] = [];

        // Households  by id, head or address
        for (const h of db.households) {
          if (results.length >= 8) break;
          const head = db.residents.find((r) => r.id === h.headResidentId);
          const headName = head ? `${head.firstName} ${head.lastName}` : "";
          const hay = `${h.householdNo} ${headName} ${h.address.houseNo} ${h.address.street} ${h.address.purok}`.toLowerCase();
          if (hay.includes(q)) {
            results.push({
              layer: "household",
              id: h.id,
              kind: "Household",
              label: h.householdNo,
              sublabel: `${headName || "Unassigned"} · ${h.address.houseNo} ${h.address.street}, ${h.address.purok}`,
              lat: h.geo.lat,
              lng: h.geo.lng,
            });
          }
        }

        // Residents - resolve to their household feature
        for (const r of db.residents) {
          if (results.length >= 8) break;
          if (!r.householdId) continue;
          const name = `${r.firstName} ${r.middleName} ${r.lastName}`.toLowerCase();
          if (!name.includes(q) && !r.residentNo.toLowerCase().includes(q)) continue;
          const h = db.households.find((x) => x.id === r.householdId);
          if (!h) continue;
          if (results.some((x) => x.layer === "household" && x.id === h.id)) continue;
          results.push({
            layer: "household",
            id: h.id,
            kind: "Resident",
            label: `${r.firstName} ${r.lastName}`,
            sublabel: `${r.residentNo} · household ${h.householdNo}`,
            lat: h.geo.lat,
            lng: h.geo.lng,
          });
        }

        // Facilities
        for (const f of db.facilities) {
          if (results.length >= 8) break;
          if (`${f.name} ${f.category} ${f.address}`.toLowerCase().includes(q)) {
            results.push({
              layer: "facility",
              id: f.id,
              kind: "Facility",
              label: f.name,
              sublabel: `${f.category} · ${f.address}`,
              lat: f.geo.lat,
              lng: f.geo.lng,
            });
          }
        }

        // Incidents - by case no. or type
        const incidents = buildIncidentFeatures();
        for (const b of incidents) {
          if (results.length >= 8) break;
          if (`${b.caseNo} ${b.incidentType}`.toLowerCase().includes(q)) {
            results.push({
              layer: "incident",
              id: b.id,
              kind: "Incident",
              label: b.caseNo,
              sublabel: `${b.incidentType} · ${b.status}`,
              lat: b.lat,
              lng: b.lng,
            });
          }
        }

        return results.slice(0, 8);
      },
      { min: 160, max: 340 },
    );
  },
};
