"use client";

import { useCallback, useEffect, useMemo, useState, type SyntheticEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import {
  attendanceApi,
  attendanceRecordsApi,
  errorMessage,
  fieldError,
  listAll,
  membersApi,
  serviceTypesApi,
  type AttendanceRecord,
  type Member,
  type ServiceRecord,
} from "@/lib/api";
import { useAsync } from "@/lib/hooks";
import { formatDate, formatNumber, initialsFromName, todayISO } from "@/lib/format";
import { Modal, ConfirmDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { BarChart } from "@/components/charts";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  PageHeader,
  Pagination,
  Segmented,
  Skeleton,
  StatCard,
  TableSkeleton,
} from "@/components/ui/primitives";

const PAGE_SIZE = 20;
const NEW_TYPE = "__new__";
const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

interface ServiceForm {
  service_type: string;
  newTypeName: string;
  newTypeDay: string;
  date: string;
  title: string;
  expected_count: string;
  notes: string;
}

const emptyService = (): ServiceForm => ({
  service_type: "",
  newTypeName: "",
  newTypeDay: WEEKDAYS[new Date().getDay()],
  date: todayISO(),
  title: "",
  expected_count: "",
  notes: "",
});

export default function AttendancePage() {
  const { token } = useAuth();
  const toast = useToast();
  const t = token ?? "";
  const [page, setPage] = useState(1);

  const services = useAsync(
    token ? () => attendanceApi.list(t, `ordering=-date&page=${page}&page_size=${PAGE_SIZE}`) : null,
    [token, page]
  );
  const types = useAsync(token ? () => listAll(serviceTypesApi.list, t) : null, [token]);
  const trends = useAsync(token ? () => attendanceApi.trends(t) : null, [token]);
  const firstTimers = useAsync(token ? () => attendanceRecordsApi.list(t, "is_first_time=true&page_size=1") : null, [token]);

  const refreshAll = () => {
    services.reload();
    trends.reload();
    firstTimers.reload();
  };

  const trendData = trends.data ?? [];
  const avg = trendData.length ? Math.round(trendData.reduce((s, r) => s + r.count, 0) / trendData.length) : null;
  const latest = services.data?.results[0];

  // ── Create / edit service ──────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceRecord | null>(null);
  const [form, setForm] = useState<ServiceForm>(emptyService);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof ServiceForm, string>>>({});
  const [apiError, setApiError] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);
  const setF = <K extends keyof ServiceForm>(k: K, v: ServiceForm[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setFormErrors((e) => ({ ...e, [k]: undefined }));
  };

  const openCreate = () => {
    setEditing(null);
    const f = emptyService();
    f.service_type = types.data?.[0]?.id ?? NEW_TYPE;
    setForm(f);
    setFormErrors({});
    setApiError(null);
    setFormOpen(true);
  };

  const openEdit = (s: ServiceRecord) => {
    setEditing(s);
    setForm({
      ...emptyService(),
      service_type: s.service_type ?? "",
      date: s.date,
      title: s.title ?? "",
      expected_count: s.expected_count ? String(s.expected_count) : "",
      notes: s.notes ?? "",
    });
    setFormErrors({});
    setApiError(null);
    setFormOpen(true);
    // The list endpoint omits notes; load them so saving doesn't clear them.
    attendanceApi
      .get(t, s.id)
      .then((full) => setForm((f) => ({ ...f, notes: full.notes ?? "" })))
      .catch(() => undefined);
  };

  const handleSave = async (e: SyntheticEvent) => {
    e.preventDefault();
    if (!token || saving) return;
    const errs: typeof formErrors = {};
    if (!form.service_type) errs.service_type = "Choose a service type.";
    if (form.service_type === NEW_TYPE && !form.newTypeName.trim()) errs.newTypeName = "Name the new service type.";
    if (!form.date) errs.date = "Choose a date.";
    setFormErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    setApiError(null);
    try {
      let typeId = form.service_type;
      if (typeId === NEW_TYPE) {
        const created = await serviceTypesApi.create(t, { name: form.newTypeName.trim(), default_day: form.newTypeDay, is_active: true });
        typeId = created.id;
        types.reload();
      }
      const payload = {
        service_type: typeId,
        date: form.date,
        title: form.title.trim(),
        expected_count: form.expected_count ? Number(form.expected_count) : null,
        notes: form.notes.trim(),
      };
      if (editing) {
        await attendanceApi.update(t, editing.id, payload);
        toast.success("Service updated");
      } else {
        await attendanceApi.create(t, payload);
        toast.success("Service created", "You can now check people in.");
      }
      setFormOpen(false);
      refreshAll();
    } catch (err) {
      setApiError(err);
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────
  const [toDelete, setToDelete] = useState<ServiceRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const confirmDelete = async () => {
    if (!token || !toDelete || deleting) return;
    setDeleting(true);
    try {
      await attendanceApi.remove(t, toDelete.id);
      toast.success("Service deleted", "The service and its check-ins were removed.");
      setToDelete(null);
      refreshAll();
    } catch (err) {
      toast.error("Couldn't delete service", errorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  // ── Check-in drawer ────────────────────────────────────────────────────
  const [checkInService, setCheckInService] = useState<ServiceRecord | null>(null);

  const rows = services.data?.results ?? [];
  const uniqueTypeError = apiError && errorMessage(apiError).toLowerCase().includes("unique");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Attendance"
        description="Create a service, then check members and guests in. Totals are calculated from check-ins."
        actions={
          <Button variant="primary" icon="add" onClick={openCreate} disabled={types.loading}>
            New service
          </Button>
        }
      />

      <section aria-label="Attendance summary" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Latest service"
          icon="how_to_reg"
          loading={services.loading && !services.data}
          value={latest ? formatNumber(latest.actual_count) : "—"}
          hint={latest ? `${latest.service_type_name ?? "Service"} · ${formatDate(latest.date)}` : "No services yet"}
        />
        <StatCard
          label="12-week average"
          icon="monitoring"
          tone="success"
          loading={trends.loading}
          value={avg === null ? "—" : formatNumber(avg)}
          hint={trendData.length ? `Across ${trendData.length} service${trendData.length === 1 ? "" : "s"}` : "No recent services"}
        />
        <StatCard
          label="First-time guests"
          icon="waving_hand"
          tone="accent"
          loading={firstTimers.loading}
          value={firstTimers.error ? "—" : formatNumber(firstTimers.data?.count)}
          hint="All recorded check-ins"
        />
        <StatCard
          label="Services recorded"
          icon="event_note"
          tone="neutral"
          loading={services.loading && !services.data}
          value={formatNumber(services.data?.count)}
          hint="All time"
        />
      </section>

      <Card>
        <CardHeader title="Attendance trend" description="Check-ins per service over the last 12 weeks" icon="monitoring" />
        <div className="px-5 pb-5">
          {trends.loading ? (
            <Skeleton className="h-48 w-full" />
          ) : trends.error ? (
            <ErrorState compact message={trends.error} onRetry={trends.reload} />
          ) : trendData.length === 0 ? (
            <p className="rounded-lg border border-dashed border-line px-4 py-10 text-center text-[13px] text-ink-muted">
              Trends appear once services in the last 12 weeks have check-ins.
            </p>
          ) : (
            <BarChart
              caption="Check-ins per service"
              valueLabel="Check-ins"
              data={trendData.map((r, i) => ({
                key: `${r.date}-${i}`,
                label: formatDate(r.date, { month: "short", day: "numeric" }),
                value: r.count,
              }))}
            />
          )}
        </div>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader title="Services" description="Most recent first" icon="event_note" />
        {services.loading && !services.data ? (
          <TableSkeleton rows={5} cols={3} />
        ) : services.error ? (
          <ErrorState message={services.error} onRetry={services.reload} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon="fact_check"
            title="No services recorded"
            description="Create your first service, then check people in as they arrive."
            action={
              <Button variant="primary" icon="add" onClick={openCreate}>
                New service
              </Button>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Service</th>
                    <th scope="col" className="num">
                      Checked in
                    </th>
                    <th scope="col" className="num hidden sm:table-cell">
                      Expected
                    </th>
                    <th scope="col">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((s) => (
                    <tr key={s.id}>
                      <td className="whitespace-nowrap">{formatDate(s.date, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</td>
                      <td>
                        <span className="block font-medium">{s.service_type_name}</span>
                        {s.title && <span className="block text-[13px] text-ink-muted">{s.title}</span>}
                      </td>
                      <td className="num font-semibold">{formatNumber(s.actual_count)}</td>
                      <td className="num hidden text-ink-muted sm:table-cell">{s.expected_count ? formatNumber(s.expected_count) : "—"}</td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" icon="how_to_reg" onClick={() => setCheckInService(s)}>
                            Check in
                          </Button>
                          <Button variant="ghost" size="sm" iconOnly icon="edit" aria-label={`Edit service on ${formatDate(s.date)}`} title="Edit" onClick={() => openEdit(s)} />
                          <Button variant="danger-ghost" size="sm" iconOnly icon="delete" aria-label={`Delete service on ${formatDate(s.date)}`} title="Delete" onClick={() => setToDelete(s)} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageSize={PAGE_SIZE} total={services.data?.count ?? 0} onPageChange={setPage} noun="services" />
          </>
        )}
      </Card>

      {/* New / edit service */}
      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Edit service" : "New service"}
        subtitle={editing ? "Update the service details." : "Create the service you want to record attendance for."}
        maxWidth="lg"
        isSubmitting={saving}
        footer={
          <>
            <Button onClick={() => setFormOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" form="service-form" variant="primary" loading={saving}>
              {editing ? "Save changes" : "Create service"}
            </Button>
          </>
        }
      >
        <form id="service-form" onSubmit={handleSave} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {apiError ? (
            <Alert className="sm:col-span-2" title="Couldn't save service">
              {uniqueTypeError ? "A service of this type already exists on this date. Open it from the list to check people in." : errorMessage(apiError)}
            </Alert>
          ) : null}
          <Field label="Service type" required error={formErrors.service_type} className="sm:col-span-2">
            {(p) => (
              <Select {...p} value={form.service_type} disabled={saving} onChange={(e) => setF("service_type", e.target.value)}>
                <option value="" disabled>
                  Select a service type
                </option>
                {(types.data ?? []).map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name}
                  </option>
                ))}
                <option value={NEW_TYPE}>+ New service type…</option>
              </Select>
            )}
          </Field>
          {form.service_type === NEW_TYPE && (
            <>
              <Field label="New type name" required error={formErrors.newTypeName} hint="e.g. Sunday Morning, Midweek Prayer">
                {(p) => <Input {...p} value={form.newTypeName} disabled={saving} onChange={(e) => setF("newTypeName", e.target.value)} />}
              </Field>
              <Field label="Usual day">
                {(p) => (
                  <Select {...p} value={form.newTypeDay} disabled={saving} onChange={(e) => setF("newTypeDay", e.target.value)}>
                    {WEEKDAYS.map((d) => (
                      <option key={d} value={d}>
                        {d.charAt(0).toUpperCase() + d.slice(1)}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            </>
          )}
          <Field label="Date" required error={formErrors.date || fieldError(apiError, "date")}>
            {(p) => <Input {...p} type="date" value={form.date} disabled={saving} onChange={(e) => setF("date", e.target.value)} />}
          </Field>
          <Field label="Expected attendance" hint="Optional planning figure" error={fieldError(apiError, "expected_count")}>
            {(p) => <Input {...p} type="number" min={0} inputMode="numeric" value={form.expected_count} disabled={saving} onChange={(e) => setF("expected_count", e.target.value)} />}
          </Field>
          <Field label="Title" hint="Optional, e.g. Harvest Sunday" className="sm:col-span-2">
            {(p) => <Input {...p} value={form.title} disabled={saving} onChange={(e) => setF("title", e.target.value)} />}
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            {(p) => <Textarea {...p} rows={2} value={form.notes} disabled={saving} onChange={(e) => setF("notes", e.target.value)} />}
          </Field>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete service?"
        message={
          <>
            The {toDelete?.service_type_name} service on <strong className="font-semibold text-ink">{toDelete ? formatDate(toDelete.date) : ""}</strong>{" "}
            and all {toDelete?.actual_count ?? 0} check-in{toDelete?.actual_count === 1 ? "" : "s"} will be permanently deleted.
          </>
        }
        confirmText="Delete service"
        isLoading={deleting}
      />

      <CheckInDrawer key={checkInService?.id ?? "closed"} service={checkInService} token={t} onClose={() => setCheckInService(null)} onChanged={refreshAll} />
    </div>
  );
}

/* ── Check-in drawer ─────────────────────────────────────────────────── */
type CheckInMode = "member" | "guest";

function CheckInDrawer({
  service,
  token,
  onClose,
  onChanged,
}: {
  service: ServiceRecord | null;
  token: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const toast = useToast();
  const [records, setRecords] = useState<AttendanceRecord[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [mode, setMode] = useState<CheckInMode>("member");
  const [memberId, setMemberId] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [firstTime, setFirstTime] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchRecords = useCallback(() => {
    if (!service) return;
    listAll(attendanceRecordsApi.list, token, `service=${service.id}`)
      .then(setRecords)
      .catch((e) => setLoadError(errorMessage(e)));
  }, [service, token]);

  const retry = () => {
    setLoadError(null);
    setRecords(null);
    fetchRecords();
  };

  useEffect(() => {
    if (!service) return;
    listAll(attendanceRecordsApi.list, token, `service=${service.id}`)
      .then(setRecords)
      .catch((e) => setLoadError(errorMessage(e)));
    if (members.length === 0) listAll(membersApi.list, token, "ordering=last_name").then(setMembers).catch(() => setMembers([]));
  }, [service, token, members.length]);

  const checkedIn = useMemo(() => new Set((records ?? []).map((r) => r.member).filter(Boolean) as string[]), [records]);
  const available = members.filter((m) => !checkedIn.has(m.id));

  const submit = async (e: SyntheticEvent) => {
    e.preventDefault();
    if (!service || submitting) return;
    if (mode === "member" && !memberId) return setFormError("Choose a person to check in.");
    if (mode === "guest" && !guestName.trim()) return setFormError("Enter the guest's name.");
    setSubmitting(true);
    setFormError("");
    try {
      const now = new Date();
      const created = await attendanceRecordsApi.create(token, {
        service: service.id,
        member: mode === "member" ? memberId : null,
        guest_name: mode === "guest" ? guestName.trim() : "",
        guest_phone: mode === "guest" ? guestPhone.trim() : "",
        is_first_time: firstTime,
        check_in_time: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
      });
      setRecords((r) => [created, ...(r ?? [])]);
      toast.success("Checked in", `${created.member_name || created.guest_name} was checked in.`);
      setMemberId("");
      setGuestName("");
      setGuestPhone("");
      setFirstTime(false);
      onChanged();
    } catch (err) {
      const msg = errorMessage(err);
      setFormError(msg.toLowerCase().includes("unique") ? "This person is already checked in to this service." : msg);
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (r: AttendanceRecord) => {
    if (removingId) return;
    setRemovingId(r.id);
    try {
      await attendanceRecordsApi.remove(token, r.id);
      setRecords((list) => (list ?? []).filter((x) => x.id !== r.id));
      toast.success("Check-in removed", `${r.member_name || r.guest_name} was removed from this service.`);
      onChanged();
    } catch (err) {
      toast.error("Couldn't remove check-in", errorMessage(err));
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <Modal
      isOpen={Boolean(service)}
      onClose={onClose}
      title={service ? `${service.service_type_name} · ${formatDate(service.date)}` : "Check in"}
      subtitle={records ? `${records.length} checked in${service?.expected_count ? ` of ${service.expected_count} expected` : ""}` : "Loading check-ins…"}
      variant="drawer"
      maxWidth="sm:max-w-md"
    >
      <form onSubmit={submit} className="rounded-lg border border-line bg-surface-muted p-4">
        <Segmented<CheckInMode>
          label="Check-in type"
          size="sm"
          value={mode}
          onChange={(m) => {
            setMode(m);
            setFormError("");
          }}
          options={[
            { value: "member", label: "Person in directory", icon: "person" },
            { value: "guest", label: "Guest", icon: "waving_hand" },
          ]}
        />
        <div className="mt-4 flex flex-col gap-3">
          {mode === "member" ? (
            <Field label="Person" error={formError || undefined}>
              {(p) => (
                <Select {...p} value={memberId} disabled={submitting} onChange={(e) => setMemberId(e.target.value)}>
                  <option value="">{members.length === 0 ? "Loading people…" : `Select a person (${available.length} not yet checked in)`}</option>
                  {available.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.full_name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          ) : (
            <>
              <Field label="Guest name" required error={formError || undefined}>
                {(p) => <Input {...p} value={guestName} disabled={submitting} onChange={(e) => setGuestName(e.target.value)} />}
              </Field>
              <Field label="Phone">
                {(p) => <Input {...p} type="tel" value={guestPhone} disabled={submitting} onChange={(e) => setGuestPhone(e.target.value)} />}
              </Field>
            </>
          )}
          <Checkbox checked={firstTime} onChange={setFirstTime} disabled={submitting} label="First time attending" />
          <Button type="submit" variant="primary" icon="how_to_reg" loading={submitting} className="w-full">
            Check in
          </Button>
        </div>
      </form>

      <div className="mt-5">
        {loadError ? (
          <ErrorState compact message={loadError} onRetry={retry} />
        ) : !records ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : records.length === 0 ? (
          <EmptyState compact icon="how_to_reg" title="No one checked in yet" description="Check-ins you add will appear here." />
        ) : (
          <ul className="divide-y divide-line rounded-lg border border-line">
            {records.map((r) => {
              const name = r.member_name || r.guest_name || "Unknown";
              return (
                <li key={r.id} className="flex items-center gap-3 px-3 py-2.5">
                  <Avatar name={name} initials={initialsFromName(name)} size={32} />
                  <div className="min-w-0 flex-1">
                    {r.member ? (
                      <Link href={`/dashboard/members/${r.member}`} className="block truncate text-sm font-medium text-ink hover:text-brand hover:underline">
                        {name}
                      </Link>
                    ) : (
                      <span className="block truncate text-sm font-medium text-ink">{name}</span>
                    )}
                    <span className="block text-[12px] text-ink-muted">
                      {r.member ? "Member" : "Guest"}
                      {r.check_in_time ? ` · ${r.check_in_time.slice(0, 5)}` : ""}
                    </span>
                  </div>
                  {r.is_first_time && <Badge tone="accent">First time</Badge>}
                  <Button
                    variant="danger-ghost"
                    size="xs"
                    iconOnly
                    icon="close"
                    loading={removingId === r.id}
                    aria-label={`Remove check-in for ${name}`}
                    title="Remove check-in"
                    onClick={() => remove(r)}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Modal>
  );
}
