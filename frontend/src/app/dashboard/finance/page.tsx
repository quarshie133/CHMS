"use client";

import { useState, type SyntheticEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import {
  contributionsApi,
  errorMessage,
  fieldError,
  financeApi,
  fundsApi,
  listAll,
  membersApi,
  pledgesApi,
  type Contribution,
  type Fund,
  type Member,
  type Pledge,
} from "@/lib/api";
import { useAsync, useDebounced, usePageForFilters } from "@/lib/hooks";
import {
  CONTRIBUTION_TYPES,
  formatDate,
  formatMoney,
  formatNumber,
  humanize,
  initialsFromName,
  labelFor,
  PAYMENT_METHODS,
  todayISO,
} from "@/lib/format";
import { Modal, ConfirmDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { Checkbox, Field, Input, Select, Switch, Textarea } from "@/components/ui/form";
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
  Icon,
  PageHeader,
  Pagination,
  Progress,
  SearchInput,
  Segmented,
  Skeleton,
  StatCard,
  TableSkeleton,
} from "@/components/ui/primitives";

const PAGE_SIZE = 25;
type Tab = "contributions" | "funds" | "pledges";

export default function FinancePage() {
  const { token } = useAuth();
  const t = token ?? "";
  const [tab, setTab] = useState<Tab>("contributions");

  const summary = useAsync(token ? () => financeApi.summary(t) : null, [token]);
  const funds = useAsync(token ? () => listAll(fundsApi.list, t) : null, [token]);
  const [members, setMembers] = useState<Member[]>([]);
  const [membersRequested, setMembersRequested] = useState(false);
  const ensureMembers = () => {
    if (token && !membersRequested) {
      setMembersRequested(true);
      listAll(membersApi.list, token, "ordering=last_name").then(setMembers).catch(() => setMembersRequested(false));
    }
  };

  const monthName = new Date().toLocaleDateString("en-US", { month: "long" });
  const refreshTotals = () => {
    summary.reload();
    funds.reload();
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Finance"
        description="Record tithes, offerings and donations, and track funds and pledges."
        actions={
          <Segmented<Tab>
            label="Finance sections"
            value={tab}
            onChange={setTab}
            options={[
              { value: "contributions", label: "Giving", icon: "volunteer_activism" },
              { value: "funds", label: "Funds", icon: "savings" },
              { value: "pledges", label: "Pledges", icon: "handshake" },
            ]}
          />
        }
      />

      <section aria-label="Giving summary" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={`Giving in ${monthName}`} icon="calendar_month" loading={summary.loading} value={summary.error ? "—" : formatMoney(summary.data?.this_month)} hint="Month to date" />
        <StatCard label={`Giving in ${new Date().getFullYear()}`} icon="trending_up" tone="success" loading={summary.loading} value={summary.error ? "—" : formatMoney(summary.data?.this_year)} hint="Year to date" />
        <StatCard label="All-time giving" icon="account_balance" tone="neutral" loading={summary.loading} value={summary.error ? "—" : formatMoney(summary.data?.all_time)} hint="Since records began" />
        <StatCard
          label="Active funds"
          icon="savings"
          tone="accent"
          loading={funds.loading}
          value={funds.error ? "—" : formatNumber((funds.data ?? []).filter((f) => f.is_active).length)}
          hint="Designated giving funds"
        />
      </section>
      {summary.error && <Alert tone="warning">Giving totals couldn&apos;t be loaded: {summary.error}</Alert>}

      {tab === "contributions" && (
        <ContributionsTab token={t} funds={funds.data ?? []} fundsLoading={funds.loading} members={members} ensureMembers={ensureMembers} onChanged={refreshTotals} goToFunds={() => setTab("funds")} summary={summary.data} />
      )}
      {tab === "funds" && <FundsTab token={t} funds={funds} />}
      {tab === "pledges" && <PledgesTab token={t} funds={funds.data ?? []} members={members} ensureMembers={ensureMembers} />}
    </div>
  );
}

/* ═══ Contributions ═════════════════════════════════════════════════════ */
interface ContributionForm {
  member: string;
  fund: string;
  contribution_type: string;
  amount: string;
  date: string;
  payment_method: string;
  reference_number: string;
  check_number: string;
  notes: string;
  is_anonymous: boolean;
}

const emptyContribution = (fund = ""): ContributionForm => ({
  member: "",
  fund,
  contribution_type: "tithe",
  amount: "",
  date: todayISO(),
  payment_method: "cash",
  reference_number: "",
  check_number: "",
  notes: "",
  is_anonymous: false,
});

function ContributionsTab({
  token,
  funds,
  fundsLoading,
  members,
  ensureMembers,
  onChanged,
  goToFunds,
  summary,
}: {
  token: string;
  funds: Fund[];
  fundsLoading: boolean;
  members: Member[];
  ensureMembers: () => void;
  onChanged: () => void;
  goToFunds: () => void;
  summary: Awaited<ReturnType<typeof financeApi.summary>> | null;
}) {
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [fund, setFund] = useState("");
  const [type, setType] = useState("");
  const [method, setMethod] = useState("");
  const debouncedSearch = useDebounced(search.trim());
  const [page, setPage] = usePageForFilters(`${debouncedSearch}|${fund}|${type}|${method}`);

  const list = useAsync(
    token
      ? () => {
          const qs = new URLSearchParams({ ordering: "-date", page: String(page), page_size: String(PAGE_SIZE) });
          if (debouncedSearch) qs.set("search", debouncedSearch);
          if (fund) qs.set("fund", fund);
          if (type) qs.set("contribution_type", type);
          if (method) qs.set("payment_method", method);
          return contributionsApi.list(token, qs.toString());
        }
      : null,
    [token, page, debouncedSearch, fund, type, method]
  );
  const trend = useAsync(token ? () => financeApi.monthlyTrend(token) : null, [token]);

  // ── Form ───────────────────────────────────────────────────────────────
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Contribution | null>(null);
  const [form, setForm] = useState<ContributionForm>(emptyContribution());
  const [errors, setErrors] = useState<Partial<Record<keyof ContributionForm, string>>>({});
  const [apiError, setApiError] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);
  const setF = <K extends keyof ContributionForm>(k: K, v: ContributionForm[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const openCreate = () => {
    ensureMembers();
    setEditing(null);
    setForm(emptyContribution(funds.find((f) => f.is_active)?.id ?? funds[0]?.id ?? ""));
    setErrors({});
    setApiError(null);
    setOpen(true);
  };

  const openEdit = (c: Contribution) => {
    ensureMembers();
    setEditing(c);
    setForm({
      member: c.member ?? "",
      fund: c.fund,
      contribution_type: c.contribution_type,
      amount: c.amount,
      date: c.date,
      payment_method: c.payment_method,
      reference_number: c.reference_number ?? "",
      check_number: c.check_number ?? "",
      notes: c.notes ?? "",
      is_anonymous: Boolean(c.is_anonymous),
    });
    setErrors({});
    setApiError(null);
    setOpen(true);
  };

  const save = async (e: SyntheticEvent) => {
    e.preventDefault();
    if (saving) return;
    const errs: typeof errors = {};
    const amount = parseFloat(form.amount);
    if (!form.fund) errs.fund = "Choose a fund.";
    if (!form.amount || Number.isNaN(amount) || amount <= 0) errs.amount = "Enter an amount greater than zero.";
    if (!form.date) errs.date = "Choose the date received.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    setApiError(null);
    try {
      const payload = {
        member: form.member || null,
        fund: form.fund,
        contribution_type: form.contribution_type,
        amount: amount.toFixed(2),
        date: form.date,
        payment_method: form.payment_method,
        reference_number: form.reference_number.trim(),
        check_number: form.payment_method === "check" ? form.check_number.trim() : "",
        notes: form.notes.trim(),
        is_anonymous: form.is_anonymous,
      };
      if (editing) {
        await contributionsApi.update(token, editing.id, payload);
        toast.success("Contribution updated");
      } else {
        await contributionsApi.create(token, payload);
        const fundName = funds.find((f) => f.id === form.fund)?.name ?? "the fund";
        toast.success("Giving recorded", `${formatMoney(amount)} recorded to ${fundName}.`);
      }
      setOpen(false);
      list.reload();
      trend.reload();
      onChanged();
    } catch (err) {
      setApiError(err);
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────
  const [toDelete, setToDelete] = useState<Contribution | null>(null);
  const [deleting, setDeleting] = useState(false);
  const confirmDelete = async () => {
    if (!toDelete || deleting) return;
    setDeleting(true);
    try {
      await contributionsApi.remove(token, toDelete.id);
      toast.success("Contribution deleted", `${formatMoney(toDelete.amount, toDelete.currency)} entry was removed.`);
      setToDelete(null);
      list.reload();
      trend.reload();
      onChanged();
    } catch (err) {
      toast.error("Couldn't delete contribution", errorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const rows = list.data?.results ?? [];
  const filtersActive = Boolean(debouncedSearch || fund || type || method);
  const donorName = (c: Contribution) => (c.is_anonymous ? "Anonymous" : c.member_name || "Unlinked donor");
  const byType = (summary?.by_type ?? []).map((b) => ({ ...b, total: Number(b.total) })).sort((a, b) => b.total - a.total);
  const typeTotal = byType.reduce((s, b) => s + b.total, 0);

  return (
    <>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-8">
          <CardHeader title="Monthly giving" description="Totals over the last 12 months" icon="bar_chart" />
          <div className="px-5 pb-5">
            {trend.loading ? (
              <Skeleton className="h-48 w-full" />
            ) : trend.error ? (
              <ErrorState compact message={trend.error} onRetry={trend.reload} />
            ) : !trend.data || trend.data.length === 0 ? (
              <p className="rounded-lg border border-dashed border-line px-4 py-10 text-center text-[13px] text-ink-muted">
                Monthly totals appear once giving is recorded.
              </p>
            ) : (
              <BarChart
                caption="Monthly giving totals"
                valueLabel="Total"
                formatValue={(n) => formatMoney(n)}
                data={trend.data.map((m) => ({
                  key: m.month,
                  label: new Date(m.month).toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }),
                  value: Number(m.total),
                }))}
              />
            )}
          </div>
        </Card>
        <Card className="lg:col-span-4">
          <CardHeader title="By giving type" description="All-time share" icon="donut_small" />
          <div className="px-5 pb-5">
            {byType.length === 0 ? (
              <p className="text-[13px] text-ink-muted">No giving recorded yet.</p>
            ) : (
              <ul className="flex flex-col gap-3.5">
                {byType.map((b) => (
                  <li key={b.contribution_type}>
                    <div className="mb-1 flex items-center justify-between text-[13px]">
                      <span className="font-medium text-ink">{labelFor(CONTRIBUTION_TYPES, b.contribution_type)}</span>
                      <span className="tabular-nums text-ink-muted">
                        {formatMoney(b.total)} · {typeTotal ? Math.round((b.total / typeTotal) * 100) : 0}%
                      </span>
                    </div>
                    <Progress value={typeTotal ? (b.total / typeTotal) * 100 : 0} label={`${labelFor(CONTRIBUTION_TYPES, b.contribution_type)} share`} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader
          title="Contributions"
          icon="receipt_long"
          actions={
            <Button variant="primary" icon="add" onClick={openCreate} disabled={fundsLoading}>
              Record giving
            </Button>
          }
        />
        <div className="grid grid-cols-1 gap-2 border-y border-line bg-surface-muted p-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_180px_170px_170px]">
          <SearchInput value={search} onChange={setSearch} placeholder="Search donor or reference" label="Search contributions" />
          <Select aria-label="Filter by fund" value={fund} onChange={(e) => setFund(e.target.value)}>
            <option value="">All funds</option>
            {funds.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </Select>
          <Select aria-label="Filter by giving type" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All types</option>
            {CONTRIBUTION_TYPES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <Select aria-label="Filter by payment method" value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="">All methods</option>
            {PAYMENT_METHODS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>

        {list.loading && !list.data ? (
          <TableSkeleton rows={5} cols={4} />
        ) : list.error ? (
          <ErrorState message={list.error} onRetry={list.reload} />
        ) : rows.length === 0 ? (
          filtersActive ? (
            <EmptyState
              icon="search_off"
              title="No matching contributions"
              description="Try another search or clear the filters."
              action={
                <Button
                  onClick={() => {
                    setSearch("");
                    setFund("");
                    setType("");
                    setMethod("");
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon="volunteer_activism"
              title="No giving recorded yet"
              description="Record tithes, offerings and donations as they come in."
              action={
                <Button variant="primary" icon="add" onClick={openCreate}>
                  Record giving
                </Button>
              }
            />
          )
        ) : (
          <div className={list.loading ? "opacity-60" : ""}>
            <div className="hidden overflow-x-auto md:block">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Donor</th>
                    <th scope="col">Fund</th>
                    <th scope="col">Method</th>
                    <th scope="col">Date</th>
                    <th scope="col" className="num">
                      Amount
                    </th>
                    <th scope="col">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => {
                    const m = PAYMENT_METHODS.find((p) => p.value === c.payment_method);
                    return (
                      <tr key={c.id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <Avatar name={donorName(c)} initials={c.is_anonymous || !c.member_name ? "—" : initialsFromName(c.member_name)} size={32} />
                            <div className="min-w-0">
                              {c.member && !c.is_anonymous ? (
                                <Link href={`/dashboard/members/${c.member}`} className="block truncate font-medium text-ink hover:text-brand hover:underline">
                                  {donorName(c)}
                                </Link>
                              ) : (
                                <span className="block truncate font-medium text-ink">{donorName(c)}</span>
                              )}
                              <span className="block max-w-[260px] truncate text-[13px] text-ink-muted">
                                {[labelFor(CONTRIBUTION_TYPES, c.contribution_type), c.reference_number, c.notes].filter(Boolean).join(" · ")}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <Badge tone="brand">{c.fund_name}</Badge>
                        </td>
                        <td className="whitespace-nowrap text-ink-muted">
                          <span className="inline-flex items-center gap-1.5">
                            <Icon name={m?.icon ?? "payments"} size={16} />
                            {m?.label ?? humanize(c.payment_method)}
                            {c.check_number ? ` #${c.check_number}` : ""}
                          </span>
                        </td>
                        <td className="whitespace-nowrap text-ink-muted">{formatDate(c.date)}</td>
                        <td className="num font-semibold">{formatMoney(c.amount, c.currency)}</td>
                        <td>
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" iconOnly icon="edit" aria-label={`Edit contribution from ${donorName(c)}`} title="Edit" onClick={() => openEdit(c)} />
                            <Button variant="danger-ghost" size="sm" iconOnly icon="delete" aria-label={`Delete contribution from ${donorName(c)}`} title="Delete" onClick={() => setToDelete(c)} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-line md:hidden">
              {rows.map((c) => (
                <li key={c.id} className="flex items-start gap-3 px-4 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">{donorName(c)}</p>
                    <p className="truncate text-[13px] text-ink-muted">
                      {c.fund_name} · {labelFor(PAYMENT_METHODS, c.payment_method)} · {formatDate(c.date)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="font-semibold tabular-nums text-ink">{formatMoney(c.amount, c.currency)}</span>
                    <div className="flex">
                      <Button variant="ghost" size="xs" iconOnly icon="edit" aria-label={`Edit contribution from ${donorName(c)}`} onClick={() => openEdit(c)} />
                      <Button variant="danger-ghost" size="xs" iconOnly icon="delete" aria-label={`Delete contribution from ${donorName(c)}`} onClick={() => setToDelete(c)} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <Pagination page={page} pageSize={PAGE_SIZE} total={list.data?.count ?? 0} onPageChange={setPage} noun="contributions" />
          </div>
        )}
      </Card>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit contribution" : "Record giving"}
        subtitle={editing ? "Correct the details of this ledger entry." : "Post a tithe, offering or donation to a fund."}
        maxWidth="xl"
        isSubmitting={saving}
        footer={
          <>
            <Button onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" form="contribution-form" variant="primary" loading={saving} disabled={funds.length === 0}>
              {editing ? "Save changes" : "Record giving"}
            </Button>
          </>
        }
      >
        {funds.length === 0 ? (
          <Alert tone="warning" title="Create a fund first">
            Every contribution belongs to a fund (for example General Tithe or Building Fund).{" "}
            <button
              type="button"
              className="font-semibold text-brand hover:underline"
              onClick={() => {
                setOpen(false);
                goToFunds();
              }}
            >
              Go to Funds
            </button>
          </Alert>
        ) : (
          <form id="contribution-form" onSubmit={save} noValidate className="flex flex-col gap-5">
            {apiError ? <Alert title="Couldn't save contribution">{errorMessage(apiError)}</Alert> : null}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Donor" hint={members.length === 0 ? "Loading people…" : "Leave empty for a cash collection or guest"} className="sm:col-span-2">
                {(p) => (
                  <Select {...p} value={form.member} disabled={saving} onChange={(e) => setF("member", e.target.value)}>
                    <option value="">No linked person</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.full_name}
                        {m.family_name ? ` (${m.family_name})` : ""}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Amount" required error={errors.amount || fieldError(apiError, "amount")}>
                {(p) => (
                  <Input {...p} type="number" inputMode="decimal" step="0.01" min="0.01" placeholder="0.00" value={form.amount} disabled={saving} onChange={(e) => setF("amount", e.target.value)} />
                )}
              </Field>
              <Field label="Date received" required error={errors.date || fieldError(apiError, "date")}>
                {(p) => <Input {...p} type="date" max={todayISO()} value={form.date} disabled={saving} onChange={(e) => setF("date", e.target.value)} />}
              </Field>
              <Field label="Fund" required error={errors.fund || fieldError(apiError, "fund")}>
                {(p) => (
                  <Select {...p} value={form.fund} disabled={saving} onChange={(e) => setF("fund", e.target.value)}>
                    <option value="" disabled>
                      Select a fund
                    </option>
                    {funds.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                        {f.is_active ? "" : " (inactive)"}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Giving type">
                {(p) => (
                  <Select {...p} value={form.contribution_type} disabled={saving} onChange={(e) => setF("contribution_type", e.target.value)}>
                    {CONTRIBUTION_TYPES.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Payment method">
                {(p) => (
                  <Select {...p} value={form.payment_method} disabled={saving} onChange={(e) => setF("payment_method", e.target.value)}>
                    {PAYMENT_METHODS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              {form.payment_method === "check" ? (
                <Field label="Check number">
                  {(p) => <Input {...p} value={form.check_number} disabled={saving} onChange={(e) => setF("check_number", e.target.value)} />}
                </Field>
              ) : (
                <Field label="Reference" hint="Envelope, receipt or transaction number">
                  {(p) => <Input {...p} value={form.reference_number} disabled={saving} onChange={(e) => setF("reference_number", e.target.value)} />}
                </Field>
              )}
              {form.payment_method === "check" && (
                <Field label="Reference" hint="Envelope or receipt number" className="sm:col-span-2">
                  {(p) => <Input {...p} value={form.reference_number} disabled={saving} onChange={(e) => setF("reference_number", e.target.value)} />}
                </Field>
              )}
              <Field label="Notes" className="sm:col-span-2">
                {(p) => <Textarea {...p} rows={2} value={form.notes} disabled={saving} onChange={(e) => setF("notes", e.target.value)} />}
              </Field>
            </div>
            <Checkbox checked={form.is_anonymous} onChange={(v) => setF("is_anonymous", v)} disabled={saving} label="Record as anonymous" description="The donor's name is hidden in giving lists." />
          </form>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete contribution?"
        message={
          <>
            The <strong className="font-semibold text-ink">{toDelete ? formatMoney(toDelete.amount, toDelete.currency) : ""}</strong> entry from{" "}
            {toDelete ? donorName(toDelete) : ""} on {toDelete ? formatDate(toDelete.date) : ""} will be permanently removed from the ledger.
          </>
        }
        confirmText="Delete entry"
        isLoading={deleting}
      />
    </>
  );
}

/* ═══ Funds ══════════════════════════════════════════════════════════════ */
function FundsTab({ token, funds }: { token: string; funds: ReturnType<typeof useAsync<Fund[]>> }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Fund | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [goal, setGoal] = useState("");
  const [active, setActive] = useState(true);
  const [nameError, setNameError] = useState("");
  const [apiError, setApiError] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<Fund | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openForm = (f: Fund | null) => {
    setEditing(f);
    setName(f?.name ?? "");
    setDescription(f?.description ?? "");
    setGoal(f?.goal_amount ? String(parseFloat(f.goal_amount)) : "");
    setActive(f?.is_active ?? true);
    setNameError("");
    setApiError(null);
    setOpen(true);
  };

  const save = async (e: SyntheticEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!name.trim()) return setNameError("Fund name is required.");
    setSaving(true);
    setApiError(null);
    try {
      const payload = { name: name.trim(), description: description.trim(), goal_amount: goal ? Number(goal).toFixed(2) : null, is_active: active };
      if (editing) await fundsApi.update(token, editing.id, payload);
      else await fundsApi.create(token, payload);
      toast.success(editing ? "Fund updated" : "Fund created", payload.name);
      setOpen(false);
      funds.reload();
    } catch (err) {
      setApiError(err);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete || deleting) return;
    setDeleting(true);
    try {
      await fundsApi.remove(token, toDelete.id);
      toast.success("Fund deleted", toDelete.name);
      setToDelete(null);
      funds.reload();
    } catch (err) {
      const status = (err as { status?: number })?.status;
      toast.error(
        "Couldn't delete fund",
        status === 500 || errorMessage(err).toLowerCase().includes("protect")
          ? "This fund has contributions or pledges recorded against it. Mark it inactive instead."
          : errorMessage(err)
      );
    } finally {
      setDeleting(false);
    }
  };

  const list = funds.data ?? [];

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-ink-muted">Funds group giving by purpose. Goals are optional.</p>
        <Button variant="primary" icon="add" onClick={() => openForm(null)}>
          New fund
        </Button>
      </div>
      {funds.loading && !funds.data ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="space-y-3 p-5">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-8 w-28" />
              <Skeleton className="h-2 w-full" />
            </Card>
          ))}
        </div>
      ) : funds.error ? (
        <Card>
          <ErrorState message={funds.error} onRetry={funds.reload} />
        </Card>
      ) : list.length === 0 ? (
        <Card>
          <EmptyState
            icon="savings"
            title="No funds yet"
            description="Create funds such as General Tithe, Building Fund or Missions before recording giving."
            action={
              <Button variant="primary" icon="add" onClick={() => openForm(null)}>
                New fund
              </Button>
            }
          />
        </Card>
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((f) => {
            const received = parseFloat(f.total_received ?? "0");
            const goalN = f.goal_amount ? parseFloat(f.goal_amount) : null;
            const pct = goalN ? (received / goalN) * 100 : null;
            return (
              <li key={f.id}>
                <Card className="flex h-full flex-col p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate text-[15px] font-semibold text-ink">{f.name}</h3>
                      {!f.is_active && <Badge tone="neutral" className="mt-1">Inactive</Badge>}
                    </div>
                    <div className="-mr-2 -mt-1 flex">
                      <Button variant="ghost" size="xs" iconOnly icon="edit" aria-label={`Edit ${f.name}`} title="Edit" onClick={() => openForm(f)} />
                      <Button variant="danger-ghost" size="xs" iconOnly icon="delete" aria-label={`Delete ${f.name}`} title="Delete" onClick={() => setToDelete(f)} />
                    </div>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[13px] text-ink-muted">{f.description || "No description."}</p>
                  <div className="flex-1" />
                  <p className="mt-4 text-[12px] text-ink-muted">Received</p>
                  <p className="text-2xl font-semibold tabular-nums text-ink">{formatMoney(received)}</p>
                  {goalN ? (
                    <div className="mt-3">
                      <Progress value={pct ?? 0} label={`${f.name} progress toward goal`} tone="success" />
                      <p className="mt-1.5 text-[12px] text-ink-muted">
                        {Math.round(pct ?? 0)}% of {formatMoney(goalN)} goal
                      </p>
                    </div>
                  ) : (
                    <p className="mt-3 text-[12px] text-ink-subtle">No goal set</p>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit fund" : "New fund"}
        maxWidth="md"
        isSubmitting={saving}
        footer={
          <>
            <Button onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" form="fund-form" variant="primary" loading={saving}>
              {editing ? "Save changes" : "Create fund"}
            </Button>
          </>
        }
      >
        <form id="fund-form" onSubmit={save} noValidate className="flex flex-col gap-4">
          {apiError ? <Alert title="Couldn't save fund">{errorMessage(apiError)}</Alert> : null}
          <Field label="Fund name" required error={nameError || fieldError(apiError, "name")}>
            {(p) => (
              <Input
                {...p}
                value={name}
                disabled={saving}
                placeholder="e.g. Building Fund"
                onChange={(e) => {
                  setName(e.target.value);
                  setNameError("");
                }}
              />
            )}
          </Field>
          <Field label="Description">
            {(p) => <Textarea {...p} rows={2} value={description} disabled={saving} onChange={(e) => setDescription(e.target.value)} />}
          </Field>
          <Field label="Goal amount" hint="Optional target to track progress" error={fieldError(apiError, "goal_amount")}>
            {(p) => <Input {...p} type="number" inputMode="decimal" min="0" step="0.01" value={goal} disabled={saving} onChange={(e) => setGoal(e.target.value)} />}
          </Field>
          <Switch checked={active} onChange={setActive} disabled={saving} label="Active" description="Inactive funds stay in reports but are de-emphasized when recording." />
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete fund?"
        message={
          <>
            <strong className="font-semibold text-ink">{toDelete?.name}</strong> will be deleted. Funds with recorded giving or pledges can&apos;t be
            deleted — mark them inactive instead.
          </>
        }
        confirmText="Delete fund"
        isLoading={deleting}
      />
    </>
  );
}

/* ═══ Pledges ════════════════════════════════════════════════════════════ */
interface PledgeForm {
  member: string;
  fund: string;
  total_amount: string;
  paid_amount: string;
  start_date: string;
  end_date: string;
  status: string;
  notes: string;
}

function PledgesTab({ token, funds, members, ensureMembers }: { token: string; funds: Fund[]; members: Member[]; ensureMembers: () => void }) {
  const toast = useToast();
  const [status, setStatus] = useState("active");
  const pledges = useAsync(() => listAll(pledgesApi.list, token, status ? `status=${status}` : ""), [token, status]);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Pledge | null>(null);
  const [form, setForm] = useState<PledgeForm>({ member: "", fund: "", total_amount: "", paid_amount: "0", start_date: todayISO(), end_date: "", status: "active", notes: "" });
  const [errors, setErrors] = useState<Partial<Record<keyof PledgeForm, string>>>({});
  const [apiError, setApiError] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<Pledge | null>(null);
  const [deleting, setDeleting] = useState(false);
  const setF = <K extends keyof PledgeForm>(k: K, v: PledgeForm[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const openForm = (p: Pledge | null) => {
    ensureMembers();
    setEditing(p);
    const end = new Date();
    end.setFullYear(end.getFullYear() + 1);
    setForm(
      p
        ? { member: p.member, fund: p.fund, total_amount: p.total_amount, paid_amount: p.paid_amount, start_date: p.start_date, end_date: p.end_date, status: p.status, notes: p.notes ?? "" }
        : { member: "", fund: funds[0]?.id ?? "", total_amount: "", paid_amount: "0", start_date: todayISO(), end_date: end.toISOString().slice(0, 10), status: "active", notes: "" }
    );
    setErrors({});
    setApiError(null);
    setOpen(true);
  };

  const save = async (e: SyntheticEvent) => {
    e.preventDefault();
    if (saving) return;
    const errs: typeof errors = {};
    if (!form.member) errs.member = "Choose who made the pledge.";
    if (!form.fund) errs.fund = "Choose a fund.";
    if (!(parseFloat(form.total_amount) > 0)) errs.total_amount = "Enter the pledged amount.";
    if (parseFloat(form.paid_amount || "0") < 0) errs.paid_amount = "Paid amount can't be negative.";
    if (!form.start_date) errs.start_date = "Choose a start date.";
    if (!form.end_date) errs.end_date = "Choose an end date.";
    if (form.start_date && form.end_date && form.end_date < form.start_date) errs.end_date = "End date must be after the start date.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    setApiError(null);
    try {
      const payload = {
        ...form,
        total_amount: parseFloat(form.total_amount).toFixed(2),
        paid_amount: parseFloat(form.paid_amount || "0").toFixed(2),
        notes: form.notes.trim(),
      };
      if (editing) await pledgesApi.update(token, editing.id, payload);
      else await pledgesApi.create(token, payload);
      toast.success(editing ? "Pledge updated" : "Pledge recorded");
      setOpen(false);
      pledges.reload();
    } catch (err) {
      setApiError(err);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete || deleting) return;
    setDeleting(true);
    try {
      await pledgesApi.remove(token, toDelete.id);
      toast.success("Pledge deleted");
      setToDelete(null);
      pledges.reload();
    } catch (err) {
      toast.error("Couldn't delete pledge", errorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const list = pledges.data ?? [];

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader
          title="Pledges"
          description="Commitments made toward a fund over a period"
          icon="handshake"
          actions={
            <Button variant="primary" icon="add" onClick={() => openForm(null)} disabled={funds.length === 0}>
              New pledge
            </Button>
          }
        />
        <div className="border-y border-line bg-surface-muted px-4 py-3">
          <Segmented
            label="Filter pledges by status"
            size="sm"
            value={status}
            onChange={setStatus}
            options={[
              { value: "active", label: "Active" },
              { value: "fulfilled", label: "Fulfilled" },
              { value: "cancelled", label: "Cancelled" },
              { value: "", label: "All" },
            ]}
          />
        </div>
        {pledges.loading && !pledges.data ? (
          <TableSkeleton rows={3} cols={4} />
        ) : pledges.error ? (
          <ErrorState message={pledges.error} onRetry={pledges.reload} />
        ) : list.length === 0 ? (
          <EmptyState
            icon="handshake"
            title={status ? `No ${status} pledges` : "No pledges yet"}
            description={funds.length === 0 ? "Create a fund first, then record pledges against it." : "Record a member's commitment toward a fund."}
            action={
              funds.length > 0 ? (
                <Button variant="primary" icon="add" onClick={() => openForm(null)}>
                  New pledge
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Member</th>
                  <th scope="col">Fund</th>
                  <th scope="col">Progress</th>
                  <th scope="col" className="num">
                    Pledged
                  </th>
                  <th scope="col" className="num">
                    Remaining
                  </th>
                  <th scope="col">Period</th>
                  <th scope="col">Status</th>
                  <th scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link href={`/dashboard/members/${p.member}`} className="font-medium text-ink hover:text-brand hover:underline">
                        {p.member_name}
                      </Link>
                    </td>
                    <td className="text-ink-muted">{p.fund_name}</td>
                    <td className="min-w-[140px]">
                      <Progress value={p.fulfillment_pct} label={`${p.member_name} pledge progress`} tone="success" />
                      <span className="mt-1 block text-[12px] text-ink-muted">{Math.round(p.fulfillment_pct)}% paid</span>
                    </td>
                    <td className="num">{formatMoney(p.total_amount)}</td>
                    <td className="num font-medium">{formatMoney(p.remaining_amount)}</td>
                    <td className="whitespace-nowrap text-[13px] text-ink-muted">
                      {formatDate(p.start_date, { month: "short", year: "numeric" })} – {formatDate(p.end_date, { month: "short", year: "numeric" })}
                    </td>
                    <td>
                      <Badge tone={p.status === "fulfilled" ? "success" : p.status === "cancelled" ? "neutral" : "brand"} dot>
                        {humanize(p.status)}
                      </Badge>
                    </td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" iconOnly icon="edit" aria-label={`Edit pledge by ${p.member_name}`} title="Edit" onClick={() => openForm(p)} />
                        <Button variant="danger-ghost" size="sm" iconOnly icon="delete" aria-label={`Delete pledge by ${p.member_name}`} title="Delete" onClick={() => setToDelete(p)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit pledge" : "New pledge"}
        maxWidth="lg"
        isSubmitting={saving}
        footer={
          <>
            <Button onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" form="pledge-form" variant="primary" loading={saving}>
              {editing ? "Save changes" : "Record pledge"}
            </Button>
          </>
        }
      >
        <form id="pledge-form" onSubmit={save} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {apiError ? (
            <Alert className="sm:col-span-2" title="Couldn't save pledge">
              {errorMessage(apiError)}
            </Alert>
          ) : null}
          <Field label="Member" required error={errors.member} hint={members.length === 0 ? "Loading people…" : undefined} className="sm:col-span-2">
            {(p) => (
              <Select {...p} value={form.member} disabled={saving} onChange={(e) => setF("member", e.target.value)}>
                <option value="">Select a person</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Fund" required error={errors.fund}>
            {(p) => (
              <Select {...p} value={form.fund} disabled={saving} onChange={(e) => setF("fund", e.target.value)}>
                {funds.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Status">
            {(p) => (
              <Select {...p} value={form.status} disabled={saving} onChange={(e) => setF("status", e.target.value)}>
                <option value="active">Active</option>
                <option value="fulfilled">Fulfilled</option>
                <option value="cancelled">Cancelled</option>
              </Select>
            )}
          </Field>
          <Field label="Pledged amount" required error={errors.total_amount || fieldError(apiError, "total_amount")}>
            {(p) => <Input {...p} type="number" inputMode="decimal" min="0.01" step="0.01" value={form.total_amount} disabled={saving} onChange={(e) => setF("total_amount", e.target.value)} />}
          </Field>
          <Field label="Paid so far" error={errors.paid_amount || fieldError(apiError, "paid_amount")}>
            {(p) => <Input {...p} type="number" inputMode="decimal" min="0" step="0.01" value={form.paid_amount} disabled={saving} onChange={(e) => setF("paid_amount", e.target.value)} />}
          </Field>
          <Field label="Start date" required error={errors.start_date}>
            {(p) => <Input {...p} type="date" value={form.start_date} disabled={saving} onChange={(e) => setF("start_date", e.target.value)} />}
          </Field>
          <Field label="End date" required error={errors.end_date}>
            {(p) => <Input {...p} type="date" min={form.start_date} value={form.end_date} disabled={saving} onChange={(e) => setF("end_date", e.target.value)} />}
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
        title="Delete pledge?"
        message={
          <>
            The {toDelete ? formatMoney(toDelete.total_amount) : ""} pledge by <strong className="font-semibold text-ink">{toDelete?.member_name}</strong> will be
            permanently deleted.
          </>
        }
        confirmText="Delete pledge"
        isLoading={deleting}
      />
    </>
  );
}
