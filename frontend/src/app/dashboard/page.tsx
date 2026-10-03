"use client";

import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="flex flex-col w-full px-6 py-6 gap-6 max-w-[1440px] mx-auto">

      {/* ── Header: Greeting & Setup Progress ── */}
      <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-xl shadow-sm" style={{ boxShadow: "0 1px 3px rgba(15,23,42,0.05)" }}>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1 mb-1" style={{ color: "#0037b0", fontSize: 12, fontWeight: 600, letterSpacing: "0.02em", textTransform: "uppercase" }}>
            <span className="inline-block w-2 h-2 rounded-full animate-pulse" style={{ background: "#006b2c" }}></span>
            <span>TLPCI Ministry Portal</span>
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 600, color: "#131b2e", letterSpacing: "-0.015em", lineHeight: "38px" }}>Welcome to TLPCI Central</h1>
          <p style={{ fontSize: 14, color: "#434655", marginTop: 2 }}>Here is an overview of what is happening across your congregation today</p>
        </div>
        <div className="flex items-center gap-4 self-start lg:self-auto px-4 py-3 rounded-xl" style={{ background: "#f2f3ff" }}>
          <div className="flex flex-col gap-1 w-44">
            <div className="flex justify-between items-center" style={{ color: "#131b2e" }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>Church Setup</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#0037b0" }}>60%</span>
            </div>
            <div className="w-full rounded-full h-2 overflow-hidden" style={{ background: "#dae2fd" }}>
              <div className="h-full rounded-full transition-all duration-500" style={{ width: "60%", background: "#1d4ed8" }} />
            </div>
          </div>
          <Link href="/dashboard/roles" className="flex items-center gap-0.5 group" style={{ fontSize: 12, fontWeight: 600, color: "#0037b0" }}>
            <span>Resume Setup</span>
            <span className="material-symbols-outlined group-hover:translate-x-0.5 transition-transform" style={{ fontSize: 16 }}>arrow_forward</span>
          </Link>
        </div>
      </section>

      {/* ── Quick Actions ── */}
      <section className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/dashboard/members/new" className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold transition-all active:scale-95" style={{ background: "#1d4ed8", color: "#ffffff", fontSize: 14 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>person_add</span>
            <span>Add Person</span>
          </Link>
          <Link href="/dashboard/events" className="flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all" style={{ background: "#ffffff", color: "#131b2e", fontSize: 14, fontWeight: 600, border: "1px solid #e2e7ff" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#747686" }}>calendar_today</span>
            <span>Create Event</span>
          </Link>
          <Link href="/dashboard/communications" className="flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all" style={{ background: "#ffffff", color: "#131b2e", fontSize: 14, fontWeight: 600, border: "1px solid #e2e7ff" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#747686" }}>send</span>
            <span>Send Message</span>
          </Link>
          <Link href="/dashboard/finance" className="flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all" style={{ background: "#ffffff", color: "#131b2e", fontSize: 14, fontWeight: 600, border: "1px solid #e2e7ff" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#855300" }}>volunteer_activism</span>
            <span>Record Giving</span>
          </Link>
        </div>
        <div className="hidden sm:flex items-center gap-1" style={{ color: "#747686", fontSize: 12 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>update</span>
          <span>Synced 3 mins ago</span>
        </div>
      </section>

      {/* ── Stat Cards ── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Families", value: "54", delta: "+3 this month", deltaColor: "#00501f", icon: "cottage", iconBg: "rgba(220,225,255,0.4)", iconColor: "#0037b0" },
          { label: "Total People", value: "206", delta: "+12 this month", deltaColor: "#00501f", icon: "group", iconBg: "rgba(127,252,151,0.4)", iconColor: "#006b2c" },
          { label: "Groups", value: "12", sub: "4 meeting today", subColor: "#855300", icon: "diversity_3", iconBg: "rgba(255,221,184,0.5)", iconColor: "#855300" },
          { label: "Sunday School", value: "6", sub: "85 enrolled", subColor: "#747686", icon: "school", iconBg: "#dae2fd", iconColor: "#1d4ed8" },
          { label: "Check-ins", value: "12", sub: "Active service", subColor: "#006b2c", icon: "how_to_reg", iconBg: "rgba(127,252,151,0.6)", iconColor: "#00501f" },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-xl p-4 flex flex-col justify-between hover:shadow-md transition-shadow" style={{ boxShadow: "0 1px 3px rgba(15,23,42,0.05)" }}>
            <div className="flex items-center justify-between">
              <span style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.02em", color: "#747686" }}>{card.label}</span>
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: card.iconBg }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: card.iconColor }}>{card.icon}</span>
              </div>
            </div>
            <div className="mt-3">
              <div style={{ fontSize: 28, fontWeight: 700, color: "#131b2e", letterSpacing: "-0.02em" }}>{card.value}</div>
              {card.delta && (
                <div className="flex items-center gap-1 mt-1" style={{ color: card.deltaColor, fontSize: 11, fontWeight: 600 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>trending_up</span>
                  <span>{card.delta}</span>
                </div>
              )}
              {card.sub && (
                <div className="flex items-center gap-1 mt-1" style={{ color: card.subColor, fontSize: 11, fontWeight: 600 }}>
                  <span>{card.sub}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </section>

      {/* ── Today's Events Table ── */}
      <section className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(15,23,42,0.05)" }}>
        <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(220,225,255,0.5)" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#0037b0" }}>event_note</span>
            </div>
            <div className="flex items-center gap-2">
              <h2 style={{ fontSize: 18, fontWeight: 600, color: "#131b2e" }}>Today&apos;s Events</h2>
              <span className="px-2 py-0.5 rounded-full" style={{ background: "#7ffc97", color: "#00501f", fontSize: 11, fontWeight: 700, letterSpacing: "0.03em" }}>ACTIVE</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden md:inline" style={{ fontSize: 13, color: "#747686" }}>2 sessions scheduled today</span>
            <Link href="/dashboard/attendance" className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{ background: "#1d4ed8", color: "#ffffff", fontSize: 14, fontWeight: 600 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>sensors</span>
              <span>Live Check-in</span>
            </Link>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr style={{ background: "#f2f3ff", fontSize: 12, fontWeight: 600, color: "#747686", textTransform: "uppercase", letterSpacing: "0.02em" }}>
                <th className="py-3 px-6">Event Name</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Attendance / Capacity</th>
                <th className="py-3 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: "Midweek Prayer Meeting", leader: "Lead Pastor Grace Miller", type: "Prayer", typeBg: "#dae2fd", typeColor: "#1d4ed8", time: "10:00 AM - 11:30 AM", location: "Chapel A", count: 38, cap: 50, pct: 76, barColor: "#006b2c", pctColor: "#00501f", icon: "church", iconColor: "#1d4ed8" },
                { name: "Adult Bible Study - Book of Romans", leader: "Elder Thomas Wright", type: "Study", typeBg: "#ffddb8", typeColor: "#855300", time: "06:30 PM - 08:00 PM", location: "Fellowship Hall", count: 24, cap: 40, pct: 60, barColor: "#fea619", pctColor: "#855300", icon: "menu_book", iconColor: "#855300" },
              ].map((evt) => (
                <tr key={evt.name} className="hover:bg-[#f2f3ff]/60 transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "#eaedff" }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 20, color: evt.iconColor }}>{evt.icon}</span>
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#131b2e" }}>{evt.name}</div>
                        <div style={{ fontSize: 13, color: "#747686" }}>{evt.leader}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="px-2.5 py-1 rounded-full" style={{ background: evt.typeBg, color: evt.typeColor, fontSize: 11, fontWeight: 600 }}>{evt.type}</span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-1.5" style={{ color: "#131b2e" }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#747686" }}>schedule</span>
                      <span style={{ fontSize: 13 }}>{evt.time}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#747686" }}>room</span>
                      <span style={{ fontSize: 13, color: "#131b2e" }}>{evt.location}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex flex-col gap-1 max-w-[160px]">
                      <div className="flex justify-between" style={{ fontSize: 11, fontWeight: 600 }}>
                        <span style={{ color: "#131b2e" }}>{evt.count} / {evt.cap}</span>
                        <span style={{ color: evt.pctColor, fontWeight: 700 }}>{evt.pct}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "#eaedff" }}>
                        <div className="h-full rounded-full" style={{ width: `${evt.pct}%`, background: evt.barColor }} />
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button className="px-3 py-1.5 rounded-lg transition-colors" style={{ background: "#eaedff", color: "#0037b0", fontSize: 12, fontWeight: 600 }}>Check-in</button>
                      <button className="p-1.5 rounded-lg transition-colors" style={{ color: "#747686" }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>more_vert</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Two-Column Bottom ── */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* People Directory */}
        <div className="lg:col-span-7 bg-white rounded-xl shadow-sm flex flex-col overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(15,23,42,0.05)" }}>
          <div className="p-6 pb-0 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#e2e7ff" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#1d4ed8" }}>groups</span>
                </div>
                <h2 style={{ fontSize: 18, fontWeight: 600, color: "#131b2e" }}>People Directory</h2>
              </div>
              <Link href="/dashboard/members" className="flex items-center gap-1" style={{ fontSize: 12, fontWeight: 600, color: "#0037b0" }}>
                <span>View All</span>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_right</span>
              </Link>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              {["Latest Families", "Updated Families", "Latest People", "Updated People"].map((tab, i) => (
                <button key={tab} className="px-4 py-2 rounded-lg whitespace-nowrap" style={{ background: i === 0 ? "#1d4ed8" : "transparent", color: i === 0 ? "#ffffff" : "#434655", fontSize: 12, fontWeight: i === 0 ? 600 : 400 }}>
                  {tab}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left">
              <thead>
                <tr style={{ background: "#f2f3ff", fontSize: 12, fontWeight: 600, color: "#747686", textTransform: "uppercase", letterSpacing: "0.02em" }}>
                  <th className="py-2.5 px-6">Family / Member</th>
                  <th className="py-2.5 px-4">Role</th>
                  <th className="py-2.5 px-4">Contact / Area</th>
                  <th className="py-2.5 px-4">Added Date</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { initials: "AF", name: "The Anderson Family", sub: "4 Members", role: "Active Member", roleBg: "#dae2fd", roleColor: "#1d4ed8", contact: "anderson.fam@mail.com", area: "North District", date: "Oct 18, 2024", hasAvatar: false },
                  { avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuAx-qVPrk7IAoJ46iR10ErdE7dCQtlo79f4z0it3kQMeVQ6oc8_NbK0fZnU0IptYcKElEPD-FD-E5FJTNidq1wGNVAhHXePtSm9EI95p5zxBa-oSHpnUQLM65er1OjzbkgGDtdsjLRoKz7v-0qCRsam9KV8b33EhMvzPm1M1FcpBOh4kQsE9f9rK-g9mfbDo9_a3un2sa4yA5HFFpnt9ptpqKGk3zJ5Q82xewaQ9wDCRE5wZEMHjYFeWQ", name: "Marcus & Elena Sterling", sub: "Couple / Parents", role: "Small Group Leader", roleBg: "#7ffc97", roleColor: "#00501f", contact: "(555) 234-8901", area: "West End Branch", date: "Oct 15, 2024", hasAvatar: true },
                  { avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuAVVrjVyPTCTYhb0GiCQ3GeuTWf6gd6_ByR-xB-1ovGlDz04hbIqdXYILlq54w2Enhs3QQvBMfJarQHV5MOJDXDWx-PO4M6DyQUYLg20CGBp63_Uzn_XZzO7RqXjovDJDqliyxK9h_lvFAwwyWF3m23U1Dw7Ti9PUbmYe9P0bUtZl1FyusAq7-sKQmahgnkCQx-nvsUyOSqxd_fJ4UDG_H4qkCGCTC28y9oc7udFdcYfPoBmZZMlLA7zA", name: "Sarah Jenkins", sub: "Sunday School Teacher", role: "Volunteer", roleBg: "#ffddb8", roleColor: "#855300", contact: "sarah.j@outlook.com", area: "Oakridge Valley", date: "Oct 12, 2024", hasAvatar: true },
                  { initials: "DO", name: "David K. Osei", sub: "Individual / Visitor", role: "New Guest", roleBg: "#eaedff", roleColor: "#434655", contact: "(555) 890-4421", area: "Downtown Center", date: "Oct 10, 2024", hasAvatar: false },
                ].map((person) => (
                  <tr key={person.name} className="hover:bg-[#f2f3ff]/60 transition-colors">
                    <td className="py-3 px-6">
                      <div className="flex items-center gap-3">
                        {person.hasAvatar
                          ? <img className="w-9 h-9 rounded-full object-cover flex-shrink-0" src={person.avatar} alt={person.name} />
                          : <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold flex-shrink-0" style={{ background: "#dce1ff", color: "#001551", fontSize: 13 }}>{person.initials}</div>
                        }
                        <div className="min-w-0">
                          <span className="block truncate" style={{ fontSize: 14, fontWeight: 600, color: "#131b2e" }}>{person.name}</span>
                          <span style={{ fontSize: 11, color: "#747686" }}>{person.sub}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-0.5 rounded-full" style={{ background: person.roleBg, color: person.roleColor, fontSize: 11, fontWeight: 600 }}>{person.role}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div style={{ fontSize: 13, color: "#131b2e" }}>{person.contact}</div>
                      <div style={{ fontSize: 11, color: "#747686" }}>{person.area}</div>
                    </td>
                    <td className="py-3 px-4" style={{ fontSize: 13, color: "#747686" }}>{person.date}</td>
                    <td className="py-3 px-4 text-right">
                      <button className="p-1 rounded-lg transition-colors" style={{ color: "#747686" }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>more_vert</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 text-center border-t mt-auto" style={{ borderColor: "#f2f3ff" }}>
            <button style={{ fontSize: 12, fontWeight: 600, color: "#0037b0" }}>
              Load More Families & Members (50 remaining)
            </button>
          </div>
        </div>

        {/* Right Column: Birthdays + Giving */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Birthdays */}
          <div className="bg-white rounded-xl p-6 shadow-sm flex flex-col" style={{ boxShadow: "0 1px 3px rgba(15,23,42,0.05)" }}>
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,221,184,0.5)" }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#855300" }}>cake</span>
                </div>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 600, color: "#131b2e" }}>Birthdays</h3>
                  <p style={{ fontSize: 11, color: "#747686" }}>Past & next 7 days</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full" style={{ background: "#f2f3ff", color: "#855300", fontSize: 12, fontWeight: 700 }}>3 Upcoming</span>
            </div>
            <div className="flex flex-col gap-3 mt-2">
              {[
                { avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuDJmkC5KYNiq4jB7vD8x3SO18uvyguWoxQ_VW7zH1Z-pN-0THDPwH6qOYBz20pBZKDgBQ6tDG6DCjfzEK81kgsH5pWTY-IcCnTYpIEC41DegBnhGXG6MYAeRo3Z_-p8poFxeb7CCmpYki2S2QsJ95PJLDQxOnSRoOVZU4f2mKm-W97pYhIenbt05gC-PXgYVuJnor72Wiv_Y_Ra5V3ZvX794B63Ff6uB-MbKZk2TlrKVUqV1d4QQ57eWg", name: "Jonathan Reed", detail: "Turning 35 years old", when: "Today", whenBg: "#fea619", whenColor: "#684000", hasAvatar: true },
                { initials: "CM", name: "Clara Morales", detail: "Turning 62 years old", when: "Tomorrow", whenBg: "#e2e7ff", whenColor: "#131b2e", hasAvatar: false, initBg: "#dce1ff", initColor: "#0037b0" },
                { initials: "EW", name: "Ethan Wright", detail: "Youth Ministry • Turning 16", when: "Oct 24", whenBg: "#eaedff", whenColor: "#747686", hasAvatar: false, initBg: "#7ffc97", initColor: "#00501f" },
              ].map((b) => (
                <div key={b.name} className="flex items-center justify-between gap-2 p-2 rounded-lg" style={{ background: "#f2f3ff50" }}>
                  <div className="flex items-center gap-3 min-w-0">
                    {b.hasAvatar
                      ? <img className="w-10 h-10 rounded-full object-cover flex-shrink-0" src={b.avatar} alt={b.name} />
                      : <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0" style={{ background: b.initBg, color: b.initColor, fontSize: 14 }}>{b.initials}</div>
                    }
                    <div className="min-w-0">
                      <div className="truncate" style={{ fontSize: 14, fontWeight: 600, color: "#131b2e" }}>{b.name}</div>
                      <div style={{ fontSize: 11, color: "#855300", fontWeight: 600 }}>{b.detail}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="px-2 py-1 rounded-md" style={{ background: b.whenBg, color: b.whenColor, fontSize: 11, fontWeight: 700 }}>{b.when}</span>
                    <button className="p-1.5 rounded-lg" style={{ background: "#ffffff", color: "#0037b0" }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>sms</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Giving Snapshot */}
          <div className="bg-white rounded-xl p-6 shadow-sm flex flex-col justify-between" style={{ boxShadow: "0 1px 3px rgba(15,23,42,0.05)" }}>
            <div>
              <div className="flex items-center justify-between pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(127,252,151,0.4)" }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 20, color: "#006b2c" }}>account_balance_wallet</span>
                  </div>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 600, color: "#131b2e" }}>Giving Snapshot</h3>
                    <p style={{ fontSize: 11, color: "#747686" }}>Month-to-date target</p>
                  </div>
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#006b2c" }}>76.1%</span>
              </div>
              <div className="mt-4">
                <div className="flex items-baseline justify-between mb-1.5">
                  <div className="flex items-baseline gap-1.5">
                    <span style={{ fontSize: 28, fontWeight: 800, color: "#131b2e", letterSpacing: "-0.02em" }}>$34,250</span>
                    <span style={{ fontSize: 13, color: "#747686" }}>raised</span>
                  </div>
                  <span style={{ fontSize: 12, color: "#747686" }}>Goal: $45,000</span>
                </div>
                <div className="w-full rounded-full h-3 overflow-hidden p-0.5" style={{ background: "#eaedff" }}>
                  <div className="h-full rounded-full" style={{ width: "76.1%", background: "#006b2c" }} />
                </div>
              </div>
              <div className="mt-4 pt-4 p-4 rounded-lg" style={{ background: "rgba(242,243,255,0.4)" }}>
                <div className="flex items-center justify-between mb-2">
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#131b2e" }}>Fund Allocation</span>
                  <span style={{ fontSize: 11, color: "#747686" }}>Active Campaign</span>
                </div>
                <div className="w-full h-2.5 rounded-full overflow-hidden flex" style={{ background: "#eaedff" }}>
                  <div style={{ width: "65%", background: "#1d4ed8" }} />
                  <div style={{ width: "20%", background: "#fea619" }} />
                  <div style={{ width: "15%", background: "#00501f" }} />
                </div>
                <div className="flex items-center justify-between mt-3 text-xs">
                  {[{ color: "#1d4ed8", label: "Tithes", pct: "65%" }, { color: "#fea619", label: "Missions", pct: "20%" }, { color: "#00501f", label: "Building", pct: "15%" }].map(l => (
                    <div key={l.label} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: l.color }} />
                      <span style={{ fontSize: 11, color: "#131b2e" }}>{l.label} <strong>{l.pct}</strong></span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4 pt-2 flex justify-end">
              <Link className="flex items-center gap-1 group" style={{ fontSize: 12, fontWeight: 600, color: "#0037b0" }} href="/dashboard/finance">
                <span>View Finance Overview</span>
                <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform" style={{ fontSize: 16 }}>arrow_forward</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
