import { db, logActivity, uid } from "@/mock/db";
import type {
  ListQuery,
  Paginated,
  Permission,
  PermissionGroup,
  Role,
  RoleKey,
  SystemUser,
  SystemUserInput,
  UUID,
} from "@/types";
import { ApiError, clone, matches, mockRequest, paginate, sortBy } from "./http";

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    key: "residents",
    label: "Residents",
    permissions: [
      { key: "residents.view", label: "View", description: "Browse and search resident profiles" },
      { key: "residents.create", label: "Create", description: "Encode new resident records" },
      { key: "residents.update", label: "Update", description: "Edit existing resident records" },
      { key: "residents.delete", label: "Deactivate", description: "Soft-delete / deactivate records" },
    ],
  },
  {
    key: "households",
    label: "Households",
    permissions: [
      { key: "households.view", label: "View", description: "Browse household registry" },
      { key: "households.manage", label: "Manage", description: "Create, edit and assign members" },
    ],
  },
  {
    key: "officials",
    label: "Officials",
    permissions: [
      { key: "officials.view", label: "View", description: "View the roster of barangay officials" },
      { key: "officials.manage", label: "Manage", description: "Add, edit and archive officials" },
    ],
  },
  {
    key: "blotter",
    label: "Blotter / Incidents",
    permissions: [
      { key: "blotter.view", label: "View", description: "Read incident records" },
      { key: "blotter.manage", label: "Manage", description: "File cases and change case status" },
    ],
  },
  {
    key: "certificates",
    label: "Certificates",
    permissions: [
      { key: "certificates.view", label: "View", description: "View certificate requests" },
      { key: "certificates.process", label: "Process", description: "Review, approve, reject and issue" },
    ],
  },
  {
    key: "clearances",
    label: "Clearances",
    permissions: [
      { key: "clearances.view", label: "View", description: "View clearance requests" },
      { key: "clearances.process", label: "Process", description: "Approve, reject and release" },
    ],
  },
  {
    key: "information",
    label: "Reports, Analytics & GIS",
    permissions: [
      { key: "reports.view", label: "View reports", description: "Open the reports workspace" },
      { key: "reports.generate", label: "Generate", description: "Run and export report outputs" },
      { key: "analytics.view", label: "Analytics", description: "View demographic dashboards" },
      { key: "gis.view", label: "GIS", description: "Access the geographic module" },
    ],
  },
  {
    key: "administration",
    label: "System administration",
    permissions: [
      { key: "users.view", label: "View users", description: "See the system user directory" },
      { key: "users.manage", label: "Manage users", description: "Create, edit and deactivate accounts" },
      { key: "roles.view", label: "View roles", description: "Inspect roles and permission matrix" },
      { key: "roles.manage", label: "Manage roles", description: "Modify role permission assignments" },
      { key: "settings.manage", label: "Settings", description: "Change barangay & system settings" },
    ],
  },
  {
    key: "portal",
    label: "Resident portal",
    permissions: [
      { key: "portal.access", label: "Access", description: "Use the resident self-service portal" },
    ],
  },
];

export interface UserQuery extends ListQuery {
  role?: RoleKey | "";
  status?: SystemUser["status"] | "";
}

export const userService = {
  /** GET /users */
  async listUsers(query: UserQuery = {}): Promise<Paginated<SystemUser>> {
    return mockRequest(() => {
      const items = db.users.filter((u) => {
        if (query.role && u.role !== query.role) return false;
        if (query.status && u.status !== query.status) return false;
        return matches([u.username, u.email, u.fullName, u.position], query.search);
      });
      return paginate(clone(sortBy(items, query.sortBy ?? "fullName", query.sortDir ?? "asc")), query);
    });
  },

  /** GET /users/{id} */
  async getUser(id: UUID): Promise<SystemUser> {
    return mockRequest(() => {
      const found = db.users.find((u) => u.id === id);
      if (!found) throw new ApiError("User account not found.", 404);
      return clone(found);
    });
  },

  /** POST /users */
  async createUser(data: SystemUserInput, actor = "System"): Promise<SystemUser> {
    return mockRequest(() => {
      const dup = db.users.find(
        (u) =>
          u.username.toLowerCase() === data.username.toLowerCase() ||
          u.email.toLowerCase() === data.email.toLowerCase(),
      );
      if (dup) throw new ApiError("A user with that username or email already exists.", 409);
      const record: SystemUser = {
        ...data,
        id: uid("usr"),
        createdAt: new Date().toISOString(),
        lastLoginAt: null,
        residentId: null,
      };
      db.users.unshift(record);
      logActivity({
        actor,
        action: "Created",
        module: "User Management",
        description: `Created account ${record.username} (${record.role})`,
      });
      return clone(record);
    });
  },

  /** PATCH /users/{id} */
  async updateUser(id: UUID, data: Partial<SystemUserInput>, actor = "System"): Promise<SystemUser> {
    return mockRequest(() => {
      const idx = db.users.findIndex((u) => u.id === id);
      if (idx === -1) throw new ApiError("User account not found.", 404);
      const updated = { ...db.users[idx], ...data };
      db.users[idx] = updated;
      logActivity({
        actor,
        action: "Updated",
        module: "User Management",
        description: `Updated account ${updated.username}`,
      });
      return clone(updated);
    });
  },

  /** POST /users/{id}/status */
  async setStatus(id: UUID, status: SystemUser["status"], actor = "System"): Promise<SystemUser> {
    return mockRequest(() => {
      const record = db.users.find((u) => u.id === id);
      if (!record) throw new ApiError("User account not found.", 404);
      record.status = status;
      logActivity({
        actor,
        action: status === "Active" ? "Activated" : "Deactivated",
        module: "User Management",
        description: `${record.username} set to ${status}`,
      });
      return clone(record);
    });
  },
};

export const rbacService = {
  /** GET /roles */
  async listRoles(): Promise<Role[]> {
    return mockRequest(() => clone(db.roles));
  },

  /** GET /roles/{id} */
  async getRole(id: UUID): Promise<Role> {
    return mockRequest(() => {
      const found = db.roles.find((r) => r.id === id);
      if (!found) throw new ApiError("Role not found.", 404);
      return clone(found);
    });
  },

  /** GET /permissions */
  async listPermissionGroups(): Promise<PermissionGroup[]> {
    return mockRequest(() => clone(PERMISSION_GROUPS), { min: 80, max: 180 });
  },

  /** PUT /roles/{id}/permissions */
  async setRolePermissions(id: UUID, permissions: Permission[], actor = "System"): Promise<Role> {
    return mockRequest(() => {
      const role = db.roles.find((r) => r.id === id);
      if (!role) throw new ApiError("Role not found.", 404);
      if (role.key === "super_admin") {
        throw new ApiError(
          "The Super Administrator role is immutable and always retains full access.",
          409,
        );
      }
      role.permissions = [...permissions];
      logActivity({
        actor,
        action: "Updated",
        module: "Roles & Permissions",
        description: `Adjusted permissions for ${role.name} (${permissions.length} granted)`,
      });
      return clone(role);
    });
  },

  /** Count of accounts per role  displayed in the RBAC screen. */
  async roleUsage(): Promise<Record<RoleKey, number>> {
    return mockRequest(() => {
      const counts = { super_admin: 0, admin: 0, staff: 0, resident: 0 } as Record<RoleKey, number>;
      db.users.forEach((u) => {
        counts[u.role] += 1;
      });
      return counts;
    }, { min: 80, max: 160 });
  },
};
