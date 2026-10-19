"use client";

import { useEffect, useMemo, useState, type SyntheticEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  errorMessage,
  eventCategoriesApi,
  eventsApi,
  fieldError,
  listAll,
  type Event,
  type RSVP,
} from "@/lib/api";
import { useAsync, useDebounced } from "@/lib/hooks";
import { formatDate, formatDateTime, formatTime, fromLocalInput, humanize, toLocalInput, todayISO } from "@/lib/format";
import { Modal, ConfirmDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui/form";
import {
  Alert,
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

const NEW_CATEGORY = "__new__";
type When = "upcoming" | "past" | "all";

interface EventForm {
  title: string;
  category: string;
  newCategory: string;
  is_all_day: boolean;
  start: string; // datetime-local or date
  end: string;
  location: string;
  description: string;
  requires_rsvp: boolean;
  max_attendees: string;
  is_public: boolean;
}

function defaultForm(): EventForm {
  const start = new Date();
  start.setDate(start.getDate() + 1);
  start.setHours(9, 0, 0, 0);
  const end = new Date(start);
  end.setHours(11);
  return {
    title: "",
    category: "",
    newCategory: "",
    is_all_day: false,
    start: toLocalInput(start.toISOString()),
    end: toLocalInput(end.toISOString()),
    location: "",
    description: "",
    requires_rsvp: false,
    max_attendees: "",
    is_public: true,
  };
}

function eventRange(e: Event) {
  if (e.is_all_day) {
    const s = formatDate(e.start_datetime);
    const en = formatDate(e.end_datetime);
    return s === en ? "All day" : `All day · until ${en}`;
  }
  const sameDay = new Date(e.start_datetime).toDateString() === new Date(e.end_datetime).toDateString();
  return sameDay
    ? `${formatTime(e.start_datetime)} – ${formatTime(e.end_datetime)}`
    : `${formatTime(e.start_datetime)} – ${formatDate(e.end_datetime, { month: "short", day: "numeric" })}, ${formatTime(e.end_datetime)}`;
}

export default function EventsPage() {
  const { token } = useAuth();
  const toast = useToast();
  const t = token ?? "";

  const [when, setWhen] = useState<When>("upcoming");
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounced(search.trim());

  const categories = useAsync(token ? () => listAll(eventCategoriesApi.list, t) : null, [token]);
  const events = useAsync(
    token
      ? () => {
          const qs = new URLSearchParams({ ordering: "start_datetime" });
          if (category) qs.set("category", category);
          if (debouncedSearch) qs.set("search", debouncedSearch);
          // Capture "now" alongside the data so rendering stays pure.
          return listAll(eventsApi.list, t, qs.toString()).then((items) => ({ items, now: Date.now() }));
        }
      : null,
    [token, category, debouncedSearch]
  );
  const now = events.data?.now ?? 0;

  const filtered = useMemo(() => {
    const all = events.data?.items ?? [];
    if (when === "upcoming") return all.filter((e) => new Date(e.end_datetime).getTime() >= now);
    if (when === "past") return all.filter((e) => new Date(e.end_datetime).getTime() < now).reverse();
    return all;
  }, [events.data, when, now]);

  const byMonth = useMemo(() => {
    const groups: Array<{ key: string; label: string; items: Event[] }> = [];
    for (const e of filtered) {
      const d = new Date(e.start_datetime);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      let g = groups.find((x) => x.key === key);
      if (!g) {
        g = { key, label: d.toLocaleDateString("en-US", { month: "long", year: "numeric" }), items: [] };
        groups.push(g);
      }
      g.items.push(e);
    }
    return groups;
  }, [filtered]);

  // ── Create / edit ──────────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Event | null>(null);
  const [form, setForm] = useState<EventForm>(defaultForm);
  const [errors, setErrors] = useState<Partial<Record<keyof EventForm, string>>>({});
  const [apiError, setApiError] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);
  const setF = <K extends keyof EventForm>(k: K, v: EventForm[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const openCreate = () => {
    setEditing(null);
    setForm(defaultForm());
    setErrors({});
    setApiError(null);
    setFormOpen(true);
  };

  const openEdit = (e: Event) => {
    setEditing(e);
    setForm({
      title: e.title,
      category: e.category ?? "",
      newCategory: "",
      is_all_day: e.is_all_day,
      start: e.is_all_day ? toLocalInput(e.start_datetime).slice(0, 10) : toLocalInput(e.start_datetime),
      end: e.is_all_day ? toLocalInput(e.end_datetime).slice(0, 10) : toLocalInput(e.end_datetime),
      location: e.location ?? "",
      description: e.description ?? "",
      requires_rsvp: e.requires_rsvp,
      max_attendees: e.max_attendees ? String(e.max_attendees) : "",
      is_public: e.is_public ?? true,
    });
    setErrors({});
    setApiError(null);
    setFormOpen(true);
  };

  const toggleAllDay = (v: boolean) => {
    setForm((f) => ({
      ...f,
      is_all_day: v,
      start: v ? f.start.slice(0, 10) : `${f.start.slice(0, 10)}T09:00`,
      end: v ? f.end.slice(0, 10) : `${f.end.slice(0, 10)}T11:00`,
    }));
  };

  const handleSave = async (ev: SyntheticEvent) => {
    ev.preventDefault();
    if (!token || saving) return;
    const errs: typeof errors = {};
    if (!form.title.trim()) errs.title = "Event title is required.";
    if (!form.start) errs.start = "Choose a start.";
    if (!form.end) errs.end = "Choose an end.";
    if (form.category === NEW_CATEGORY && !form.newCategory.trim()) errs.newCategory = "Name the new category.";
    const startIso = form.is_all_day ? fromLocalInput(`${form.start}T00:00`) : form.start ? fromLocalInput(form.start) : "";
    const endIso = form.is_all_day ? fromLocalInput(`${form.end}T23:59`) : form.end ? fromLocalInput(form.end) : "";
    if (startIso && endIso && new Date(endIso) < new Date(startIso)) errs.end = "The end must be after the start.";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSaving(true);
    setApiError(null);
    try {
      let categoryId: string | null = form.category || null;
      if (form.category === NEW_CATEGORY) {
        const created = await eventCategoriesApi.create(t, { name: form.newCategory.trim() });
        categoryId = created.id;
        categories.reload();
      }
      const payload = {
        title: form.title.trim(),
        category: categoryId,
        is_all_day: form.is_all_day,
        start_datetime: startIso,
        end_datetime: endIso,
        location: form.location.trim(),
        description: form.description.trim(),
        requires_rsvp: form.requires_rsvp,
        max_attendees: form.max_attendees ? Number(form.max_attendees) : null,
        is_public: form.is_public,
      };
      if (editing) {
        await eventsApi.update(t, editing.id, payload);
        toast.success("Event updated", `${payload.title} was saved.`);
      } else {
        await eventsApi.create(t, payload);
        toast.success("Event scheduled", `${payload.title} is on the calendar.`);
      }
      setFormOpen(false);
      events.reload();
    } catch (err) {
      setApiError(err);
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────
  const [toDelete, setToDelete] = useState<Event | null>(null);
  const [deleting, setDeleting] = useState(false);
  const confirmDelete = async () => {
    if (!token || !toDelete || deleting) return;
    setDeleting(true);
    try {
      await eventsApi.remove(t, toDelete.id);
      toast.success("Event deleted", `${toDelete.title} was removed from the calendar.`);
      setToDelete(null);
      if (viewing?.id === toDelete.id) setViewing(null);
      events.reload();
    } catch (err) {
      toast.error("Couldn't delete event", errorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  // ── Details drawer ─────────────────────────────────────────────────────
  const [viewing, setViewing] = useState<Event | null>(null);

  const filtersActive = Boolean(category || debouncedSearch);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Events"
        description="Services, meetings and church gatherings on the calendar."
        actions={
          <Button variant="primary" icon="add" onClick={openCreate}>
            New event
          </Button>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Segmented<When>
          label="Time range"
          value={when}
          onChange={setWhen}
          options={[
            { value: "upcoming", label: "Upcoming" },
            { value: "past", label: "Past" },
            { value: "all", label: "All" },
          ]}
        />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_220px] lg:min-w-[480px]">
          <SearchInput value={search} onChange={setSearch} placeholder="Search title or location" label="Search events" />
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

      {events.loading && !events.data ? (
        <Card className="divide-y divide-line">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <Skeleton className="h-14 w-14 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3.5 w-1/2" />
              </div>
            </div>
          ))}
        </Card>
      ) : events.error ? (
        <Card>
          <ErrorState message={events.error} onRetry={events.reload} />
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          {filtersActive ? (
            <EmptyState
              icon="search_off"
              title="No events match"
              description="Try another search or category."
              action={
                <Button
                  onClick={() => {
                    setSearch("");
                    setCategory("");
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon="event_available"
              title={when === "past" ? "No past events" : when === "upcoming" ? "Nothing scheduled" : "No events yet"}
              description={when === "past" ? "Events appear here after they finish." : "Schedule a service, meeting or gathering."}
              action={
                when !== "past" ? (
                  <Button variant="primary" icon="add" onClick={openCreate}>
                    New event
                  </Button>
                ) : undefined
              }
            />
          )}
        </Card>
      ) : (
        <div className={`flex flex-col gap-6 ${events.loading ? "opacity-60" : ""}`}>
          {byMonth.map((g) => (
            <section key={g.key} aria-labelledby={`m-${g.key}`}>
              <h2 id={`m-${g.key}`} className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-ink-muted">
                {g.label}
              </h2>
              <Card as="ul" className="divide-y divide-line overflow-hidden">
                {g.items.map((e) => {
                  const d = new Date(e.start_datetime);
                  const past = new Date(e.end_datetime).getTime() < now;
                  return (
                    <li key={e.id} className="flex flex-col gap-3 p-4 transition-colors hover:bg-brand-softer sm:flex-row sm:items-center">
                      <div className="flex min-w-0 flex-1 items-start gap-4">
                        <span
                          className={`flex h-14 w-14 flex-shrink-0 flex-col items-center justify-center rounded-lg border leading-none ${
                            past ? "border-line bg-surface-muted text-ink-muted" : "border-[#cddcec] bg-brand-soft text-brand"
                          }`}
                        >
                          <span className="text-[11px] font-semibold uppercase">{d.toLocaleDateString("en-US", { weekday: "short" })}</span>
                          <span className="mt-1 text-xl font-semibold">{d.getDate()}</span>
                        </span>
                        <div className="min-w-0">
                          <button type="button" onClick={() => setViewing(e)} className="text-left text-[15px] font-semibold text-ink hover:text-brand hover:underline">
                            {e.title}
                          </button>
                          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px] text-ink-muted">
                            <span className="inline-flex items-center gap-1">
                              <Icon name="schedule" size={15} />
                              {eventRange(e)}
                            </span>
                            {e.location && (
                              <span className="inline-flex items-center gap-1">
                                <Icon name="location_on" size={15} />
                                {e.location}
                              </span>
                            )}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {e.category_name && <Badge tone="brand">{e.category_name}</Badge>}
                            {e.requires_rsvp && (
                              <Badge tone="accent" icon="how_to_reg">
                                {e.rsvp_count} attending{e.max_attendees ? ` / ${e.max_attendees}` : ""}
                              </Badge>
                            )}
                            {e.is_public === false && <Badge tone="neutral" icon="lock">Private</Badge>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 self-end sm:self-center">
                        <Button size="sm" variant="ghost" onClick={() => setViewing(e)}>
                          Details
                        </Button>
                        <Button size="sm" variant="ghost" iconOnly icon="edit" aria-label={`Edit ${e.title}`} title="Edit" onClick={() => openEdit(e)} />
                        <Button size="sm" variant="danger-ghost" iconOnly icon="delete" aria-label={`Delete ${e.title}`} title="Delete" onClick={() => setToDelete(e)} />
                      </div>
                    </li>
                  );
                })}
              </Card>
            </section>
          ))}
        </div>
      )}

      {/* Create / edit */}
      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Edit event" : "New event"}
        subtitle={editing ? `Update ${editing.title}.` : "Add a service, meeting or gathering to the calendar."}
        maxWidth="xl"
        isSubmitting={saving}
        footer={
          <>
            <Button onClick={() => setFormOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" form="event-form" variant="primary" loading={saving}>
              {editing ? "Save changes" : "Schedule event"}
            </Button>
          </>
        }
      >
        <form id="event-form" onSubmit={handleSave} noValidate className="flex flex-col gap-5">
          {apiError ? <Alert title="Couldn't save event">{errorMessage(apiError)}</Alert> : null}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Title" required error={errors.title || fieldError(apiError, "title")} className="sm:col-span-2">
              {(p) => <Input {...p} value={form.title} disabled={saving} placeholder="e.g. Youth Harvest Night" onChange={(e) => setF("title", e.target.value)} />}
            </Field>
            <Field label="Category">
              {(p) => (
                <Select {...p} value={form.category} disabled={saving} onChange={(e) => setF("category", e.target.value)}>
                  <option value="">Uncategorized</option>
                  {(categories.data ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                  <option value={NEW_CATEGORY}>+ New category…</option>
                </Select>
              )}
            </Field>
            {form.category === NEW_CATEGORY ? (
              <Field label="New category name" required error={errors.newCategory}>
                {(p) => <Input {...p} value={form.newCategory} disabled={saving} onChange={(e) => setF("newCategory", e.target.value)} />}
              </Field>
            ) : (
              <Field label="Location">
                {(p) => <Input {...p} value={form.location} disabled={saving} placeholder="e.g. Main Sanctuary" onChange={(e) => setF("location", e.target.value)} />}
              </Field>
            )}
            {form.category === NEW_CATEGORY && (
              <Field label="Location" className="sm:col-span-2">
                {(p) => <Input {...p} value={form.location} disabled={saving} onChange={(e) => setF("location", e.target.value)} />}
              </Field>
            )}
          </div>

          <div className="rounded-lg border border-line p-4">
            <Switch checked={form.is_all_day} onChange={toggleAllDay} disabled={saving} label="All-day event" />
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Starts" required error={errors.start || fieldError(apiError, "start_datetime")}>
                {(p) => (
                  <Input
                    {...p}
                    type={form.is_all_day ? "date" : "datetime-local"}
                    value={form.start}
                    min={editing ? undefined : form.is_all_day ? todayISO() : undefined}
                    disabled={saving}
                    onChange={(e) => setF("start", e.target.value)}
                  />
                )}
              </Field>
              <Field label="Ends" required error={errors.end || fieldError(apiError, "end_datetime")}>
                {(p) => (
                  <Input {...p} type={form.is_all_day ? "date" : "datetime-local"} value={form.end} min={form.start} disabled={saving} onChange={(e) => setF("end", e.target.value)} />
                )}
              </Field>
            </div>
          </div>

          <Field label="Description">
            {(p) => <Textarea {...p} rows={3} value={form.description} disabled={saving} placeholder="Agenda, speakers, what to bring…" onChange={(e) => setF("description", e.target.value)} />}
          </Field>

          <div className="flex flex-col gap-4 rounded-lg border border-line bg-surface-muted p-4">
            <Switch checked={form.requires_rsvp} onChange={(v) => setF("requires_rsvp", v)} disabled={saving} label="Requires RSVP" description="Track who plans to attend." />
            {form.requires_rsvp && (
              <Field label="Maximum attendees" hint="Leave blank for no limit" error={fieldError(apiError, "max_attendees")}>
                {(p) => <Input {...p} type="number" min={1} inputMode="numeric" value={form.max_attendees} disabled={saving} onChange={(e) => setF("max_attendees", e.target.value)} />}
              </Field>
            )}
            <Switch checked={form.is_public} onChange={(v) => setF("is_public", v)} disabled={saving} label="Public event" description="Private events are for staff and invited groups." />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete event?"
        message={
          <>
            <strong className="font-semibold text-ink">{toDelete?.title}</strong>
            {toDelete ? ` on ${formatDate(toDelete.start_datetime)}` : ""} will be removed from the calendar along with its RSVPs.
          </>
        }
        confirmText="Delete event"
        isLoading={deleting}
      />

      <EventDrawer
        key={viewing?.id ?? "closed"}
        event={viewing}
        token={t}
        onClose={() => setViewing(null)}
        onEdit={(e) => {
          setViewing(null);
          openEdit(e);
        }}
      />
    </div>
  );
}

function EventDrawer({ event, token, onClose, onEdit }: { event: Event | null; token: string; onClose: () => void; onEdit: (e: Event) => void }) {
  const [rsvps, setRsvps] = useState<RSVP[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!event?.requires_rsvp) return;
    eventsApi.rsvps(token, event.id).then(setRsvps).catch((e) => setError(errorMessage(e)));
  }, [event, token]);

  return (
    <Modal
      isOpen={Boolean(event)}
      onClose={onClose}
      title={event?.title ?? "Event"}
      subtitle={event ? formatDate(event.start_datetime, { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : undefined}
      variant="drawer"
      maxWidth="sm:max-w-md"
      footer={
        event ? (
          <>
            <Button onClick={onClose}>Close</Button>
            <Button variant="primary" icon="edit" onClick={() => onEdit(event)}>
              Edit event
            </Button>
          </>
        ) : undefined
      }
    >
      {event && (
        <div className="flex flex-col gap-5">
          <dl className="flex flex-col gap-3 text-sm">
            <div className="flex gap-3">
              <Icon name="schedule" className="text-ink-muted" />
              <div>
                <dt className="sr-only">When</dt>
                <dd className="text-ink">{eventRange(event)}</dd>
                {!event.is_all_day && <dd className="text-[13px] text-ink-muted">Ends {formatDateTime(event.end_datetime)}</dd>}
              </div>
            </div>
            {event.location && (
              <div className="flex gap-3">
                <Icon name="location_on" className="text-ink-muted" />
                <div>
                  <dt className="sr-only">Location</dt>
                  <dd className="text-ink">{event.location}</dd>
                </div>
              </div>
            )}
            {event.category_name && (
              <div className="flex gap-3">
                <Icon name="sell" className="text-ink-muted" />
                <div>
                  <dt className="sr-only">Category</dt>
                  <dd className="text-ink">{event.category_name}</dd>
                </div>
              </div>
            )}
          </dl>

          <div>
            <h3 className="text-sm font-semibold text-ink">About</h3>
            <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-ink-muted">{event.description || "No description provided."}</p>
          </div>

          {event.requires_rsvp && (
            <div>
              <h3 className="text-sm font-semibold text-ink">
                RSVPs {rsvps ? `(${rsvps.length})` : ""}
                {event.max_attendees ? <span className="font-normal text-ink-muted"> · limit {event.max_attendees}</span> : null}
              </h3>
              {error ? (
                <p className="mt-2 text-[13px] text-danger">{error}</p>
              ) : !rsvps ? (
                <div className="mt-2 space-y-2">
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ) : rsvps.length === 0 ? (
                <p className="mt-2 rounded-lg border border-dashed border-line px-3 py-4 text-center text-[13px] text-ink-muted">No RSVPs yet.</p>
              ) : (
                <ul className="mt-2 divide-y divide-line rounded-lg border border-line">
                  {rsvps.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-3 px-3 py-2 text-[13px]">
                      <span className="truncate text-ink">
                        {r.member_name || r.guest_name || "Guest"}
                        {r.guest_count > 1 ? <span className="text-ink-muted"> +{r.guest_count - 1}</span> : null}
                      </span>
                      <Badge tone={r.status === "attending" ? "success" : r.status === "maybe" ? "warning" : "neutral"}>{humanize(r.status)}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
