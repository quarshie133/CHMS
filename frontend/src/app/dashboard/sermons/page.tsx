"use client";

import { useState, type SyntheticEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { errorMessage, fieldError, listAll, seriesApi, sermonsApi, type Sermon } from "@/lib/api";
import { useAsync, useDebounced } from "@/lib/hooks";
import { formatDate, formatNumber, todayISO } from "@/lib/format";
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

const NEW_SERIES = "__new__";
type Published = "all" | "published" | "draft";

interface SermonForm {
  title: string;
  speaker: string;
  date: string;
  scripture_reference: string;
  series: string;
  newSeries: string;
  description: string;
  video_url: string;
  audio_url: string;
  tags: string;
  is_published: boolean;
}

const emptyForm = (): SermonForm => ({
  title: "",
  speaker: "",
  date: todayISO(),
  scripture_reference: "",
  series: "",
  newSeries: "",
  description: "",
  video_url: "",
  audio_url: "",
  tags: "",
  is_published: true,
});

function validUrl(v: string) {
  if (!v) return true;
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export default function SermonsPage() {
  const { token } = useAuth();
  const toast = useToast();
  const t = token ?? "";

  const [search, setSearch] = useState("");
  const [series, setSeries] = useState("");
  const [published, setPublished] = useState<Published>("all");
  const debouncedSearch = useDebounced(search.trim());

  const seriesList = useAsync(token ? () => listAll(seriesApi.list, t) : null, [token]);
  const sermons = useAsync(
    token
      ? () => {
          const qs = new URLSearchParams({ ordering: "-date" });
          if (debouncedSearch) qs.set("search", debouncedSearch);
          if (series) qs.set("series", series);
          if (published !== "all") qs.set("is_published", published === "published" ? "true" : "false");
          return listAll(sermonsApi.list, t, qs.toString());
        }
      : null,
    [token, debouncedSearch, series, published]
  );

  // ── Form ───────────────────────────────────────────────────────────────
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Sermon | null>(null);
  const [form, setForm] = useState<SermonForm>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof SermonForm, string>>>({});
  const [apiError, setApiError] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);
  const setF = <K extends keyof SermonForm>(k: K, v: SermonForm[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const openForm = (s: Sermon | null) => {
    setEditing(s);
    setForm(
      s
        ? {
            title: s.title,
            speaker: s.speaker,
            date: s.date,
            scripture_reference: s.scripture_reference ?? "",
            series: s.series ?? "",
            newSeries: "",
            description: s.description ?? "",
            video_url: s.video_url ?? "",
            audio_url: s.audio_url ?? "",
            tags: (s.tags ?? []).join(", "),
            is_published: s.is_published,
          }
        : emptyForm()
    );
    setErrors({});
    setApiError(null);
    setOpen(true);
  };

  const save = async (e: SyntheticEvent) => {
    e.preventDefault();
    if (!token || saving) return;
    const errs: typeof errors = {};
    if (!form.title.trim()) errs.title = "Sermon title is required.";
    if (!form.speaker.trim()) errs.speaker = "Speaker is required.";
    if (!form.date) errs.date = "Choose the date preached.";
    if (form.series === NEW_SERIES && !form.newSeries.trim()) errs.newSeries = "Name the new series.";
    if (!validUrl(form.video_url.trim())) errs.video_url = "Enter a full link starting with https://";
    if (!validUrl(form.audio_url.trim())) errs.audio_url = "Enter a full link starting with https://";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    setApiError(null);
    try {
      let seriesId: string | null = form.series || null;
      if (form.series === NEW_SERIES) {
        const created = await seriesApi.create(t, { title: form.newSeries.trim(), is_active: true });
        seriesId = created.id;
        seriesList.reload();
      }
      const payload = {
        title: form.title.trim(),
        speaker: form.speaker.trim(),
        date: form.date,
        scripture_reference: form.scripture_reference.trim(),
        series: seriesId,
        description: form.description.trim(),
        video_url: form.video_url.trim(),
        audio_url: form.audio_url.trim(),
        tags: form.tags.split(",").map((x) => x.trim()).filter(Boolean),
        is_published: form.is_published,
      };
      if (editing) {
        await sermonsApi.update(t, editing.id, payload);
        toast.success("Sermon updated", payload.title);
      } else {
        await sermonsApi.create(t, payload);
        toast.success("Sermon added", payload.is_published ? `${payload.title} is published.` : `${payload.title} was saved as a draft.`);
      }
      setOpen(false);
      sermons.reload();
    } catch (err) {
      setApiError(err);
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────
  const [toDelete, setToDelete] = useState<Sermon | null>(null);
  const [deleting, setDeleting] = useState(false);
  const confirmDelete = async () => {
    if (!token || !toDelete || deleting) return;
    setDeleting(true);
    try {
      await sermonsApi.remove(t, toDelete.id);
      toast.success("Sermon deleted", toDelete.title);
      setToDelete(null);
      sermons.reload();
    } catch (err) {
      toast.error("Couldn't delete sermon", errorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const list = sermons.data ?? [];
  const filtersActive = Boolean(debouncedSearch || series || published !== "all");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Sermons"
        description="The sermon archive: messages, speakers, scripture and media links."
        actions={
          <Button variant="primary" icon="add" onClick={() => openForm(null)}>
            Add sermon
          </Button>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Segmented<Published>
          label="Filter by publish state"
          value={published}
          onChange={setPublished}
          options={[
            { value: "all", label: "All" },
            { value: "published", label: "Published" },
            { value: "draft", label: "Drafts" },
          ]}
        />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_220px] lg:min-w-[480px]">
          <SearchInput value={search} onChange={setSearch} placeholder="Search title, speaker or scripture" label="Search sermons" />
          <Select aria-label="Filter by series" value={series} onChange={(e) => setSeries(e.target.value)}>
            <option value="">All series</option>
            {(seriesList.data ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {sermons.loading && !sermons.data ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="space-y-3 p-5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-3.5 w-1/2" />
            </Card>
          ))}
        </div>
      ) : sermons.error ? (
        <Card>
          <ErrorState message={sermons.error} onRetry={sermons.reload} />
        </Card>
      ) : list.length === 0 ? (
        <Card>
          {filtersActive ? (
            <EmptyState
              icon="search_off"
              title="No sermons match"
              description="Try another search or clear the filters."
              action={
                <Button
                  onClick={() => {
                    setSearch("");
                    setSeries("");
                    setPublished("all");
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon="auto_stories"
              title="The sermon archive is empty"
              description="Add sermons with their speaker, scripture and video or audio links."
              action={
                <Button variant="primary" icon="add" onClick={() => openForm(null)}>
                  Add sermon
                </Button>
              }
            />
          )}
        </Card>
      ) : (
        <ul className={`grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 ${sermons.loading ? "opacity-60" : ""}`}>
          {list.map((s) => (
            <li key={s.id}>
              <Card className="card-interactive flex h-full flex-col p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    {s.series_title && <Badge tone="brand">{s.series_title}</Badge>}
                    {!s.is_published && <Badge tone="warning">Draft</Badge>}
                  </div>
                  <div className="-mr-2 -mt-1 flex">
                    <Button variant="ghost" size="xs" iconOnly icon="edit" aria-label={`Edit ${s.title}`} title="Edit" onClick={() => openForm(s)} />
                    <Button variant="danger-ghost" size="xs" iconOnly icon="delete" aria-label={`Delete ${s.title}`} title="Delete" onClick={() => setToDelete(s)} />
                  </div>
                </div>
                <h3 className="mt-3 text-[15px] font-semibold leading-snug text-ink">{s.title}</h3>
                <p className="mt-1 text-[13px] text-ink-muted">
                  {s.speaker} · {formatDate(s.date)}
                </p>
                {s.scripture_reference && (
                  <p className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-medium text-accent-ink">
                    <Icon name="menu_book" size={16} />
                    {s.scripture_reference}
                  </p>
                )}
                {s.tags?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {s.tags.slice(0, 4).map((tag) => (
                      <span key={tag} className="rounded bg-canvas px-1.5 py-0.5 text-[11px] text-ink-muted">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex-1" />
                <div className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-3">
                  <span className="text-[12px] text-ink-subtle">{formatNumber(s.views_count)} views</span>
                  <div className="flex gap-1">
                    {s.video_url && (
                      <a href={s.video_url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-xs" aria-label={`Watch ${s.title} (opens in a new tab)`}>
                        <Icon name="play_circle" size={16} />
                        Watch
                      </a>
                    )}
                    {s.audio_url && (
                      <a href={s.audio_url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-xs" aria-label={`Listen to ${s.title} (opens in a new tab)`}>
                        <Icon name="headphones" size={16} />
                        Listen
                      </a>
                    )}
                    {!s.video_url && !s.audio_url && <span className="text-[12px] text-ink-subtle">No media links</span>}
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit sermon" : "Add sermon"}
        subtitle="Media is linked by URL (for example YouTube or a podcast host)."
        maxWidth="xl"
        isSubmitting={saving}
        footer={
          <>
            <Button onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" form="sermon-form" variant="primary" loading={saving}>
              {editing ? "Save changes" : "Add sermon"}
            </Button>
          </>
        }
      >
        <form id="sermon-form" onSubmit={save} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {apiError ? (
            <Alert className="sm:col-span-2" title="Couldn't save sermon">
              {errorMessage(apiError)}
            </Alert>
          ) : null}
          <Field label="Title" required error={errors.title || fieldError(apiError, "title")} className="sm:col-span-2">
            {(p) => <Input {...p} value={form.title} disabled={saving} onChange={(e) => setF("title", e.target.value)} />}
          </Field>
          <Field label="Speaker" required error={errors.speaker || fieldError(apiError, "speaker")}>
            {(p) => <Input {...p} value={form.speaker} disabled={saving} onChange={(e) => setF("speaker", e.target.value)} />}
          </Field>
          <Field label="Date preached" required error={errors.date || fieldError(apiError, "date")}>
            {(p) => <Input {...p} type="date" value={form.date} disabled={saving} onChange={(e) => setF("date", e.target.value)} />}
          </Field>
          <Field label="Scripture reference">
            {(p) => <Input {...p} value={form.scripture_reference} disabled={saving} placeholder="e.g. Romans 8:28–39" onChange={(e) => setF("scripture_reference", e.target.value)} />}
          </Field>
          <Field label="Series">
            {(p) => (
              <Select {...p} value={form.series} disabled={saving} onChange={(e) => setF("series", e.target.value)}>
                <option value="">No series</option>
                {(seriesList.data ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
                <option value={NEW_SERIES}>+ New series…</option>
              </Select>
            )}
          </Field>
          {form.series === NEW_SERIES && (
            <Field label="New series title" required error={errors.newSeries} className="sm:col-span-2">
              {(p) => <Input {...p} value={form.newSeries} disabled={saving} onChange={(e) => setF("newSeries", e.target.value)} />}
            </Field>
          )}
          <Field label="Video link" error={errors.video_url || fieldError(apiError, "video_url")}>
            {(p) => <Input {...p} type="url" inputMode="url" placeholder="https://" value={form.video_url} disabled={saving} onChange={(e) => setF("video_url", e.target.value)} />}
          </Field>
          <Field label="Audio link" error={errors.audio_url || fieldError(apiError, "audio_url")}>
            {(p) => <Input {...p} type="url" inputMode="url" placeholder="https://" value={form.audio_url} disabled={saving} onChange={(e) => setF("audio_url", e.target.value)} />}
          </Field>
          <Field label="Summary" className="sm:col-span-2">
            {(p) => <Textarea {...p} rows={3} value={form.description} disabled={saving} onChange={(e) => setF("description", e.target.value)} />}
          </Field>
          <Field label="Tags" hint="Separate with commas, e.g. faith, prayer" className="sm:col-span-2">
            {(p) => <Input {...p} value={form.tags} disabled={saving} onChange={(e) => setF("tags", e.target.value)} />}
          </Field>
          <div className="rounded-lg border border-line bg-surface-muted p-4 sm:col-span-2">
            <Switch checked={form.is_published} onChange={(v) => setF("is_published", v)} disabled={saving} label="Published" description="Drafts are only visible to staff." />
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete sermon?"
        message={
          <>
            <strong className="font-semibold text-ink">{toDelete?.title}</strong> will be permanently removed from the archive.
          </>
        }
        confirmText="Delete sermon"
        isLoading={deleting}
      />
    </div>
  );
}
