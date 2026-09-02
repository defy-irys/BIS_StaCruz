import { db, logActivity, pushNotification, uid } from "@/mock/db";
import type {
  CertificateRequest,
  CertificateStatus,
  ClearanceRequest,
  ClearanceStatus,
  DocumentQuery,
  Paginated,
  RequestChannel,
  UUID,
} from "@/types";
import { ApiError, clone, matches, mockRequest, paginate, sortBy } from "./http";

export const CERTIFICATE_TYPES = [
  "Certificate of Residency",
  "Certificate of Indigency",
  "Certificate of Good Moral Character",
  "Barangay Business Certificate",
  "Certificate of Live-in Partnership",
  "First Time Job Seeker Certificate",
];

export const CLEARANCE_TYPES = [
  "Barangay Clearance",
  "Business Permit Clearance",
  "Barangay ID Clearance",
  "Building Permit Endorsement",
  "Work Requirement Clearance",
];

export const CERTIFICATE_STATUSES: CertificateStatus[] = [
  "Submitted",
  "Under Review",
  "Approved",
  "Ready for Release",
  "Released",
  "Rejected",
];

export const CLEARANCE_STATUSES: ClearanceStatus[] = [
  "Pending",
  "Approved",
  "Rejected",
  "Released",
];

/** Allowed forward transitions - mirrors the documented backend workflow. */
export const CERTIFICATE_TRANSITIONS: Record<CertificateStatus, CertificateStatus[]> = {
  Submitted: ["Under Review", "Rejected"],
  "Under Review": ["Approved", "Rejected"],
  Approved: ["Ready for Release", "Rejected"],
  "Ready for Release": ["Released"],
  Released: [],
  Rejected: [],
};

export const CLEARANCE_TRANSITIONS: Record<ClearanceStatus, ClearanceStatus[]> = {
  Pending: ["Approved", "Rejected"],
  Approved: ["Released", "Rejected"],
  Rejected: [],
  Released: [],
};

export interface NewCertificatePayload {
  residentId: UUID;
  residentName: string;
  certificateType: string;
  purpose: string;
  channel: RequestChannel;
  fee?: number;
}

export interface NewClearancePayload {
  residentId: UUID;
  residentName: string;
  clearanceType: string;
  purpose: string;
  channel: RequestChannel;
  fee?: number;
}

/* Certificates*/

export const certificateService = {
  /** GET /certificates */
  async listCertificates(query: DocumentQuery = {}): Promise<Paginated<CertificateRequest>> {
    return mockRequest(() => {
      const items = db.certificates.filter((c) => {
        if (query.status && c.status !== query.status) return false;
        if (query.type && c.certificateType !== query.type) return false;
        if (query.channel && c.channel !== query.channel) return false;
        if (query.residentId && c.residentId !== query.residentId) return false;
        return matches([c.referenceNo, c.residentName, c.certificateType, c.purpose], query.search);
      });
      return paginate(
        clone(sortBy(items, query.sortBy ?? "requestedAt", query.sortDir ?? "desc")),
        query,
      );
    });
  },

  /** GET /certificates/{id} */
  async getCertificate(id: UUID): Promise<CertificateRequest> {
    return mockRequest(() => {
      const found = db.certificates.find((c) => c.id === id);
      if (!found) throw new ApiError("Certificate request not found.", 404);
      return clone(found);
    });
  },

  /** POST /certificates */
  async createRequest(payload: NewCertificatePayload, actor = "System"): Promise<CertificateRequest> {
    return mockRequest(
      () => {
        db.counters.cert += 1;
        const now = new Date().toISOString();
        const record: CertificateRequest = {
          id: uid("cert"),
          referenceNo: `CTF-${new Date().getFullYear()}-${String(db.counters.cert).padStart(4, "0")}`,
          residentId: payload.residentId,
          residentName: payload.residentName,
          certificateType: payload.certificateType,
          purpose: payload.purpose,
          status: "Submitted",
          channel: payload.channel,
          requestedAt: now,
          issuedAt: null,
          processedBy: "",
          fee: payload.fee ?? 50,
          orNumber: "",
          remarks: "",
          history: [
            {
              id: uid("evt"),
              at: now,
              from: "",
              to: "Submitted",
              actor,
              note:
                payload.channel === "Resident Portal"
                  ? "Filed through the resident portal."
                  : "Filed at the barangay front desk.",
            },
          ],
        };
        db.certificates.unshift(record);
        logActivity({
          actor,
          action: "Requested",
          module: "Certificates",
          description: `${record.referenceNo}  ${record.certificateType} for ${record.residentName}`,
        });
        pushNotification({
          audience: "admin",
          title: "New certificate request",
          message: `${record.referenceNo}  ${record.certificateType} filed by ${record.residentName}.`,
          level: "info",
        });
        return clone(record);
      },
      { min: 420, max: 780 },
    );
  },

  /** POST /certificates/{id}/transition */
  async transition(
    id: UUID,
    to: CertificateStatus,
    note: string,
    actor = "System",
  ): Promise<CertificateRequest> {
    return mockRequest(() => {
      const record = db.certificates.find((c) => c.id === id);
      if (!record) throw new ApiError("Certificate request not found.", 404);
      if (!CERTIFICATE_TRANSITIONS[record.status].includes(to)) {
        throw new ApiError(`Cannot move a request from ${record.status} to ${to}.`, 409);
      }
      record.history.push({
        id: uid("evt"),
        at: new Date().toISOString(),
        from: record.status,
        to,
        actor,
        note: note || `Marked as ${to}.`,
      });
      record.status = to;
      record.processedBy = actor;
      if (to === "Rejected") record.remarks = note || "Request rejected.";
      if (to === "Released") {
        record.issuedAt = new Date().toISOString();
        record.orNumber = `OR-${Math.floor(100000 + Math.random() * 899999)}`;
      }
      logActivity({
        actor,
        action: to,
        module: "Certificates",
        description: `${record.referenceNo} moved to ${to}`,
      });
      pushNotification({
        audience: "resident",
        residentId: record.residentId,
        title: `Certificate request ${to.toLowerCase()}`,
        message: `${record.referenceNo}  ${record.certificateType} is now ${to}.`,
        level: to === "Rejected" ? "warning" : to === "Released" ? "success" : "info",
      });
      return clone(record);
    });
  },
};

/* Clearances                                                          */

export const clearanceService = {
  /** GET /clearances */
  async listClearances(query: DocumentQuery = {}): Promise<Paginated<ClearanceRequest>> {
    return mockRequest(() => {
      const items = db.clearances.filter((c) => {
        if (query.status && c.status !== query.status) return false;
        if (query.type && c.clearanceType !== query.type) return false;
        if (query.channel && c.channel !== query.channel) return false;
        if (query.residentId && c.residentId !== query.residentId) return false;
        return matches([c.referenceNo, c.residentName, c.clearanceType, c.purpose], query.search);
      });
      return paginate(
        clone(sortBy(items, query.sortBy ?? "requestedAt", query.sortDir ?? "desc")),
        query,
      );
    });
  },

  /** GET /clearances/{id} */
  async getClearance(id: UUID): Promise<ClearanceRequest> {
    return mockRequest(() => {
      const found = db.clearances.find((c) => c.id === id);
      if (!found) throw new ApiError("Clearance request not found.", 404);
      return clone(found);
    });
  },

  /** POST /clearances */
  async createRequest(payload: NewClearancePayload, actor = "System"): Promise<ClearanceRequest> {
    return mockRequest(
      () => {
        db.counters.clr += 1;
        const now = new Date().toISOString();
        const record: ClearanceRequest = {
          id: uid("clr"),
          referenceNo: `CLR-${new Date().getFullYear()}-${String(db.counters.clr).padStart(4, "0")}`,
          residentId: payload.residentId,
          residentName: payload.residentName,
          clearanceType: payload.clearanceType,
          purpose: payload.purpose,
          status: "Pending",
          channel: payload.channel,
          requestedAt: now,
          releasedAt: null,
          processedBy: "",
          fee: payload.fee ?? 100,
          orNumber: "",
          remarks: "",
          history: [
            {
              id: uid("evt"),
              at: now,
              from: "",
              to: "Pending",
              actor,
              note:
                payload.channel === "Resident Portal"
                  ? "Filed through the resident portal."
                  : "Filed at the barangay front desk.",
            },
          ],
        };
        db.clearances.unshift(record);
        logActivity({
          actor,
          action: "Requested",
          module: "Clearances",
          description: `${record.referenceNo}  ${record.clearanceType} for ${record.residentName}`,
        });
        pushNotification({
          audience: "admin",
          title: "New clearance request",
          message: `${record.referenceNo}  ${record.clearanceType} filed by ${record.residentName}.`,
          level: "info",
        });
        return clone(record);
      },
      { min: 420, max: 780 },
    );
  },

  /** POST /clearances/{id}/transition */
  async transition(
    id: UUID,
    to: ClearanceStatus,
    note: string,
    actor = "System",
  ): Promise<ClearanceRequest> {
    return mockRequest(() => {
      const record = db.clearances.find((c) => c.id === id);
      if (!record) throw new ApiError("Clearance request not found.", 404);
      if (!CLEARANCE_TRANSITIONS[record.status].includes(to)) {
        throw new ApiError(`Cannot move a request from ${record.status} to ${to}.`, 409);
      }
      record.history.push({
        id: uid("evt"),
        at: new Date().toISOString(),
        from: record.status,
        to,
        actor,
        note: note || `Marked as ${to}.`,
      });
      record.status = to;
      record.processedBy = actor;
      if (to === "Rejected") record.remarks = note || "Request rejected.";
      if (to === "Released") {
        record.releasedAt = new Date().toISOString();
        record.orNumber = `OR-${Math.floor(100000 + Math.random() * 899999)}`;
      }
      logActivity({
        actor,
        action: to,
        module: "Clearances",
        description: `${record.referenceNo} moved to ${to}`,
      });
      pushNotification({
        audience: "resident",
        residentId: record.residentId,
        title: `Clearance request ${to.toLowerCase()}`,
        message: `${record.referenceNo}  ${record.clearanceType} is now ${to}.`,
        level: to === "Rejected" ? "warning" : to === "Released" ? "success" : "info",
      });
      return clone(record);
    });
  },
};
