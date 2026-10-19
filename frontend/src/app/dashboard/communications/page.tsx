"use client";

import { useEffect, useMemo, useState, type SyntheticEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  communicationsApi,
  errorMessage,
  fieldError,
  groupsApi,
  listAll,
  membersApi,
  type Campaign,
  type Group,
  type Member,
} from "@/lib/api";
import { useAsync } from "@/lib/hooks";
import { formatDateTime, formatNumber, labelFor, LIFE_STAGES, relativeTime } from "@/lib/format";
import { Modal, ConfirmDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { CampaignStatusBadge } from "@/components/domain";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  Icon,
  PageHeader,
  Segmented,
  Skeleton,
  TableSkeleton,
} from "@/components/ui/primitives";

/* ── SMS length / segment calculation ────────────────────────────────── */
const GSM7 =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM7_EXT = "^{}\\[~]|€";

function smsInfo(text: string) {
  let gsm = true;
  let units = 0;
  for (const ch of text) {
    if (GSM7.includes(ch)) units += 1;
    else if (GSM7_EXT.includes(ch)) units += 2;
    else {
      gsm = false;
      break;
    }
  }
  if (!gsm) {
    const len = Array.from(text).length;
    return { encoding: "Unicode", length: len, segments: len === 0 ? 0 : len <= 70 ? 1 : Math.ceil(len / 67), perSegment: len <= 70 ? 70 : 67 };
  }
  return { encoding: "Standard (GSM-7)", length: units, segments: units === 0 ? 0 : units <= 160 ? 1 : Math.ceil(units / 153), perSegment: units <= 160 ? 160 : 153 };
}

/* ── Audiences → backend recipients_filter (Member.objects.filter(**f)) ── */
type AudienceKind = "active" | "everyone" | "visitors" | "group" | "life_stage";

const AUDIENCES: Array<{ value: AudienceKind; label: string; description: string; icon: string }> = [
  { value: "active", label: "Active members", description: "Everyone with Active member status", icon: "verified" },
  { value: "everyone", label: "Whole directory", description: "Active members, visitors and inactive people", icon: "groups" },
  { value: "visitors", label: "Visitors", description: "People marked as visitors", icon: "waving_hand" },
  { value: "group", label: "A group or ministry", description: "Active members of one group", icon: "diversity_3" },
  { value: "life_stage", label: "A life stage", description: "Active members in one life stage", icon: "family_restroom" },
];

function buildFilter(kind: AudienceKind, groupId: string, lifeStage: string): Record<string, unknown> {
  switch (kind) {
    case "active":
      return { status: "active" };
    case "everyone":
      return { status__in: ["active", "visitor", "inactive"] };
    case "visitors":
      return { status: "visitor" };
    case "group":
      return { group_memberships__group_id: groupId, group_memberships__is_active: true };
    case "life_stage":
      return { status: "active", life_stage: lifeStage };
  }
}

function describeFilter(f: Record<string, unknown> | undefined, groups: Group[]): string {
  if (!f || Object.keys(f).length === 0) return "Entire directory";
  if (f.group_memberships__group_id) return `Group: ${groups.find((g) => g.id === f.group_memberships__group_id)?.name ?? "Unknown group"}`;
  if (f.life_stage) return `Life stage: ${labelFor(LIFE_STAGES, String(f.life_stage))}`;
  if (f.status__in) return "Whole directory";
  if (f.status === "visitor") return "Visitors";
  if (f.status === "active") return "Active members";
  return "Custom audience";
}

const LARGE_SEND = 50;

type View = "compose" | "history";

export default function CommunicationsPage() {
  const { token } = useAuth();
  const toast = useToast();
  const t = token ?? "";

  const [view, setView] = useState<View>("compose");

  // Composer state
  const [draftId, setDraftId] = useState<string | null>(null);
  const [channel, setChannel] = useState<"sms" | "email">("sms");
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<AudienceKind>("active");
  const [chosenGroupId, setGroupId] = useState("");
  const [lifeStage, setLifeStage] = useState("adult");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<unknown>(null);
  const [savingDraft, setSavingDraft] = useState(false);

  // Reference data
  const members = useAsync(token ? () => listAll(membersApi.list, t) : null, [token]);
  const groups = useAsync(token ? () => listAll(groupsApi.list, t, "is_active=true") : null, [token]);
  // Default to the first group until one is chosen.
  const groupId = chosenGroupId || groups.data?.[0]?.id || "";
  const groupRoster = useAsync(
    token && audience === "group" && groupId ? () => groupsApi.members(t, groupId) : null,
    [token, audience, groupId]
  );
  const history = useAsync(token ? () => communicationsApi.list(t, "page_size=50") : null, [token]);

  // Poll while any broadcast is queued or sending, so statuses update on their own.
  const processing = (history.data?.results ?? []).some((c) => c.status === "scheduled" || c.status === "sending");
  const reloadHistory = history.reload;
  useEffect(() => {
    if (!processing) return;
    const id = window.setInterval(reloadHistory, 8000);
    return () => window.clearInterval(id);
  }, [processing, reloadHistory]);

  /** Who matches the audience, and who can actually be reached on this channel. */
  const recipients = useMemo(() => {
    const all: Member[] = members.data ?? [];
    let matched: Member[] = [];
    if (audience === "active") matched = all.filter((m) => m.status === "active");
    else if (audience === "everyone") matched = all.filter((m) => ["active", "visitor", "inactive"].includes(m.status));
    else if (audience === "visitors") matched = all.filter((m) => m.status === "visitor");
    else if (audience === "life_stage") matched = all.filter((m) => m.status === "active" && m.life_stage === lifeStage);
    else if (audience === "group") {
      const ids = new Set((groupRoster.data ?? []).map((r) => r.member));
      matched = all.filter((m) => ids.has(m.id));
    }
    const reachable = matched.filter((m) => (channel === "sms" ? Boolean(m.phone_mobile?.trim()) : Boolean(m.email?.trim())));
    return { matched: matched.length, reachable: reachable.length };
  }, [members.data, audience, lifeStage, groupRoster.data, channel]);

  const recipientsLoading = members.loading || (audience === "group" && groupRoster.loading);
  const sms = smsInfo(body);
  const audienceLabel =
    audience === "group"
      ? `Group: ${groups.data?.find((g) => g.id === groupId)?.name ?? "—"}`
      : audience === "life_stage"
        ? `Life stage: ${labelFor(LIFE_STAGES, lifeStage)}`
        : AUDIENCES.find((a) => a.value === audience)!.label;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Give this broadcast a name so you can find it later.";
    if (channel === "email" && !subject.trim()) e.subject = "Email broadcasts need a subject line.";
    if (!body.trim()) e.body = "Write the message you want to send.";
    if (audience === "group" && !groupId) e.audience = "Choose a group.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const payload = () => ({
    name: name.trim(),
    channel,
    subject: channel === "email" ? subject.trim() : "",
    body: body.trim(),
    recipients_filter: buildFilter(audience, groupId, lifeStage),
  });

  /** Create or update the draft campaign; returns its id. */
  const persistDraft = async (): Promise<string> => {
    if (draftId) {
      const updated = await communicationsApi.update(t, draftId, payload());
      return updated.id;
    }
    const created = await communicationsApi.create(t, payload());
    setDraftId(created.id);
    return created.id;
  };

  const resetComposer = () => {
    setDraftId(null);
    setName("");
    setSubject("");
    setBody("");
    setErrors({});
    setApiError(null);
  };

  const saveDraft = async () => {
    if (!token || savingDraft || !validate()) return;
    setSavingDraft(true);
    setApiError(null);
    try {
      await persistDraft();
      toast.success("Draft saved", "Find it any time under History.");
      history.reload();
    } catch (err) {
      setApiError(err);
    } finally {
      setSavingDraft(false);
    }
  };

  // ── Send confirmation ──────────────────────────────────────────────────
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [ack, setAck] = useState(false);
  const [sending, setSending] = useState(false);

  const openConfirm = (e?: SyntheticEvent) => {
    e?.preventDefault();
    if (!validate()) return;
    setAck(false);
    setConfirmOpen(true);
  };

  const send = async () => {
    if (!token || sending) return;
    setSending(true);
    try {
      const id = await persistDraft();
      await communicationsApi.send(t, id);
      toast.info("Broadcast queued", "It will be processed in the background. Check History for the delivery report.");
      setConfirmOpen(false);
      resetComposer();
      history.reload();
      setView("history");
    } catch (err) {
      setConfirmOpen(false);
      setApiError(err);
      toast.error("Broadcast not sent", errorMessage(err));
      history.reload();
    } finally {
      setSending(false);
    }
  };

  // ── History actions ────────────────────────────────────────────────────
  const [toDelete, setToDelete] = useState<Campaign | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toResend, setToResend] = useState<Campaign | null>(null);
  const [resending, setResending] = useState(false);
  const [viewing, setViewing] = useState<Campaign | null>(null);

  const openDraft = (c: Campaign) => {
    setDraftId(c.id);
    setChannel(c.channel === "email" ? "email" : "sms");
    setName(c.name);
    setSubject(c.subject ?? "");
    setBody(c.body ?? "");
    const f = c.recipients_filter ?? {};
    if (f.group_memberships__group_id) {
      setAudience("group");
      setGroupId(String(f.group_memberships__group_id));
    } else if (f.life_stage) {
      setAudience("life_stage");
      setLifeStage(String(f.life_stage));
    } else if (f.status === "visitor") setAudience("visitors");
    else if (f.status__in || Object.keys(f).length === 0) setAudience("everyone");
    else setAudience("active");
    setErrors({});
    setApiError(null);
    setView("compose");
  };

  const confirmDeleteCampaign = async () => {
    if (!toDelete || deleting) return;
    setDeleting(true);
    try {
      await communicationsApi.remove(t, toDelete.id);
      if (draftId === toDelete.id) resetComposer();
      toast.success("Broadcast deleted");
      setToDelete(null);
      history.reload();
    } catch (err) {
      toast.error("Couldn't delete broadcast", errorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const confirmResend = async () => {
    if (!toResend || resending) return;
    setResending(true);
    try {
      await communicationsApi.send(t, toResend.id);
      toast.info("Broadcast queued", "Check back shortly for the delivery report.");
      setToResend(null);
      history.reload();
    } catch (err) {
      toast.error("Broadcast not sent", errorMessage(err));
    } finally {
      setResending(false);
    }
  };

  const campaigns = history.data?.results ?? [];
  const large = recipients.reachable >= LARGE_SEND;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Communication"
        description="Send SMS and email broadcasts to members, visitors and groups."
        actions={
          <Segmented<View>
            label="Communication views"
            value={view}
            onChange={setView}
            options={[
              { value: "compose", label: "Compose", icon: "edit_square" },
              { value: "history", label: "History", icon: "history", count: history.data?.count },
            ]}
          />
        }
      />

      {view === "compose" ? (
        <form onSubmit={openConfirm} noValidate className="grid grid-cols-1 gap-6 xl:grid-cols-12 xl:items-start">
          {/* ── Composer ─────────────────────────────────────────────── */}
          <Card className="xl:col-span-7">
            <CardHeader
              title={draftId ? "Edit draft" : "New broadcast"}
              icon="edit_square"
              actions={
                draftId ? (
                  <Button variant="ghost" size="sm" icon="add" onClick={resetComposer}>
                    Start new
                  </Button>
                ) : undefined
              }
            />
            <div className="flex flex-col gap-5 px-5 pb-5">
              {apiError ? <Alert title="Something went wrong">{errorMessage(apiError)}</Alert> : null}

              <div>
                <span className="field-label" id="channel-label">
                  Channel
                </span>
                <div role="radiogroup" aria-labelledby="channel-label" className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { value: "sms", label: "SMS", icon: "sms", hint: "Text message to mobile numbers" },
                      { value: "email", label: "Email", icon: "mail", hint: "Email to saved addresses" },
                    ] as const
                  ).map((c) => {
                    const on = channel === c.value;
                    return (
                      <button
                        key={c.value}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => setChannel(c.value)}
                        className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                          on ? "border-brand bg-brand-softer ring-1 ring-brand" : "border-line hover:border-line-strong"
                        }`}
                      >
                        <Icon name={c.icon} className={on ? "text-brand" : "text-ink-muted"} />
                        <span>
                          <span className="block text-sm font-semibold text-ink">{c.label}</span>
                          <span className="block text-[12px] text-ink-muted">{c.hint}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <Field label="Broadcast name" required hint="Internal name — recipients don't see this." error={errors.name || fieldError(apiError, "name")}>
                {(p) => <Input {...p} value={name} maxLength={300} placeholder="e.g. Midweek service reminder" onChange={(e) => setName(e.target.value)} />}
              </Field>

              {channel === "email" && (
                <Field label="Subject" required error={errors.subject || fieldError(apiError, "subject")}>
                  {(p) => <Input {...p} value={subject} maxLength={300} onChange={(e) => setSubject(e.target.value)} />}
                </Field>
              )}

              <Field
                label="Message"
                required
                error={errors.body || fieldError(apiError, "body")}
                hint={
                  channel === "sms"
                    ? "The message is sent exactly as written to every recipient."
                    : "Plain text. The message is sent exactly as written."
                }
              >
                {(p) => (
                  <Textarea
                    {...p}
                    rows={channel === "sms" ? 6 : 10}
                    value={body}
                    placeholder={channel === "sms" ? "Write your text message…" : "Write your email…"}
                    onChange={(e) => setBody(e.target.value)}
                  />
                )}
              </Field>

              {channel === "sms" && (
                <div className="-mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-ink-muted" aria-live="polite">
                  <span>
                    <span className="font-medium tabular-nums text-ink">{sms.length}</span> characters
                  </span>
                  <span>
                    <span className="font-medium tabular-nums text-ink">{sms.segments}</span> segment{sms.segments === 1 ? "" : "s"} per message (up to {sms.perSegment}{" "}
                    characters each)
                  </span>
                  <span>{sms.encoding}</span>
                  {sms.encoding === "Unicode" && body && (
                    <span className="text-warning">Emoji or special characters reduce the length of each segment.</span>
                  )}
                </div>
              )}
            </div>
          </Card>

          {/* ── Audience, summary & preview ─────────────────────────── */}
          <div className="flex flex-col gap-6 xl:col-span-5">
            <Card>
              <CardHeader title="Audience" icon="group" />
              <div className="flex flex-col gap-4 px-5 pb-5">
                <div role="radiogroup" aria-label="Audience" className="flex flex-col gap-2">
                  {AUDIENCES.map((a) => {
                    const on = audience === a.value;
                    return (
                      <button
                        key={a.value}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => setAudience(a.value)}
                        className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                          on ? "border-brand bg-brand-softer ring-1 ring-brand" : "border-line hover:border-line-strong"
                        }`}
                      >
                        <Icon name={a.icon} size={18} className={on ? "text-brand" : "text-ink-muted"} />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-ink">{a.label}</span>
                          <span className="block text-[12px] text-ink-muted">{a.description}</span>
                        </span>
                        <span
                          aria-hidden
                          className={`h-4 w-4 flex-shrink-0 rounded-full border-2 ${on ? "border-brand bg-brand shadow-[inset_0_0_0_2px_#fff]" : "border-line-strong"}`}
                        />
                      </button>
                    );
                  })}
                </div>

                {audience === "group" && (
                  <Field label="Group" error={errors.audience}>
                    {(p) => (
                      <Select {...p} value={groupId} onChange={(e) => setGroupId(e.target.value)}>
                        {(groups.data ?? []).length === 0 && <option value="">No active groups</option>}
                        {(groups.data ?? []).map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name} ({g.member_count})
                          </option>
                        ))}
                      </Select>
                    )}
                  </Field>
                )}
                {audience === "life_stage" && (
                  <Field label="Life stage">
                    {(p) => (
                      <Select {...p} value={lifeStage} onChange={(e) => setLifeStage(e.target.value)}>
                        {LIFE_STAGES.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </Select>
                    )}
                  </Field>
                )}

                <div className="rounded-lg border border-line bg-surface-muted p-4" aria-live="polite">
                  {recipientsLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-7 w-24" />
                      <Skeleton className="h-3.5 w-48" />
                    </div>
                  ) : members.error ? (
                    <p className="text-[13px] text-danger">Couldn&apos;t calculate recipients: {members.error}</p>
                  ) : (
                    <>
                      <p className="text-[13px] text-ink-muted">Will be sent to</p>
                      <p className="text-2xl font-semibold tabular-nums text-ink">
                        {formatNumber(recipients.reachable)} <span className="text-base font-medium text-ink-muted">recipient{recipients.reachable === 1 ? "" : "s"}</span>
                      </p>
                      <p className="mt-1 text-[13px] text-ink-muted">
                        {formatNumber(recipients.matched)} match this audience
                        {recipients.matched > recipients.reachable &&
                          ` · ${formatNumber(recipients.matched - recipients.reachable)} skipped (no ${channel === "sms" ? "mobile number" : "email address"})`}
                      </p>
                      {channel === "sms" && recipients.reachable > 0 && sms.segments > 0 && (
                        <p className="mt-1 text-[13px] text-ink-muted">
                          Estimated {formatNumber(recipients.reachable * sms.segments)} SMS segment{recipients.reachable * sms.segments === 1 ? "" : "s"} in total
                        </p>
                      )}
                    </>
                  )}
                </div>
                {large && !recipientsLoading && (
                  <Alert tone="warning" title="Large broadcast">
                    This message will go to {formatNumber(recipients.reachable)} people. You&apos;ll be asked to confirm before it&apos;s sent.
                  </Alert>
                )}
              </div>
            </Card>

            <Card>
              <CardHeader title="Preview" icon="visibility" />
              <div className="px-5 pb-5">
                {channel === "sms" ? (
                  <div className="mx-auto max-w-xs rounded-[1.75rem] border border-line bg-surface-muted p-4">
                    <p className="mb-3 text-center text-[11px] font-medium text-ink-subtle">Text message</p>
                    {body.trim() ? (
                      <div className="ml-auto w-fit max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-brand px-3.5 py-2.5 text-[13px] leading-relaxed text-white">
                        {body}
                      </div>
                    ) : (
                      <p className="py-6 text-center text-[13px] text-ink-subtle">Your message will appear here.</p>
                    )}
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-lg border border-line">
                    <div className="border-b border-line bg-surface-muted px-4 py-2.5">
                      <p className="text-[12px] text-ink-muted">Subject</p>
                      <p className="truncate text-sm font-semibold text-ink">{subject || "No subject yet"}</p>
                    </div>
                    <p className="min-h-24 whitespace-pre-wrap break-words px-4 py-3 text-[13px] leading-relaxed text-ink">
                      {body || <span className="text-ink-subtle">Your message will appear here.</span>}
                    </p>
                  </div>
                )}
              </div>
            </Card>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button icon="save" onClick={saveDraft} loading={savingDraft}>
                {draftId ? "Update draft" : "Save draft"}
              </Button>
              <Button type="submit" variant="primary" icon="send" disabled={recipientsLoading || recipients.reachable === 0}>
                Review & send
              </Button>
            </div>
            {!recipientsLoading && recipients.reachable === 0 && (
              <p className="text-right text-[13px] text-ink-muted">
                No one in this audience has {channel === "sms" ? "a mobile number" : "an email address"} on file.
              </p>
            )}
          </div>
        </form>
      ) : (
        <Card className="overflow-hidden">
          <CardHeader
            title="Broadcast history"
            description={processing ? "Updating automatically while broadcasts are processing…" : "Delivery counts are reported by the server after processing."}
            icon="history"
            actions={
              <Button size="sm" icon="refresh" onClick={history.reload} loading={history.loading && Boolean(history.data)}>
                Refresh
              </Button>
            }
          />
          {history.loading && !history.data ? (
            <TableSkeleton rows={4} cols={4} />
          ) : history.error ? (
            <ErrorState message={history.error} onRetry={history.reload} />
          ) : campaigns.length === 0 ? (
            <EmptyState
              icon="campaign"
              title="No broadcasts yet"
              description="Drafts and sent broadcasts will be listed here."
              action={
                <Button variant="primary" icon="edit_square" onClick={() => setView("compose")}>
                  Compose a broadcast
                </Button>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Broadcast</th>
                    <th scope="col">Audience</th>
                    <th scope="col">Status</th>
                    <th scope="col" className="num">
                      Recipients
                    </th>
                    <th scope="col" className="num">
                      Processed
                    </th>
                    <th scope="col" className="num">
                      Failed
                    </th>
                    <th scope="col">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <span className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                            <Icon name={c.channel === "email" ? "mail" : "sms"} size={18} />
                          </span>
                          <div className="min-w-0">
                            <button type="button" onClick={() => setViewing(c)} className="block max-w-[260px] truncate text-left font-medium text-ink hover:text-brand hover:underline">
                              {c.name}
                            </button>
                            <span className="block text-[13px] text-ink-muted" title={formatDateTime(c.sent_at || c.created_at)}>
                              {c.sent_at ? `Processed ${relativeTime(c.sent_at)}` : `Created ${relativeTime(c.created_at)}`}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap text-ink-muted">{describeFilter(c.recipients_filter, groups.data ?? [])}</td>
                      <td>
                        <CampaignStatusBadge status={c.status} />
                      </td>
                      <td className="num">{c.status === "draft" ? "—" : formatNumber(c.recipient_count)}</td>
                      <td className="num">{c.status === "draft" ? "—" : formatNumber(c.sent_count)}</td>
                      <td className={`num ${c.failed_count ? "font-semibold text-danger" : ""}`}>{c.status === "draft" ? "—" : formatNumber(c.failed_count ?? 0)}</td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          {c.status === "draft" && (
                            <Button size="xs" icon="edit" onClick={() => openDraft(c)}>
                              Edit
                            </Button>
                          )}
                          {c.status === "failed" && (
                            <Button size="xs" icon="refresh" onClick={() => setToResend(c)}>
                              Retry
                            </Button>
                          )}
                          {(c.status === "draft" || c.status === "failed") && (
                            <Button variant="danger-ghost" size="xs" iconOnly icon="delete" aria-label={`Delete ${c.name}`} title="Delete" onClick={() => setToDelete(c)} />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ── Send confirmation ─────────────────────────────────────────── */}
      <Modal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Send this broadcast?"
        subtitle="Review the details below. Messages can't be recalled once sent."
        maxWidth="lg"
        isSubmitting={sending}
        footer={
          <>
            <Button onClick={() => setConfirmOpen(false)} disabled={sending}>
              Keep editing
            </Button>
            <Button variant="primary" icon="send" onClick={send} loading={sending} disabled={large && !ack}>
              Send to {formatNumber(recipients.reachable)} {recipients.reachable === 1 ? "person" : "people"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <dl className="grid grid-cols-2 gap-3 rounded-lg border border-line bg-surface-muted p-4 text-sm">
            <div>
              <dt className="text-[12px] text-ink-muted">Channel</dt>
              <dd className="font-medium text-ink">{channel === "sms" ? "SMS" : "Email"}</dd>
            </div>
            <div>
              <dt className="text-[12px] text-ink-muted">Audience</dt>
              <dd className="font-medium text-ink">{audienceLabel}</dd>
            </div>
            <div>
              <dt className="text-[12px] text-ink-muted">Recipients</dt>
              <dd className="font-medium tabular-nums text-ink">{formatNumber(recipients.reachable)}</dd>
            </div>
            {channel === "sms" ? (
              <div>
                <dt className="text-[12px] text-ink-muted">Estimated segments</dt>
                <dd className="font-medium tabular-nums text-ink">{formatNumber(recipients.reachable * sms.segments)}</dd>
              </div>
            ) : (
              <div>
                <dt className="text-[12px] text-ink-muted">Subject</dt>
                <dd className="truncate font-medium text-ink">{subject}</dd>
              </div>
            )}
          </dl>
          <div>
            <p className="mb-1.5 text-[12px] font-medium text-ink-muted">Message</p>
            <p className="max-h-48 overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-line p-3 text-[13px] leading-relaxed text-ink">{body}</p>
          </div>
          <p className="text-[13px] text-ink-muted">
            The broadcast is queued and processed in the background by the church&apos;s configured {channel === "sms" ? "SMS provider" : "email service"}.
            History shows how many messages were processed or failed once it finishes.
          </p>
          {large && (
            <div className="rounded-lg border border-warning-line bg-warning-soft p-3">
              <Checkbox checked={ack} onChange={setAck} label={`I confirm this should be sent to ${formatNumber(recipients.reachable)} people`} />
            </div>
          )}
        </div>
      </Modal>

      {/* ── View broadcast ────────────────────────────────────────────── */}
      <Modal
        isOpen={Boolean(viewing)}
        onClose={() => setViewing(null)}
        title={viewing?.name ?? "Broadcast"}
        subtitle={viewing ? `${viewing.channel.toUpperCase()} · ${describeFilter(viewing.recipients_filter, groups.data ?? [])}` : undefined}
        maxWidth="lg"
        footer={<Button onClick={() => setViewing(null)}>Close</Button>}
      >
        {viewing && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <CampaignStatusBadge status={viewing.status} />
              {viewing.status !== "draft" && (
                <Badge tone="neutral">
                  {formatNumber(viewing.sent_count)} processed · {formatNumber(viewing.failed_count ?? 0)} failed of {formatNumber(viewing.recipient_count)}
                </Badge>
              )}
            </div>
            {viewing.subject && (
              <div>
                <p className="text-[12px] text-ink-muted">Subject</p>
                <p className="text-sm font-medium text-ink">{viewing.subject}</p>
              </div>
            )}
            <p className="whitespace-pre-wrap break-words rounded-lg border border-line bg-surface-muted p-3 text-[13px] leading-relaxed text-ink">{viewing.body}</p>
            <p className="text-[12px] text-ink-subtle">
              Created {formatDateTime(viewing.created_at)}
              {viewing.sent_at ? ` · processed ${formatDateTime(viewing.sent_at)}` : ""}
            </p>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDeleteCampaign}
        title="Delete broadcast?"
        message={
          <>
            <strong className="font-semibold text-ink">{toDelete?.name}</strong> will be permanently deleted.
          </>
        }
        confirmText="Delete"
        isLoading={deleting}
      />

      <ConfirmDialog
        isOpen={Boolean(toResend)}
        onClose={() => setToResend(null)}
        onConfirm={confirmResend}
        title="Retry this broadcast?"
        message={
          <>
            <strong className="font-semibold text-ink">{toResend?.name}</strong> will be queued again for its whole audience. People who already
            received it may get it a second time.
          </>
        }
        confirmText="Queue again"
        variant="warning"
        icon="refresh"
        isLoading={resending}
      />
    </div>
  );
}
