"use client";

import { Suspense, useCallback, useEffect, useState, type SyntheticEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { errorMessage, familiesApi, listAll, memberStatsApi, membersApi, type Family, type Member } from "@/lib/api";
import { useAsync, useDebounced, usePageForFilters } from "@/lib/hooks";
import { formatDate, initials, labelFor, LIFE_STAGES } from "@/lib/format";
import { Modal, ConfirmDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { Select } from "@/components/ui/form";
import { MemberStatusBadge } from "@/components/domain";
import {
  Alert,
  Avatar,
  Button,
  ButtonLink,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  Pagination,
  SearchInput,
  Segmented,
  TableSkeleton,
} from "@/components/ui/primitives";
import {
  ContactFields,
  emptyMember,
  formToPayload,
  MembershipFields,
  memberToForm,
  NameFields,
  QUICK_FIELDS,
  validateMember,
  type MemberFormErrors,
  type MemberFormValues,
} from "@/components/member-form";

const PAGE_SIZE = 25;

type StatusFilter = "all" | "active" | "visitor" | "inactive";

const SORTS = [
  { value: "last_name", label: "Name (A–Z)" },
  { value: "-created_at", label: "Recently added" },
  { value: "-membership_date", label: "Member since (newest)" },
];

export default function PeopleDirectoryPage() {
  return (
    <Suspense fallback={<Card><TableSkeleton /></Card>}>
      <PeopleDirectory />
    </Suspense>
  );
}

function PeopleDirectory() {
  const { token } = useAuth();
  const toast = useToast();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";

  const [search, setSearch] = useState(urlQuery);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [lifeStage, setLifeStage] = useState("");
  const [ordering, setOrdering] = useState("last_name");
  const debouncedSearch = useDebounced(search.trim());
  const [page, setPage] = usePageForFilters(`${debouncedSearch}|${status}|${lifeStage}|${ordering}`);

  // A search submitted from the header updates the URL; mirror it here.
  const [syncedQuery, setSyncedQuery] = useState(urlQuery);
  if (urlQuery !== syncedQuery) {
    setSyncedQuery(urlQuery);
    setSearch(urlQuery);
  }

  const t = token ?? "";
  const list = useAsync(
    token
      ? () => {
          const qs = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE), ordering });
          if (debouncedSearch) qs.set("search", debouncedSearch);
          if (status !== "all") qs.set("status", status);
          if (lifeStage) qs.set("life_stage", lifeStage);
          return membersApi.list(t, qs.toString());
        }
      : null,
    [token, page, debouncedSearch, status, lifeStage, ordering]
  );
  const stats = useAsync(token ? () => memberStatsApi(t) : null, [token]);
  const [families, setFamilies] = useState<Family[]>([]);

  const loadFamilies = useCallback(() => {
    if (token) listAll(familiesApi.list, token, "ordering=name").then(setFamilies).catch(() => setFamilies([]));
  }, [token]);
  useEffect(loadFamilies, [loadFamilies]);

  // ── Quick add / edit dialog ────────────────────────────────────────────
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [values, setValues] = useState<MemberFormValues>(emptyMember);
  const [errors, setErrors] = useState<MemberFormErrors>({});
  const [apiError, setApiError] = useState<unknown>(null);
  const [loadingRecord, setLoadingRecord] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof MemberFormValues>(key: K, value: MemberFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    if (key in errors) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const openAdd = () => {
    setEditing(null);
    setValues(emptyMember);
    setErrors({});
    setApiError(null);
    setDialogOpen(true);
  };

  const openEdit = async (m: Member) => {
    setEditing(m);
    setErrors({});
    setApiError(null);
    setValues({ ...emptyMember, first_name: m.first_name, last_name: m.last_name, email: m.email, phone_mobile: m.phone_mobile, status: m.status, life_stage: m.life_stage });
    setDialogOpen(true);
    if (!token) return;
    setLoadingRecord(true);
    try {
      setValues(memberToForm(await membersApi.detail(token, m.id)));
    } catch (e) {
      setApiError(e);
    } finally {
      setLoadingRecord(false);
    }
  };

  const handleSave = async (e: SyntheticEvent) => {
    e.preventDefault();
    if (!token || saving) return;
    const v = validateMember(values);
    setErrors(v);
    if (Object.keys(v).length) return;
    setSaving(true);
    setApiError(null);
    try {
      const payload = formToPayload(values, QUICK_FIELDS);
      const name = `${values.first_name.trim()} ${values.last_name.trim()}`;
      if (editing) {
        await membersApi.update(token, editing.id, payload);
        toast.success("Changes saved", `${name}'s record was updated.`);
      } else {
        await membersApi.create(token, payload);
        toast.success("Person added", `${name} was added to the directory.`);
      }
      setDialogOpen(false);
      list.reload();
      stats.reload();
    } catch (err) {
      setApiError(err);
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────
  const [toDelete, setToDelete] = useState<Member | null>(null);
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = async () => {
    if (!token || !toDelete || deleting) return;
    setDeleting(true);
    try {
      await membersApi.remove(token, toDelete.id);
      toast.success("Person removed", `${toDelete.full_name} was removed from the directory.`);
      setToDelete(null);
      if (list.data && list.data.results.length === 1 && page > 1) setPage(page - 1);
      else list.reload();
      stats.reload();
    } catch (err) {
      toast.error("Couldn't remove person", errorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const filtersActive = Boolean(debouncedSearch || status !== "all" || lifeStage);
  const resetFilters = () => {
    setSearch("");
    setStatus("all");
    setLifeStage("");
  };

  const rows = list.data?.results ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="People"
        description="Members, regular attendees and visitors in one directory."
        actions={
          <>
            <Button icon="bolt" onClick={openAdd}>
              Quick add
            </Button>
            <ButtonLink href="/dashboard/members/new" variant="primary" icon="person_add">
              Add person
            </ButtonLink>
          </>
        }
      />

      <Card className="overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center lg:justify-between">
          <Segmented<StatusFilter>
            label="Filter by membership status"
            value={status}
            onChange={setStatus}
            options={[
              { value: "all", label: "All", count: stats.data?.total },
              { value: "active", label: "Active", count: stats.data?.active },
              { value: "visitor", label: "Visitors", count: stats.data?.visitors },
              { value: "inactive", label: "Inactive", count: stats.data?.inactive },
            ]}
          />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto] lg:w-auto lg:min-w-[560px]">
            <SearchInput value={search} onChange={setSearch} placeholder="Search name, email or phone" label="Search people" />
            <Select aria-label="Filter by life stage" value={lifeStage} onChange={(e) => setLifeStage(e.target.value)} className="sm:w-40">
              <option value="">All life stages</option>
              {LIFE_STAGES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
            <Select aria-label="Sort people" value={ordering} onChange={(e) => setOrdering(e.target.value)} className="sm:w-48">
              {SORTS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {list.loading && !list.data ? (
          <TableSkeleton />
        ) : list.error ? (
          <ErrorState message={list.error} onRetry={list.reload} />
        ) : rows.length === 0 ? (
          filtersActive ? (
            <EmptyState
              icon="person_search"
              title="No matching people"
              description="Try a different search term or clear the filters."
              action={<Button onClick={resetFilters}>Clear filters</Button>}
            />
          ) : (
            <EmptyState
              icon="group_add"
              title="The directory is empty"
              description="Add your first member or visitor to get started."
              action={
                <ButtonLink href="/dashboard/members/new" variant="primary" icon="person_add">
                  Add person
                </ButtonLink>
              }
            />
          )
        ) : (
          <div className={list.loading ? "opacity-60 transition-opacity" : "transition-opacity"} aria-busy={list.loading}>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Contact</th>
                    <th scope="col">Household</th>
                    <th scope="col">Status</th>
                    <th scope="col">Member since</th>
                    <th scope="col">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <Avatar name={m.full_name} initials={initials(m.first_name, m.last_name)} src={m.photo} />
                          <div className="min-w-0">
                            <Link href={`/dashboard/members/${m.id}`} className="block truncate font-medium text-ink hover:text-brand hover:underline">
                              {m.full_name}
                            </Link>
                            <span className="block text-[13px] text-ink-muted">
                              {labelFor(LIFE_STAGES, m.life_stage)}
                              {m.age !== null ? ` · ${m.age} yrs` : ""}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="block max-w-[220px] truncate">{m.email || <span className="text-ink-subtle">No email</span>}</span>
                        <span className="block text-[13px] text-ink-muted">{m.phone_mobile || "No phone"}</span>
                      </td>
                      <td className="text-ink-muted">{m.family_name || "—"}</td>
                      <td>
                        <MemberStatusBadge status={m.status} />
                      </td>
                      <td className="whitespace-nowrap text-ink-muted">{formatDate(m.membership_date)}</td>
                      <td>
                        <RowActions member={m} onEdit={() => openEdit(m)} onDelete={() => setToDelete(m)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <ul className="divide-y divide-line md:hidden">
              {rows.map((m) => (
                <li key={m.id} className="flex items-start gap-3 px-4 py-3.5">
                  <Avatar name={m.full_name} initials={initials(m.first_name, m.last_name)} src={m.photo} size={40} />
                  <div className="min-w-0 flex-1">
                    <Link href={`/dashboard/members/${m.id}`} className="block truncate font-medium text-ink">
                      {m.full_name}
                    </Link>
                    <p className="truncate text-[13px] text-ink-muted">{m.phone_mobile || m.email || "No contact details"}</p>
                    <div className="mt-1.5">
                      <MemberStatusBadge status={m.status} />
                    </div>
                  </div>
                  <RowActions member={m} onEdit={() => openEdit(m)} onDelete={() => setToDelete(m)} />
                </li>
              ))}
            </ul>

            <Pagination page={page} pageSize={PAGE_SIZE} total={list.data?.count ?? 0} onPageChange={setPage} noun="people" />
          </div>
        )}
      </Card>

      {/* Quick add / edit */}
      <Modal
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editing ? `Edit ${editing.full_name}` : "Quick add person"}
        subtitle={editing ? "Update contact and membership details." : "Capture the essentials now. You can complete the full profile later."}
        maxWidth="xl"
        isSubmitting={saving}
        footer={
          <>
            <Button onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" form="member-quick-form" variant="primary" loading={saving} disabled={loadingRecord}>
              {editing ? "Save changes" : "Add person"}
            </Button>
          </>
        }
      >
        <form id="member-quick-form" onSubmit={handleSave} noValidate className="flex flex-col gap-4">
          {apiError ? <Alert title="Couldn't save this record">{errorMessage(apiError)}</Alert> : null}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <NameFields values={values} set={set} errors={errors} apiError={apiError} disabled={saving || loadingRecord} />
            <ContactFields values={values} set={set} errors={errors} apiError={apiError} disabled={saving || loadingRecord} />
            <MembershipFields values={values} set={set} errors={errors} apiError={apiError} disabled={saving || loadingRecord} families={families} />
          </div>
          {editing && (
            <p className="text-[13px] text-ink-muted">
              Need to update address, dates or other details?{" "}
              <Link href={`/dashboard/members/${editing.id}`} className="font-medium text-brand hover:underline">
                Open the full profile
              </Link>
            </p>
          )}
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title="Remove person?"
        message={
          <>
            <strong className="font-semibold text-ink">{toDelete?.full_name}</strong> will be permanently removed from the directory, along
            with their pastoral notes and attendance records. Giving records are kept but will no longer be linked to them. This can&apos;t
            be undone.
          </>
        }
        confirmText="Remove person"
        isLoading={deleting}
      />
    </div>
  );
}

function RowActions({ member, onEdit, onDelete }: { member: Member; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Link
        href={`/dashboard/members/${member.id}`}
        className="btn btn-ghost btn-sm btn-icon"
        aria-label={`View ${member.full_name}`}
        title="View profile"
      >
        <span className="material-symbols-outlined" aria-hidden>
          visibility
        </span>
      </Link>
      <Button variant="ghost" size="sm" iconOnly icon="edit" aria-label={`Edit ${member.full_name}`} title="Edit" onClick={onEdit} />
      <Button variant="danger-ghost" size="sm" iconOnly icon="delete" aria-label={`Remove ${member.full_name}`} title="Remove" onClick={onDelete} />
    </div>
  );
}
