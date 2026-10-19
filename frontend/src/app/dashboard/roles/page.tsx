"use client";

import { useMemo, useState, type SyntheticEvent } from "react";
import { useAuth, ADMIN_ROLES } from "@/lib/auth-context";
import { errorMessage, fieldError, usersApi, type User } from "@/lib/api";
import { useAsync } from "@/lib/hooks";
import { formatDate, initials, ROLE_LABELS } from "@/lib/format";
import { Modal, ConfirmDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { Field, Input, Select, Switch } from "@/components/ui/form";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  Icon,
  PageHeader,
  SearchInput,
  TableSkeleton,
} from "@/components/ui/primitives";

const ROLE_ORDER = ["super_admin", "church_admin", "pastor", "staff", "volunteer", "member"] as const;

const ROLE_INFO: Record<string, { summary: string; tone: "brand" | "accent" | "success" | "neutral" }> = {
  super_admin: { summary: "Full access to every module, plus user account management.", tone: "brand" },
  church_admin: { summary: "Full access to every module, plus user account management.", tone: "brand" },
  pastor: { summary: "All church records, including confidential pastoral notes.", tone: "accent" },
  staff: { summary: "Day-to-day church records. No pastoral notes or account management.", tone: "success" },
  volunteer: { summary: "Can sign in and manage their own profile only.", tone: "neutral" },
  member: { summary: "Can sign in and manage their own profile only.", tone: "neutral" },
};

/** What each role can do, mirroring the API's permission classes. */
const ACCESS: Array<{ area: string; icon: string; roles: string[] }> = [
  { area: "People, families & groups", icon: "group", roles: ["super_admin", "church_admin", "pastor", "staff"] },
  { area: "Attendance & check-in", icon: "fact_check", roles: ["super_admin", "church_admin", "pastor", "staff"] },
  { area: "Events & sermons", icon: "event", roles: ["super_admin", "church_admin", "pastor", "staff"] },
  { area: "Communication broadcasts", icon: "sms", roles: ["super_admin", "church_admin", "pastor", "staff"] },
  { area: "Finance & giving", icon: "payments", roles: ["super_admin", "church_admin", "pastor", "staff"] },
  { area: "Pastoral notes", icon: "lock", roles: ["super_admin", "church_admin", "pastor"] },
  { area: "User accounts & roles", icon: "admin_panel_settings", roles: ["super_admin", "church_admin"] },
  { area: "Own profile & password", icon: "account_circle", roles: [...ROLE_ORDER] },
];

interface UserForm {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: string;
  is_active: boolean;
  password: string;
  confirm: string;
}

const emptyUser: UserForm = { first_name: "", last_name: "", email: "", phone: "", role: "staff", is_active: true, password: "", confirm: "" };

export default function RolesPage() {
  const { token, user: me, hasRole } = useAuth();
  const toast = useToast();
  const isAdmin = hasRole(...ADMIN_ROLES);
  const t = token ?? "";

  const users = useAsync(token && isAdmin ? () => usersApi.list(t, "page_size=200") : null, [token, isAdmin]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (users.data?.results ?? []).filter(
      (u) =>
        (!roleFilter || u.role === roleFilter) &&
        (!q || u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    );
  }, [users.data, search, roleFilter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    (users.data?.results ?? []).forEach((u) => (c[u.role] = (c[u.role] ?? 0) + 1));
    return c;
  }, [users.data]);

  // ── Create / edit ──────────────────────────────────────────────────────
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState<UserForm>(emptyUser);
  const [errors, setErrors] = useState<Partial<Record<keyof UserForm, string>>>({});
  const [apiError, setApiError] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);
  const setF = <K extends keyof UserForm>(k: K, v: UserForm[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };
  const editingSelf = editing?.id === me?.id;

  const openForm = (u: User | null) => {
    setEditing(u);
    setForm(u ? { first_name: u.first_name, last_name: u.last_name, email: u.email, phone: u.phone ?? "", role: u.role, is_active: u.is_active ?? true, password: "", confirm: "" } : emptyUser);
    setErrors({});
    setApiError(null);
    setOpen(true);
  };

  const save = async (e: SyntheticEvent) => {
    e.preventDefault();
    if (saving) return;
    const errs: typeof errors = {};
    if (!form.first_name.trim()) errs.first_name = "First name is required.";
    if (!form.last_name.trim()) errs.last_name = "Last name is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errs.email = "Enter a valid email address.";
    if (!editing) {
      if (form.password.length < 8) errs.password = "Use at least 8 characters.";
      if (form.password !== form.confirm) errs.confirm = "Passwords don't match.";
    }
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    setApiError(null);
    try {
      const base = { first_name: form.first_name.trim(), last_name: form.last_name.trim(), email: form.email.trim(), phone: form.phone.trim(), role: form.role };
      if (editing) {
        await usersApi.update(t, editing.id, { ...base, is_active: form.is_active });
        toast.success("Account updated", `${base.first_name} ${base.last_name} is now ${ROLE_LABELS[base.role]}.`);
      } else {
        await usersApi.create(t, { ...base, password: form.password });
        toast.success("Account created", `${base.first_name} can now sign in with ${base.email}.`);
      }
      setOpen(false);
      users.reload();
    } catch (err) {
      setApiError(err);
    } finally {
      setSaving(false);
    }
  };

  // ── Activate / deactivate & delete ─────────────────────────────────────
  const [toggling, setToggling] = useState<number | null>(null);
  const toggleActive = async (u: User) => {
    if (toggling) return;
    setToggling(u.id);
    try {
      await usersApi.update(t, u.id, { is_active: !u.is_active });
      toast.success(u.is_active ? "Account deactivated" : "Account reactivated", u.is_active ? `${u.full_name} can no longer sign in.` : `${u.full_name} can sign in again.`);
      users.reload();
    } catch (err) {
      toast.error("Couldn't update account", errorMessage(err));
    } finally {
      setToggling(null);
    }
  };

  const [toDelete, setToDelete] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);
  const confirmDelete = async () => {
    if (!toDelete || deleting) return;
    setDeleting(true);
    try {
      await usersApi.remove(t, toDelete.id);
      toast.success("Account removed", `${toDelete.full_name}'s login was deleted.`);
      setToDelete(null);
      users.reload();
    } catch (err) {
      toast.error("Couldn't remove account", errorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Roles & access" />
        <Card>
          <EmptyState icon="lock" title="Administrator access required" description="Only Super Admins and Church Admins can manage user accounts and roles." />
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Roles & access"
        description="Manage who can sign in and what each role can see."
        actions={
          <Button variant="primary" icon="person_add" onClick={() => openForm(null)}>
            Add account
          </Button>
        }
      />

      <Card className="overflow-hidden">
        <CardHeader
          title="User accounts"
          description={users.data ? `${users.data.count} account${users.data.count === 1 ? "" : "s"}` : undefined}
          icon="manage_accounts"
        />
        <div className="grid grid-cols-1 gap-2 border-y border-line bg-surface-muted p-4 sm:grid-cols-[minmax(0,1fr)_220px]">
          <SearchInput value={search} onChange={setSearch} placeholder="Search name or email" label="Search accounts" />
          <Select aria-label="Filter by role" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="">All roles</option>
            {ROLE_ORDER.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]} {counts[r] ? `(${counts[r]})` : ""}
              </option>
            ))}
          </Select>
        </div>
        {users.loading && !users.data ? (
          <TableSkeleton rows={4} cols={3} />
        ) : users.error ? (
          <ErrorState message={users.error} onRetry={users.reload} />
        ) : filtered.length === 0 ? (
          <EmptyState icon="person_search" title="No accounts match" description="Try another search or role." />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Role</th>
                  <th scope="col">Status</th>
                  <th scope="col" className="hidden md:table-cell">
                    Added
                  </th>
                  <th scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => {
                  const self = u.id === me?.id;
                  return (
                    <tr key={u.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <Avatar name={u.full_name} initials={initials(u.first_name, u.last_name)} src={u.avatar} />
                          <div className="min-w-0">
                            <span className="block truncate font-medium text-ink">
                              {u.full_name}
                              {self && <span className="ml-1.5 text-[12px] font-normal text-ink-muted">(you)</span>}
                            </span>
                            <span className="block truncate text-[13px] text-ink-muted">{u.email}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <Badge tone={ROLE_INFO[u.role]?.tone ?? "neutral"}>{ROLE_LABELS[u.role] ?? u.role}</Badge>
                      </td>
                      <td>
                        {u.is_active ? (
                          <Badge tone="success" dot>
                            Active
                          </Badge>
                        ) : (
                          <Badge tone="neutral" dot>
                            Deactivated
                          </Badge>
                        )}
                      </td>
                      <td className="hidden whitespace-nowrap text-ink-muted md:table-cell">{formatDate(u.date_joined)}</td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" iconOnly icon="edit" aria-label={`Edit ${u.full_name}`} title="Edit" onClick={() => openForm(u)} />
                          {!self && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                iconOnly
                                icon={u.is_active ? "block" : "check_circle"}
                                loading={toggling === u.id}
                                aria-label={u.is_active ? `Deactivate ${u.full_name}` : `Reactivate ${u.full_name}`}
                                title={u.is_active ? "Deactivate" : "Reactivate"}
                                onClick={() => toggleActive(u)}
                              />
                              <Button variant="danger-ghost" size="sm" iconOnly icon="delete" aria-label={`Remove ${u.full_name}`} title="Remove" onClick={() => setToDelete(u)} />
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="overflow-hidden">
        <CardHeader title="What each role can access" description="Roles are fixed and enforced by the server." icon="shield_person" />
        <div className="grid grid-cols-1 gap-3 px-5 pb-5 sm:grid-cols-2 xl:grid-cols-3">
          {ROLE_ORDER.map((r) => (
            <div key={r} className="rounded-lg border border-line p-3.5">
              <div className="flex items-center justify-between gap-2">
                <Badge tone={ROLE_INFO[r].tone}>{ROLE_LABELS[r]}</Badge>
                <span className="text-[12px] text-ink-muted">
                  {counts[r] ?? 0} account{(counts[r] ?? 0) === 1 ? "" : "s"}
                </span>
              </div>
              <p className="mt-2 text-[13px] text-ink-muted">{ROLE_INFO[r].summary}</p>
            </div>
          ))}
        </div>
        <div className="overflow-x-auto border-t border-line">
          <table className="data-table">
            <caption className="sr-only">Access by role</caption>
            <thead>
              <tr>
                <th scope="col">Area</th>
                {ROLE_ORDER.map((r) => (
                  <th key={r} scope="col" className="text-center">
                    {ROLE_LABELS[r]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ACCESS.map((row) => (
                <tr key={row.area}>
                  <th scope="row" className="border-b border-line px-4 py-3 text-left text-sm font-medium text-ink">
                    <span className="inline-flex items-center gap-2">
                      <Icon name={row.icon} size={18} className="text-ink-muted" />
                      {row.area}
                    </span>
                  </th>
                  {ROLE_ORDER.map((r) => {
                    const ok = row.roles.includes(r);
                    return (
                      <td key={r} className="text-center">
                        {ok ? (
                          <Icon name="check_circle" filled size={18} className="text-success" label="Allowed" />
                        ) : (
                          <Icon name="remove" size={18} className="text-ink-subtle" label="Not allowed" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title={editing ? `Edit ${editing.full_name}` : "Add account"}
        subtitle={editing ? "Update contact details, role and sign-in access." : "Create a login for a pastor, staff member or volunteer."}
        maxWidth="lg"
        isSubmitting={saving}
        footer={
          <>
            <Button onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" form="user-form" variant="primary" loading={saving}>
              {editing ? "Save changes" : "Create account"}
            </Button>
          </>
        }
      >
        <form id="user-form" onSubmit={save} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {apiError ? (
            <Alert className="sm:col-span-2" title="Couldn't save account">
              {errorMessage(apiError)}
            </Alert>
          ) : null}
          <Field label="First name" required error={errors.first_name || fieldError(apiError, "first_name")}>
            {(p) => <Input {...p} value={form.first_name} disabled={saving} onChange={(e) => setF("first_name", e.target.value)} />}
          </Field>
          <Field label="Last name" required error={errors.last_name || fieldError(apiError, "last_name")}>
            {(p) => <Input {...p} value={form.last_name} disabled={saving} onChange={(e) => setF("last_name", e.target.value)} />}
          </Field>
          <Field label="Email (sign-in)" required error={errors.email || fieldError(apiError, "email")}>
            {(p) => <Input {...p} type="email" autoComplete="off" value={form.email} disabled={saving} onChange={(e) => setF("email", e.target.value)} />}
          </Field>
          <Field label="Phone">
            {(p) => <Input {...p} type="tel" value={form.phone} disabled={saving} onChange={(e) => setF("phone", e.target.value)} />}
          </Field>
          <Field label="Role" required hint={editingSelf ? "You can't change your own role." : ROLE_INFO[form.role]?.summary} className="sm:col-span-2">
            {(p) => (
              <Select {...p} value={form.role} disabled={saving || editingSelf} onChange={(e) => setF("role", e.target.value)}>
                {ROLE_ORDER.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          {!editing ? (
            <>
              <Field label="Temporary password" required hint="At least 8 characters. Share it securely." error={errors.password || fieldError(apiError, "password")}>
                {(p) => <Input {...p} type="password" autoComplete="new-password" value={form.password} disabled={saving} onChange={(e) => setF("password", e.target.value)} />}
              </Field>
              <Field label="Confirm password" required error={errors.confirm}>
                {(p) => <Input {...p} type="password" autoComplete="new-password" value={form.confirm} disabled={saving} onChange={(e) => setF("confirm", e.target.value)} />}
              </Field>
            </>
          ) : (
            !editingSelf && (
              <div className="rounded-lg border border-line bg-surface-muted p-4 sm:col-span-2">
                <Switch checked={form.is_active} onChange={(v) => setF("is_active", v)} disabled={saving} label="Can sign in" description="Deactivated accounts keep their history but can't log in." />
              </div>
            )
          )}
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title="Remove account?"
        message={
          <>
            <strong className="font-semibold text-ink">{toDelete?.full_name}</strong> ({toDelete?.email}) will no longer be able to sign in, and the account
            will be permanently deleted. To keep their history, deactivate the account instead.
          </>
        }
        confirmText="Remove account"
        isLoading={deleting}
      />
    </div>
  );
}
