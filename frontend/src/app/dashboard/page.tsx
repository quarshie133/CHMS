"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import {
  attendanceApi,
  communicationsApi,
  eventsApi,
  financeApi,
  groupsApi,
  memberStatsApi,
  membersApi,
} from "@/lib/api";
import { useAsync } from "@/lib/hooks";
import {
  formatDate,
  formatMoney,
  formatNumber,
  formatTime,
  initials,
  relativeTime,
} from "@/lib/format";
import { CampaignStatusBadge, MemberStatusBadge } from "@/components/domain";
import { BarChart } from "@/components/charts";
import {
  Avatar,
  ButtonLink,
  Card,
  CardHeader,
  EmptyState,
  ErrorState,
  Icon,
  Skeleton,
  StatCard,
} from "@/components/ui/primitives";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const { token, user } = useAuth();
  const t = token ?? "";

  const stats = useAsync(token ? () => memberStatsApi(t) : null, [token]);
  const groups = useAsync(token ? () => groupsApi.list(t, "page_size=1&is_active=true") : null, [token]);
  const finance = useAsync(token ? () => financeApi.summary(t) : null, [token]);
  const events = useAsync(
    token
      ? async () => {
          const res = await eventsApi.list(t, "ordering=start_datetime&page_size=100");
          const now = Date.now();
          const in30 = now + 30 * 86400000;
          const upcoming = res.results.filter((e) => new Date(e.end_datetime || e.start_datetime).getTime() >= now);
          return { upcoming, next30: upcoming.filter((e) => new Date(e.start_datetime).getTime() <= in30).length };
        }
      : null,
    [token]
  );
  const trends = useAsync(
    token
      ? async () => {
          const rows = await attendanceApi.trends(t);
          // Sum services held on the same day into one bar.
          const byDate = new Map<string, number>();
          rows.forEach((r) => byDate.set(r.date, (byDate.get(r.date) ?? 0) + r.count));
          return Array.from(byDate.entries()).map(([date, count]) => ({ date, count }));
        }
      : null,
    [token]
  );
  const recent = useAsync(token ? () => membersApi.list(t, "ordering=-created_at&page_size=6") : null, [token]);
  const month = new Date().getMonth() + 1;
  const birthdays = useAsync(token ? () => membersApi.list(t, `birthday_month=${month}&page_size=8`) : null, [token]);
  const campaigns = useAsync(token ? () => communicationsApi.list(t, "page_size=4") : null, [token]);

  const monthName = new Date().toLocaleDateString("en-US", { month: "long" });
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="flex flex-col gap-6">
      {/* ── Greeting & quick actions ───────────────────────────────────── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[13px] font-medium text-ink-muted">{today}</p>
          <h1 className="mt-1 text-2xl font-semibold leading-8 tracking-tight text-ink">
            {greeting()}, {user?.first_name || "friend"}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">Here&apos;s what&apos;s happening across the congregation.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/dashboard/members/new" variant="primary" icon="person_add">
            Add person
          </ButtonLink>
          <ButtonLink href="/dashboard/finance" icon="volunteer_activism">
            Record giving
          </ButtonLink>
          <ButtonLink href="/dashboard/events" icon="event" className="hidden sm:inline-flex">
            Plan event
          </ButtonLink>
          <ButtonLink href="/dashboard/communications" icon="sms" className="hidden sm:inline-flex">
            New broadcast
          </ButtonLink>
        </div>
      </div>

      {/* ── Key metrics ────────────────────────────────────────────────── */}
      <section aria-label="Key metrics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="People in directory"
          icon="group"
          href="/dashboard/members"
          loading={stats.loading}
          value={stats.error ? "—" : formatNumber(stats.data?.total)}
          hint={
            stats.error
              ? "Unavailable"
              : `${formatNumber(stats.data?.active)} active · ${formatNumber(stats.data?.visitors)} visitors`
          }
        />
        <StatCard
          label="Active groups"
          icon="diversity_3"
          tone="success"
          href="/dashboard/groups"
          loading={groups.loading}
          value={groups.error ? "—" : formatNumber(groups.data?.count)}
          hint={groups.error ? "Unavailable" : "Ministries & small groups"}
        />
        <StatCard
          label="Upcoming events"
          icon="event"
          tone="accent"
          href="/dashboard/events"
          loading={events.loading}
          value={events.error ? "—" : formatNumber(events.data?.next30)}
          hint={events.error ? "Unavailable" : "In the next 30 days"}
        />
        <StatCard
          label={`Giving in ${monthName}`}
          icon="volunteer_activism"
          tone="neutral"
          href="/dashboard/finance"
          loading={finance.loading}
          value={finance.error ? "—" : formatMoney(finance.data?.this_month)}
          hint={finance.error ? "Unavailable" : `${formatMoney(finance.data?.this_year)} year to date`}
        />
      </section>

      {/* ── Attendance + upcoming events ───────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-7 xl:col-span-8">
          <CardHeader
            title="Attendance trend"
            description="Check-ins per service day over the last 12 weeks"
            icon="monitoring"
            actions={
              <Link href="/dashboard/attendance" className="btn btn-link text-[13px]">
                View attendance
              </Link>
            }
          />
          <div className="px-5 pb-5">
            {trends.loading ? (
              <Skeleton className="h-48 w-full" />
            ) : trends.error ? (
              <ErrorState compact message={trends.error} onRetry={trends.reload} />
            ) : !trends.data || trends.data.length === 0 ? (
              <EmptyState
                compact
                icon="fact_check"
                title="No attendance recorded yet"
                description="Create a service and check people in to start seeing weekly trends here."
                action={
                  <ButtonLink href="/dashboard/attendance" size="sm" icon="add">
                    Record attendance
                  </ButtonLink>
                }
              />
            ) : (
              <BarChart
                caption="Attendance by service day"
                valueLabel="Check-ins"
                data={trends.data.map((d) => ({ key: d.date, label: formatDate(d.date, { month: "short", day: "numeric" }), value: d.count }))}
              />
            )}
          </div>
        </Card>

        <Card className="lg:col-span-5 xl:col-span-4">
          <CardHeader
            title="Coming up"
            description="Next scheduled events"
            icon="calendar_month"
            actions={
              <Link href="/dashboard/events" className="btn btn-link text-[13px]">
                All events
              </Link>
            }
          />
          <div className="px-2 pb-3">
            {events.loading ? (
              <ListSkeleton rows={4} />
            ) : events.error ? (
              <ErrorState compact message={events.error} onRetry={events.reload} />
            ) : !events.data || events.data.upcoming.length === 0 ? (
              <EmptyState
                compact
                icon="event_available"
                title="Nothing scheduled"
                description="Upcoming services and gatherings will appear here."
                action={
                  <ButtonLink href="/dashboard/events" size="sm" icon="add">
                    Plan an event
                  </ButtonLink>
                }
              />
            ) : (
              <ul className="flex flex-col">
                {events.data.upcoming.slice(0, 5).map((e) => {
                  const d = new Date(e.start_datetime);
                  return (
                    <li key={e.id}>
                      <Link
                        href="/dashboard/events"
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-canvas"
                      >
                        <span className="flex h-11 w-11 flex-shrink-0 flex-col items-center justify-center rounded-lg border border-line bg-surface-muted leading-none">
                          <span className="text-[10px] font-semibold uppercase text-accent-ink">
                            {d.toLocaleDateString("en-US", { month: "short" })}
                          </span>
                          <span className="mt-0.5 text-base font-semibold text-ink">{d.getDate()}</span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-ink">{e.title}</span>
                          <span className="block truncate text-[13px] text-ink-muted">
                            {e.is_all_day ? "All day" : formatTime(e.start_datetime)}
                            {e.location ? ` · ${e.location}` : ""}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Card>
      </div>

      {/* ── People + birthdays + broadcasts ────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardHeader
            title="Recently added people"
            description="Newest records in the directory"
            icon="person_add"
            actions={
              <Link href="/dashboard/members" className="btn btn-link text-[13px]">
                View directory
              </Link>
            }
          />
          <div className="px-2 pb-3">
            {recent.loading ? (
              <ListSkeleton rows={5} />
            ) : recent.error ? (
              <ErrorState compact message={recent.error} onRetry={recent.reload} />
            ) : !recent.data || recent.data.results.length === 0 ? (
              <EmptyState
                compact
                icon="group_add"
                title="No people yet"
                description="Add your first member or visitor to build the directory."
                action={
                  <ButtonLink href="/dashboard/members/new" size="sm" variant="primary" icon="person_add">
                    Add person
                  </ButtonLink>
                }
              />
            ) : (
              <ul className="flex flex-col">
                {recent.data.results.map((m) => {
                  return (
                    <li key={m.id}>
                      <Link
                        href={`/dashboard/members/${m.id}`}
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-canvas"
                      >
                        <Avatar name={m.full_name} initials={initials(m.first_name, m.last_name)} src={m.photo} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-ink">{m.full_name}</span>
                          <span className="block truncate text-[13px] text-ink-muted">
                            {m.family_name || m.email || m.phone_mobile || "No contact details"}
                          </span>
                        </span>
                        <span className="hidden flex-col items-end gap-1 sm:flex">
                          <MemberStatusBadge status={m.status} />
                          <span className="text-[12px] text-ink-subtle">Added {relativeTime(m.created_at)}</span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Card>

        <div className="flex flex-col gap-6 lg:col-span-5">
          <Card>
            <CardHeader title={`Birthdays in ${monthName}`} icon="cake" description="Members with a birthday this month" />
            <div className="px-5 pb-5">
              {birthdays.loading ? (
                <ListSkeleton rows={3} />
              ) : birthdays.error ? (
                <ErrorState compact message={birthdays.error} onRetry={birthdays.reload} />
              ) : !birthdays.data || birthdays.data.results.length === 0 ? (
                <p className="rounded-lg border border-dashed border-line px-4 py-6 text-center text-[13px] text-ink-muted">
                  No birthdays on record for {monthName}. Birthdays appear when a date of birth is saved on a profile.
                </p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {birthdays.data.results.map((m) => (
                    <li key={m.id}>
                      <Link
                        href={`/dashboard/members/${m.id}`}
                        className="flex items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1 pr-3 text-[13px] font-medium text-ink transition-colors hover:border-line-strong hover:bg-canvas"
                      >
                        <Avatar name={m.full_name} initials={initials(m.first_name, m.last_name)} src={m.photo} size={26} />
                        {m.full_name}
                      </Link>
                    </li>
                  ))}
                  {birthdays.data.count > birthdays.data.results.length && (
                    <li className="self-center text-[13px] text-ink-muted">
                      +{birthdays.data.count - birthdays.data.results.length} more
                    </li>
                  )}
                </ul>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Recent broadcasts"
              icon="campaign"
              actions={
                <Link href="/dashboard/communications" className="btn btn-link text-[13px]">
                  Open
                </Link>
              }
            />
            <div className="px-2 pb-3">
              {campaigns.loading ? (
                <ListSkeleton rows={2} />
              ) : campaigns.error ? (
                <ErrorState compact message={campaigns.error} onRetry={campaigns.reload} />
              ) : !campaigns.data || campaigns.data.results.length === 0 ? (
                <EmptyState compact icon="sms" title="No broadcasts yet" description="SMS and email broadcasts you create will be listed here." />
              ) : (
                <ul className="flex flex-col">
                  {campaigns.data.results.map((c) => (
                    <li key={c.id} className="flex items-center gap-3 rounded-lg px-3 py-2.5">
                      <span className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                        <Icon name={c.channel === "email" ? "mail" : "sms"} size={18} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink">{c.name}</span>
                        <span className="block text-[13px] text-ink-muted">
                          {c.channel.toUpperCase()} · {formatDate(c.created_at)}
                        </span>
                      </span>
                      <CampaignStatusBadge status={c.status} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ListSkeleton({ rows }: { rows: number }) {
  return (
    <div className="flex flex-col gap-1 px-3 py-1" aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-2">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
        </div>
      ))}
    </div>
  );
}
