"use client";

import { useCallback, useEffect, useMemo, useState, type SyntheticEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import {
  errorMessage,
  fieldError,
  groupCategoriesApi,
  groupsApi,
  listAll,
  membersApi,
  type Group,
  type GroupCategory,
  type GroupMembership,
  type Member,
} from "@/lib/api";
import { useAsync, useDebounced } from "@/lib/hooks";
import { formatClock, formatDate, humanize, initialsFromName } from "@/lib/format";
import { Modal, ConfirmDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui/form";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Icon,
  PageHeader,
  SearchInput,
  Segmented,
  Skeleton,
} from "@/components/ui/primitives";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const FREQUENCIES = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every two weeks" },
  { value: "monthly", label: "Monthly" },
  { value: "irregular", label: "Irregular" },
];
const NEW_CATEGORY = "__new__";

interface GroupForm {
  name: string;
  category: string;
  newCategory: string;
  leader: string;
  description: string;
  meeting_day: string;
  meeting_time: string;
  meeting_frequency: string;
  meeting_location: string;
  max_members: string;
  is_open: boolean;
  is_active: boolean;
}

const emptyForm: GroupForm = {
  name: "",
  category: "",
  newCategory: "",
  leader: "",
  description: "",
  meeting_day: "",
  meeting_time: "",
  meeting_frequency: "weekly",
  meeting_location: "",
  max_members: "",
  is_open: true,
  is_active: true,
};

type ActiveFilter = "active" | "inactive" | "all";

export default function GroupsPage() {
  const { token } = useAuth();
  const toast = useToast();
  const t = token ?? "";

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("active");
  const debouncedSearch = useDebounced(search.trim());

  const categories = useAsync(token ? () => listAll(groupCategoriesApi.list, t) : null, [token]);
  const groups = useAsync(
    token
      ? () => {
          const qs = new URLSearchParams();
          if (debouncedSearch) qs.set("search", debouncedSearch);
          if (category) qs.set("category", category);
          if (activeFilter !== "all") qs.set("is_active", activeFilter === "active" ? "true" : "false");
          return listAll(groupsApi.list, t, qs.toString());
        }
      : null,
    [token, debouncedSearch, category, activeFilter]
  );

  const [members, setMembers] = useState<Member[]>([]);
  const loadMembers = useCallback(() => {
    if (token && members.length === 0) listAll(membersApi.list, token, "ordering=last_name").then(setMembers).catch(() => setMembers([]));
  }, [token, members.length]);

  // ── Create / edit ──────────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Group | null>(null);
  const [form, setForm] = useState<GroupForm>(emptyForm);
  const [nameError, setNameError] = useState("");
  const [apiError, setApiError] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);

  const setF = <K extends keyof GroupForm>(k: K, v: GroupForm[K]) => setForm((f) => ({ ...f, [k]: v }));

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setNameError("");
    setApiError(null);
    setFormOpen(true);
    loadMembers();
  };

  const openEdit = (g: Group) => {
    setEditing(g);
    setForm({
      name: g.name,
      category: g.category ?? "",
      newCategory: "",
      leader: g.leader ?? "",
      description: g.description ?? "",
      meeting_day: g.meeting_day ?? "",
      meeting_time: g.meeting_time ? g.meeting_time.slice(0, 5) : "",
      meeting_frequency: g.meeting_frequency || "weekly",
      meeting_location: g.meeting_location ?? "",
      max_members: g.max_members ? String(g.max_members) : "",
      is_open: g.is_open,
      is_active: g.is_active,
    });
    setNameError("");
    setApiError(null);
    setFormOpen(true);
    loadMembers();
  };

  const handleSave = async (e: SyntheticEvent) => {
    e.preventDefault();
    if (!token || saving) return;
    if (!form.name.trim()) {
      setNameError("Group name is required.");
      return;
    }
    if (form.category === NEW_CATEGORY && !form.newCategory.trim()) {
      setApiError({ detail: "Enter a name for the new category." });
      return;
    }
    setSaving(true);
    setApiError(null);
    try {
      let categoryId: string | null = form.category || null;
      if (form.category === NEW_CATEGORY) {
        const created = await groupCategoriesApi.create(token, { name: form.newCategory.trim() });
        categoryId = created.id;
        categories.reload();
      }
      const payload = {
        name: form.name.trim(),
        category: categoryId,
        leader: form.leader || null,
        description: form.description.trim(),
        meeting_day: form.meeting_day,
        meeting_time: form.meeting_time || null,
        meeting_frequency: form.meeting_frequency,
        meeting_location: form.meeting_location.trim(),
        max_members: form.max_members ? Number(form.max_members) : null,
        is_open: form.is_open,
        is_active: form.is_active,
      };
      if (editing) {
        await groupsApi.update(token, editing.id, payload);
        toast.success("Group updated", `${payload.name} was saved.`);
      } else {
        await groupsApi.create(token, payload);
        toast.success("Group created", `${payload.name} is ready for members.`);
      }
      setFormOpen(false);
      groups.reload();
    } catch (err) {
      setApiError(err);
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────
  const [toDelete, setToDelete] = useState<Group | null>(null);
  const [deleting, setDeleting] = useState(false);
  const confirmDelete = async () => {
    if (!token || !toDelete || deleting) return;
    setDeleting(true);
    try {
      await groupsApi.remove(token, toDelete.id);
      toast.success("Group deleted", `${toDelete.name} was deleted.`);
      setToDelete(null);
      groups.reload();
    } catch (err) {
      toast.error("Couldn't delete group", errorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  // ── Roster drawer ──────────────────────────────────────────────────────
  const [rosterGroup, setRosterGroup] = useState<Group | null>(null);

  const list = groups.data ?? [];
  const filtersActive = Boolean(debouncedSearch || category || activeFilter !== "active");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Groups & ministries"
        description="Small groups, serving teams and ministries, with their leaders and members."
        actions={
          <Button variant="primary" icon="group_add" onClick={openCreate}>
            New group
          </Button>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Segmented<ActiveFilter>
          label="Filter by status"
          value={activeFilter}
          onChange={setActiveFilter}
          options={[
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
            { value: "all", label: "All" },
          ]}
        />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_220px] lg:min-w-[480px]">
          <SearchInput value={search} onChange={setSearch} placeholder="Search groups" label="Search groups" />
          <Select aria-label="Filter by category" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {(categories.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {groups.loading && !groups.data ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="space-y-3 p-5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-3/4" />
            </Card>
          ))}
        </div>
      ) : groups.error ? (
        <Card>
          <ErrorState message={groups.error} onRetry={groups.reload} />
        </Card>
      ) : list.length === 0 ? (
        <Card>
          {filtersActive ? (
            <EmptyState
              icon="search_off"
              title="No groups match"
              description="Try another search or clear the filters."
              action={
                <Button
                  onClick={() => {
                    setSearch("");
                    setCategory("");
                    setActiveFilter("active");
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon="diversity_3"
              title="No groups yet"
              description="Create your first small group, ministry or serving team."
              action={
                <Button variant="primary" icon="group_add" onClick={openCreate}>
                  New group
                </Button>
              }
            />
          )}
        </Card>
      ) : (
        <ul className={`grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 ${groups.loading ? "opacity-60" : ""}`}>
          {list.map((g) => (
            <li key={g.id}>
              <Card className="card-interactive flex h-full flex-col p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {g.category_name && <Badge tone="brand">{g.category_name}</Badge>}
                    {!g.is_active ? (
                      <Badge tone="neutral">Inactive</Badge>
                    ) : g.is_open ? (
                      <Badge tone="success" dot>
                        Open to join
                      </Badge>
                    ) : (
                      <Badge tone="warning" dot>
                        Closed
                      </Badge>
                    )}
                  </div>
                  <div className="-mr-2 -mt-1 flex items-center">
                    <Button variant="ghost" size="xs" iconOnly icon="edit" aria-label={`Edit ${g.name}`} title="Edit" onClick={() => openEdit(g)} />
                    <Button variant="danger-ghost" size="xs" iconOnly icon="delete" aria-label={`Delete ${g.name}`} title="Delete" onClick={() => setToDelete(g)} />
                  </div>
                </div>
                <h3 className="mt-3 text-base font-semibold text-ink">{g.name}</h3>
                <p className="mt-1 line-clamp-2 text-[13px] text-ink-muted">{g.description || "No description yet."}</p>

                {(g.meeting_day || g.meeting_time || g.meeting_location) && (
                  <p className="mt-3 flex items-start gap-1.5 text-[13px] text-ink-muted">
                    <Icon name="schedule" size={16} className="mt-px" />
                    <span>
                      {[
                        g.meeting_frequency && g.meeting_frequency !== "irregular" ? humanize(g.meeting_frequency) : null,
                        g.meeting_day,
                        formatClock(g.meeting_time),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                      {g.meeting_location ? ` · ${g.meeting_location}` : ""}
                    </span>
                  </p>
                )}

                <div className="flex-1" />
                <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-4">
                  <div className="flex min-w-0 items-center gap-2">
                    {g.leader_name ? (
                      <>
                        <Avatar name={g.leader_name} initials={initialsFromName(g.leader_name)} size={28} />
                        <span className="min-w-0 leading-tight">
                          <span className="block text-[11px] text-ink-muted">Leader</span>
                          <span className="block truncate text-[13px] font-medium text-ink">{g.leader_name}</span>
                        </span>
                      </>
                    ) : (
                      <span className="text-[13px] text-ink-subtle">No leader assigned</span>
                    )}
                  </div>
                  <Button size="sm" icon="group" onClick={() => setRosterGroup(g)} aria-label={`Manage members of ${g.name}`}>
                    {g.member_count}
                    {g.max_members ? ` / ${g.max_members}` : ""}
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {/* Create / edit */}
      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Edit group" : "New group"}
        subtitle={editing ? `Update ${editing.name}.` : "Set up a small group, ministry or serving team."}
        maxWidth="xl"
        isSubmitting={saving}
        footer={
          <>
            <Button onClick={() => setFormOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" form="group-form" variant="primary" loading={saving}>
              {editing ? "Save changes" : "Create group"}
            </Button>
          </>
        }
      >
        <form id="group-form" onSubmit={handleSave} noValidate className="flex flex-col gap-5">
          {apiError ? <Alert title="Couldn't save group">{errorMessage(apiError)}</Alert> : null}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Group name" required error={nameError || fieldError(apiError, "name")} className="sm:col-span-2">
              {(p) => (
                <Input
                  {...p}
                  value={form.name}
                  disabled={saving}
                  placeholder="e.g. Young Adults Fellowship"
                  onChange={(e) => {
                    setF("name", e.target.value);
                    setNameError("");
                  }}
                />
              )}
            </Field>
            <Field label="Category">
              {(p) => (
                <Select {...p} value={form.category} disabled={saving} onChange={(e) => setF("category", e.target.value)}>
                  <option value="">Uncategorized</option>
                  {(categories.data ?? []).map((c: GroupCategory) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                  <option value={NEW_CATEGORY}>+ New category…</option>
                </Select>
              )}
            </Field>
            {form.category === NEW_CATEGORY ? (
              <Field label="New category name" required>
                {(p) => <Input {...p} value={form.newCategory} disabled={saving} onChange={(e) => setF("newCategory", e.target.value)} />}
              </Field>
            ) : (
              <Field label="Leader" hint={members.length === 0 ? "Loading people…" : undefined}>
                {(p) => (
                  <Select {...p} value={form.leader} disabled={saving} onChange={(e) => setF("leader", e.target.value)}>
                    <option value="">No leader</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.full_name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            )}
            {form.category === NEW_CATEGORY && (
              <Field label="Leader" className="sm:col-span-2">
                {(p) => (
                  <Select {...p} value={form.leader} disabled={saving} onChange={(e) => setF("leader", e.target.value)}>
                    <option value="">No leader</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.full_name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            )}
            <Field label="Description" className="sm:col-span-2">
              {(p) => <Textarea {...p} rows={3} value={form.description} disabled={saving} onChange={(e) => setF("description", e.target.value)} />}
            </Field>
          </div>

          <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <legend className="mb-3 text-sm font-semibold text-ink">Meetings</legend>
            <Field label="Day">
              {(p) => (
                <Select {...p} value={form.meeting_day} disabled={saving} onChange={(e) => setF("meeting_day", e.target.value)}>
                  <option value="">Not set</option>
                  {DAYS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Time" error={fieldError(apiError, "meeting_time")}>
              {(p) => <Input {...p} type="time" value={form.meeting_time} disabled={saving} onChange={(e) => setF("meeting_time", e.target.value)} />}
            </Field>
            <Field label="Frequency">
              {(p) => (
                <Select {...p} value={form.meeting_frequency} disabled={saving} onChange={(e) => setF("meeting_frequency", e.target.value)}>
                  {FREQUENCIES.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Capacity" hint="Leave blank for no limit" error={fieldError(apiError, "max_members")}>
              {(p) => <Input {...p} type="number" min={1} inputMode="numeric" value={form.max_members} disabled={saving} onChange={(e) => setF("max_members", e.target.value)} />}
            </Field>
            <Field label="Location" className="sm:col-span-2">
              {(p) => <Input {...p} value={form.meeting_location} disabled={saving} placeholder="e.g. Fellowship Hall" onChange={(e) => setF("meeting_location", e.target.value)} />}
            </Field>
          </fieldset>

          <div className="flex flex-col gap-4 rounded-lg border border-line bg-surface-muted p-4">
            <Switch checked={form.is_open} onChange={(v) => setF("is_open", v)} disabled={saving} label="Open to new members" description="Show this group as accepting new people." />
            <Switch checked={form.is_active} onChange={(v) => setF("is_active", v)} disabled={saving} label="Active" description="Inactive groups are hidden from the default view." />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete group?"
        message={
          <>
            <strong className="font-semibold text-ink">{toDelete?.name}</strong> and its membership roster will be permanently deleted. People
            in the group stay in the directory. To keep the history, mark the group inactive instead.
          </>
        }
        confirmText="Delete group"
        isLoading={deleting}
      />

      <RosterDrawer
        key={rosterGroup?.id ?? "closed"}
        group={rosterGroup}
        token={t}
        members={members}
        onLoadMembers={loadMembers}
        onClose={() => setRosterGroup(null)}
        onChanged={groups.reload}
      />
    </div>
  );
}

/* ── Roster drawer: list / add / remove group members ────────────────── */
function RosterDrawer({
  group,
  token,
  members,
  onLoadMembers,
  onClose,
  onChanged,
}: {
  group: Group | null;
  token: string;
  members: Member[];
  onLoadMembers: () => void;
  onClose: () => void;
  onChanged: () => void;
}) {
  const toast = useToast();
  const [roster, setRoster] = useState<GroupMembership[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [memberId, setMemberId] = useState("");
  const [role, setRole] = useState("member");
  const [removing, setRemoving] = useState<GroupMembership | null>(null);
  const [removingBusy, setRemovingBusy] = useState(false);

  const fetchRoster = useCallback(() => {
    if (!group) return;
    groupsApi
      .members(token, group.id)
      .then(setRoster)
      .catch((e) => setError(errorMessage(e)));
  }, [group, token]);

  const retry = () => {
    setError(null);
    setRoster(null);
    fetchRoster();
  };

  useEffect(() => {
    if (!group) return;
    groupsApi
      .members(token, group.id)
      .then(setRoster)
      .catch((e) => setError(errorMessage(e)));
    onLoadMembers();
  }, [group, token, onLoadMembers]);

  const available = useMemo(() => {
    const inGroup = new Set((roster ?? []).map((r) => r.member));
    return members.filter((m) => !inGroup.has(m.id));
  }, [members, roster]);

  const add = async (e: SyntheticEvent) => {
    e.preventDefault();
    if (!group || !memberId || adding) return;
    setAdding(true);
    try {
      const created = await groupsApi.addMember(token, group.id, memberId, role);
      setRoster((r) => [...(r ?? []), created]);
      setMemberId("");
      toast.success("Member added", `${created.member_name} joined ${group.name}.`);
      onChanged();
    } catch (err) {
      const msg = errorMessage(err);
      toast.error(
        "Couldn't add member",
        msg.includes("unique") ? "This person was previously in the group. Their earlier membership must be restored by an administrator." : msg
      );
    } finally {
      setAdding(false);
    }
  };

  const remove = async () => {
    if (!group || !removing || removingBusy) return;
    setRemovingBusy(true);
    try {
      await groupsApi.removeMember(token, group.id, removing.id);
      setRoster((r) => (r ?? []).filter((x) => x.id !== removing.id));
      toast.success("Member removed", `${removing.member_name} was removed from ${group.name}.`);
      setRemoving(null);
      onChanged();
    } catch (err) {
      toast.error("Couldn't remove member", errorMessage(err));
    } finally {
      setRemovingBusy(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={Boolean(group)}
        onClose={onClose}
        title={group ? `${group.name} members` : "Members"}
        subtitle={roster ? `${roster.length} active member${roster.length === 1 ? "" : "s"}` : "Loading roster…"}
        variant="drawer"
        maxWidth="sm:max-w-md"
      >
        <form onSubmit={add} className="rounded-lg border border-line bg-surface-muted p-4">
          <p className="text-sm font-semibold text-ink">Add a member</p>
          <div className="mt-3 flex flex-col gap-3">
            <Field label="Person">
              {(p) => (
                <Select {...p} value={memberId} onChange={(e) => setMemberId(e.target.value)} disabled={adding}>
                  <option value="">{members.length === 0 ? "Loading people…" : "Select a person"}</option>
                  {available.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <div className="flex items-end gap-2">
              <Field label="Role" className="flex-1">
                {(p) => (
                  <Select {...p} value={role} onChange={(e) => setRole(e.target.value)} disabled={adding}>
                    <option value="member">Member</option>
                    <option value="co_leader">Co-leader</option>
                    <option value="leader">Leader</option>
                  </Select>
                )}
              </Field>
              <Button type="submit" variant="primary" icon="person_add" loading={adding} disabled={!memberId}>
                Add
              </Button>
            </div>
          </div>
        </form>

        <div className="mt-5">
          {error ? (
            <ErrorState compact message={error} onRetry={retry} />
          ) : !roster ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : roster.length === 0 ? (
            <EmptyState compact icon="group" title="No members yet" description="Add people using the form above." />
          ) : (
            <ul className="divide-y divide-line rounded-lg border border-line">
              {roster.map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-3 py-2.5">
                  <Avatar name={r.member_name} initials={initialsFromName(r.member_name)} size={32} />
                  <div className="min-w-0 flex-1">
                    <Link href={`/dashboard/members/${r.member}`} className="block truncate text-sm font-medium text-ink hover:text-brand hover:underline">
                      {r.member_name}
                    </Link>
                    <span className="block text-[12px] text-ink-muted">Joined {formatDate(r.joined_date)}</span>
                  </div>
                  {r.role !== "member" && <Badge tone="accent">{humanize(r.role)}</Badge>}
                  <Button variant="danger-ghost" size="xs" iconOnly icon="person_remove" aria-label={`Remove ${r.member_name}`} title="Remove from group" onClick={() => setRemoving(r)} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(removing)}
        onClose={() => setRemoving(null)}
        onConfirm={remove}
        title="Remove from group?"
        message={
          <>
            Remove <strong className="font-semibold text-ink">{removing?.member_name}</strong> from {group?.name}? They stay in the directory.
          </>
        }
        confirmText="Remove"
        isLoading={removingBusy}
      />
    </>
  );
}
