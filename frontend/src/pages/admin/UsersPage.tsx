import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { KeyRound, Pencil, Power, Search, UserCog, UserPlus } from "lucide-react";
import { rbacService, userService } from "@/services/adminService";
import { useAsync, useDebounced } from "@/hooks/useAsync";
import { PageHeader, PrototypeNotice, StatCard } from "@/components/ui/page";
import { Badge, Button, Card, Field, Input, Select } from "@/components/ui/primitives";
import { ActionMenu, Pagination, TableWrap, Td, Th, Tr } from "@/components/ui/data";
import { EmptyState, ErrorState, LoadingState, StatusBadge } from "@/components/ui/feedback";
import { ConfirmDialog, Modal } from "@/components/ui/overlay";
import { fmtDate, fmtRelative } from "@/lib/format";
import { hasPermission, useAuthStore } from "@/store/authStore";
import { toast } from "@/store/toastStore";
import type { RoleKey, SystemUser } from "@/types";

const schema = z.object({
  fullName: z.string().min(3, "Full name is required."),
  username: z
    .string()
    .min(4, "Username must be at least 4 characters.")
    .regex(/^[a-z0-9._-]+$/, "Use lowercase letters, numbers, dots, dashes or underscores."),
  email: z.string().email("Enter a valid email address."),
  role: z.enum(["super_admin", "admin", "staff", "resident"]),
  position: z.string().min(2, "Position or designation is required."),
  status: z.enum(["Active", "Inactive", "Suspended"]),
});

type FormValues = z.infer<typeof schema>;

export default function UsersPage() {
  const currentUser = useAuthStore((s) => s.user);
  const canManage = hasPermission(currentUser, "users.manage");

  const [search, setSearch] = useState("");
  const debounced = useDebounced(search);
  const [role, setRole] = useState<RoleKey | "">("");
  const [status, setStatus] = useState<SystemUser["status"] | "">("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SystemUser | null>(null);
  const [statusTarget, setStatusTarget] = useState<SystemUser | null>(null);
  const [working, setWorking] = useState(false);

  useEffect(() => setPage(1), [debounced, role, status, pageSize]);

  const query = useMemo(
    () => ({ search: debounced, role, status, page, pageSize }),
    [debounced, role, status, page, pageSize],
  );
  const { data, loading, error, reload } = useAsync(
    () => userService.listUsers(query),
    [JSON.stringify(query)],
  );
  const roles = useAsync(() => rbacService.listRoles(), []);
  const usage = useAsync(() => rbacService.roleUsage(), []);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const openCreate = () => {
    setEditing(null);
    reset({
      fullName: "",
      username: "",
      email: "",
      role: "staff",
      position: "",
      status: "Active",
    });
    setFormOpen(true);
  };

  const openEdit = (u: SystemUser) => {
    setEditing(u);
    reset({
      fullName: u.fullName,
      username: u.username,
      email: u.email,
      role: u.role,
      position: u.position,
      status: u.status,
    });
    setFormOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    setWorking(true);
    try {
      if (editing) {
        await userService.updateUser(editing.id, values, currentUser?.fullName);
        toast.success("User updated successfully", `${values.username} was saved.`);
      } else {
        await userService.createUser(values, currentUser?.fullName);
        toast.success(
          "User created successfully",
          `${values.username} can sign in with the shared demonstration password.`,
        );
      }
      setFormOpen(false);
      void reload();
      void usage.reload();
    } catch (e) {
      toast.error("Operation failed", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setWorking(false);
    }
  };

  const toggleStatus = async () => {
    if (!statusTarget) return;
    setWorking(true);
    try {
      const next = statusTarget.status === "Active" ? "Inactive" : "Active";
      await userService.setStatus(statusTarget.id, next, currentUser?.fullName);
      toast.success(next === "Active" ? "Account activated" : "Account deactivated", statusTarget.username);
      setStatusTarget(null);
      void reload();
    } catch (e) {
      toast.error("Operation failed", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setWorking(false);
    }
  };

  const roleName = (key: RoleKey) => roles.data?.find((r) => r.key === key)?.name ?? key;

  return (
    <div className="space-y-4">
      <PageHeader
        title="User Accounts"
        description="System accounts with access to BIMS-BIPS, including barangay staff and resident portal users."
        breadcrumbs={[{ label: "BIMS-BIPS", to: "/admin" }, { label: "Administration" }, { label: "User Accounts" }]}
        actions={
          canManage ? (
            <Button onClick={openCreate}>
              <UserPlus className="h-4 w-4" />
              Create user
            </Button>
          ) : undefined
        }
      />

      <PrototypeNotice compact />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Super administrators" value={usage.data?.super_admin ?? ""} icon={KeyRound} />
        <StatCard label="Administrators" value={usage.data?.admin ?? ""} icon={UserCog} />
        <StatCard label="Barangay staff" value={usage.data?.staff ?? ""} tone="slate" />
        <StatCard label="Resident accounts" value={usage.data?.resident ?? ""} tone="slate" />
      </div>

      <Card>
        <div className="flex flex-wrap items-end gap-2 border-b border-slate-200 p-3">
          <div className="relative min-w-56 flex-1">
            <label htmlFor="user-search" className="sr-only">
              Search users
            </label>
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <Input
              id="user-search"
              className="pl-8"
              placeholder="Search by username, name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Field label="Role" htmlFor="user-role" className="w-52">
            <Select id="user-role" value={role} onChange={(e) => setRole(e.target.value as RoleKey | "")}>
              <option value="">All roles</option>
              {(roles.data ?? []).map((r) => (
                <option key={r.key} value={r.key}>
                  {r.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status" htmlFor="user-status" className="w-36">
            <Select
              id="user-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as SystemUser["status"] | "")}
            >
              <option value="">All</option>
              <option>Active</option>
              <option>Inactive</option>
              <option>Suspended</option>
            </Select>
          </Field>
        </div>

        {loading && <LoadingState label="Loading user accounts…" />}
        {error && !loading && <ErrorState title="Unable to load user accounts" description={error} onRetry={reload} />}
        {data && !loading && !error && data.items.length === 0 && (
          <EmptyState icon={UserCog} title="No user accounts found" description="Adjust the filters or create a new account." />
        )}

        {data && !loading && !error && data.items.length > 0 && (
          <>
            <TableWrap>
              <thead>
                <tr>
                  <Th>Username</Th>
                  <Th>Full name</Th>
                  <Th className="hidden lg:table-cell">Email</Th>
                  <Th>Role</Th>
                  <Th className="hidden xl:table-cell">Position</Th>
                  <Th>Status</Th>
                  <Th className="hidden md:table-cell">Last login</Th>
                  <Th className="hidden xl:table-cell">Created</Th>
                  <Th className="w-12 text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((u) => (
                  <Tr key={u.id}>
                    <Td className="font-mono text-xs font-semibold text-slate-800">{u.username}</Td>
                    <Td className="font-medium text-slate-800">{u.fullName}</Td>
                    <Td className="hidden lg:table-cell">
                      <span className="block max-w-56 truncate">{u.email}</span>
                    </Td>
                    <Td>
                      <Badge tone={u.role === "resident" ? "neutral" : "brand"}>{roleName(u.role)}</Badge>
                    </Td>
                    <Td className="hidden xl:table-cell">{u.position}</Td>
                    <Td>
                      <StatusBadge status={u.status} />
                    </Td>
                    <Td className="hidden whitespace-nowrap md:table-cell">
                      {u.lastLoginAt ? fmtRelative(u.lastLoginAt) : "Never"}
                    </Td>
                    <Td className="hidden whitespace-nowrap xl:table-cell">{fmtDate(u.createdAt)}</Td>
                    <Td className="text-right">
                      <ActionMenu
                        label={`Actions for ${u.username}`}
                        actions={[
                          { label: "Edit account", icon: Pencil, disabled: !canManage, onSelect: () => openEdit(u) },
                          {
                            label: u.status === "Active" ? "Deactivate account" : "Activate account",
                            icon: Power,
                            danger: u.status === "Active",
                            disabled: !canManage || u.id === currentUser?.id,
                            onSelect: () => setStatusTarget(u),
                          },
                        ]}
                      />
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </TableWrap>
            <Pagination
              page={data.page}
              pageSize={data.pageSize}
              total={data.total}
              totalPages={data.totalPages}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </>
        )}
      </Card>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Edit user account" : "Create user account"}
        description={
          editing
            ? "Update account details and role assignment."
            : "New accounts use the shared demonstration password in this prototype. The production system will send an activation email."
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)} disabled={working}>
              Cancel
            </Button>
            <Button onClick={handleSubmit(onSubmit)} loading={working}>
              {editing ? "Save changes" : "Create account"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2" noValidate>
          <Field label="Full name" htmlFor="u-name" required error={errors.fullName?.message}>
            <Input id="u-name" invalid={!!errors.fullName} {...register("fullName")} />
          </Field>
          <Field label="Username" htmlFor="u-username" required error={errors.username?.message}>
            <Input id="u-username" invalid={!!errors.username} {...register("username")} />
          </Field>
          <Field label="Email address" htmlFor="u-email" required error={errors.email?.message}>
            <Input id="u-email" type="email" invalid={!!errors.email} {...register("email")} />
          </Field>
          <Field label="Position / designation" htmlFor="u-position" required error={errors.position?.message}>
            <Input id="u-position" invalid={!!errors.position} {...register("position")} />
          </Field>
          <Field label="Role" htmlFor="u-role" required error={errors.role?.message}>
            <Select id="u-role" {...register("role")}>
              {(roles.data ?? []).map((r) => (
                <option key={r.key} value={r.key}>
                  {r.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status" htmlFor="u-status" required>
            <Select id="u-status" {...register("status")}>
              <option>Active</option>
              <option>Inactive</option>
              <option>Suspended</option>
            </Select>
          </Field>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!statusTarget}
        title={statusTarget?.status === "Active" ? "Deactivate this account?" : "Activate this account?"}
        message={
          statusTarget?.status === "Active"
            ? `${statusTarget?.username} will no longer be able to sign in. The account and its audit history are retained.`
            : `${statusTarget?.username} will regain access to the system.`
        }
        confirmLabel={statusTarget?.status === "Active" ? "Deactivate" : "Activate"}
        destructive={statusTarget?.status === "Active"}
        loading={working}
        onCancel={() => setStatusTarget(null)}
        onConfirm={toggleStatus}
      />
    </div>
  );
}
