import { useEffect, useState } from "react";
import { Lock, RotateCcw, Save, ShieldCheck, Users } from "lucide-react";
import { PERMISSION_GROUPS, rbacService } from "@/services/adminService";
import { useAsync } from "@/hooks/useAsync";
import { PageHeader, PrototypeNotice } from "@/components/ui/page";
import { Badge, Button, Card, CardHeader } from "@/components/ui/primitives";
import { ErrorState, InlineLoading } from "@/components/ui/feedback";
import { hasPermission, useAuthStore } from "@/store/authStore";
import { toast } from "@/store/toastStore";
import { cn } from "@/utils/cn";
import type { Permission, Role } from "@/types";

export default function RolesPage() {
  const user = useAuthStore((s) => s.user);
  const refreshPermissions = useAuthStore((s) => s.refreshPermissions);
  const canManage = hasPermission(user, "roles.manage");

  const { data, loading, error, reload } = useAsync(
    async () => {
      const [roles, usage] = await Promise.all([rbacService.listRoles(), rbacService.roleUsage()]);
      return { roles, usage };
    },
    [],
  );

  const [activeRoleId, setActiveRoleId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Permission[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data && !activeRoleId) {
      const first = data.roles.find((r) => r.key === "admin") ?? data.roles[0];
      setActiveRoleId(first.id);
      setDraft([...first.permissions]);
    }
  }, [data, activeRoleId]);

  const activeRole: Role | undefined = data?.roles.find((r) => r.id === activeRoleId);
  const dirty =
    activeRole &&
    (draft.length !== activeRole.permissions.length ||
      draft.some((p) => !activeRole.permissions.includes(p)));

  const selectRole = (role: Role) => {
    setActiveRoleId(role.id);
    setDraft([...role.permissions]);
  };

  const toggle = (permission: Permission) => {
    if (!canManage || activeRole?.key === "super_admin") return;
    setDraft((d) => (d.includes(permission) ? d.filter((p) => p !== permission) : [...d, permission]));
  };

  const save = async () => {
    if (!activeRole) return;
    setSaving(true);
    try {
      await rbacService.setRolePermissions(activeRole.id, draft, user?.fullName);
      toast.success(
        "Permissions updated",
        `${activeRole.name} now has ${draft.length} permission(s). Navigation and route access update immediately.`,
      );
      await reload();
      await refreshPermissions();
    } catch (e) {
      toast.error("Unable to update permissions", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Roles & Permissions"
        description="Role-based access control. Permissions determine which modules and routes each role can reach."
        breadcrumbs={[
          { label: "BIMS-BIPS", to: "/admin" },
          { label: "Administration" },
          { label: "Roles & Permissions" },
        ]}
      />

      <div className="flex flex-wrap items-start gap-2">
        <PrototypeNotice className="flex-1" compact />
        <aside
          role="note"
          className="flex items-start gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-600"
        >
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
          <p className="max-w-md">
            Frontend RBAC controls navigation and routing only. Authoritative enforcement is performed by
            the FastAPI backend on every request.
          </p>
        </aside>
      </div>

      {loading && (
        <Card>
          <InlineLoading label="Loading roles…" />
        </Card>
      )}
      {error && !loading && (
        <Card>
          <ErrorState title="Unable to load roles" description={error} onRetry={reload} />
        </Card>
      )}

      {data && !loading && (
        <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
          <Card className="h-fit">
            <CardHeader title="Roles" description="Select a role to inspect its permissions." icon={ShieldCheck} />
            <ul className="divide-y divide-slate-100">
              {data.roles.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => selectRole(r)}
                    aria-pressed={r.id === activeRoleId}
                    className={cn(
                      "w-full px-4 py-3 text-left hover:bg-slate-50",
                      r.id === activeRoleId && "bg-brand-50/60",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-800">{r.name}</p>
                      <Badge tone={r.scope === "Administrative" ? "brand" : r.scope === "Operational" ? "info" : "neutral"}>
                        {r.scope}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500">{r.description}</p>
                    <div className="mt-1.5 flex items-center gap-3 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3" />
                        {r.permissions.length} permissions
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {data.usage[r.key]} account(s)
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          {activeRole && (
            <Card>
              <CardHeader
                title={`${activeRole.name}  permission matrix`}
                description={
                  activeRole.key === "super_admin"
                    ? "The Super Administrator role is immutable and always retains full access."
                    : "Toggle permissions to change what this role can access. Changes apply to every account with this role."
                }
                action={
                  activeRole.key !== "super_admin" && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setDraft([...activeRole.permissions])}
                        disabled={!dirty || saving}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Reset
                      </Button>
                      <Button size="sm" onClick={save} loading={saving} disabled={!dirty || !canManage}>
                        <Save className="h-3.5 w-3.5" />
                        Save permissions
                      </Button>
                    </div>
                  )
                }
              />

              {!canManage && (
                <p className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-600">
                  Your role can view the permission matrix but cannot modify it.
                </p>
              )}

              <div className="divide-y divide-slate-100">
                {PERMISSION_GROUPS.map((group) => {
                  const granted = group.permissions.filter((p) => draft.includes(p.key)).length;
                  return (
                    <section key={group.key} className="px-4 py-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                          {group.label}
                        </h3>
                        <Badge tone={granted > 0 ? "success" : "neutral"}>
                          {granted}/{group.permissions.length} granted
                        </Badge>
                      </div>
                      <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                        {group.permissions.map((p) => {
                          const checked = draft.includes(p.key);
                          const locked = activeRole.key === "super_admin" || !canManage;
                          return (
                            <li key={p.key}>
                              <label
                                className={cn(
                                  "flex cursor-pointer items-start gap-2.5 rounded-md border p-2.5 transition-colors",
                                  checked ? "border-brand-200 bg-brand-50/50" : "border-slate-200 bg-white",
                                  locked && "cursor-not-allowed opacity-70",
                                )}
                              >
                                <input
                                  type="checkbox"
                                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-600"
                                  checked={checked}
                                  disabled={locked}
                                  onChange={() => toggle(p.key)}
                                />
                                <span className="min-w-0">
                                  <span className="block text-sm font-medium text-slate-800">{p.label}</span>
                                  <span className="block text-[11px] text-slate-500">{p.description}</span>
                                  <code className="mt-0.5 block font-mono text-[10px] text-slate-400">{p.key}</code>
                                </span>
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  );
                })}
              </div>

              {dirty && (
                <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-slate-200 bg-amber-50 px-4 py-2.5">
                  <p className="text-xs text-amber-900">
                    Unsaved permission changes  {draft.length} permission(s) selected.
                  </p>
                  <Button size="sm" onClick={save} loading={saving} disabled={!canManage}>
                    <Save className="h-3.5 w-3.5" />
                    Save permissions
                  </Button>
                </div>
              )}
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
