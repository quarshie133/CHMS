"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import type { ReactNode } from "react";

const nav = [
  { href: "/dashboard",                label: "Dashboard",      icon: "dashboard" },
  { href: "/dashboard/members",        label: "People",         icon: "group" },
  { href: "/dashboard/groups",         label: "Groups",         icon: "diversity_3" },
  { href: "/dashboard/attendance",     label: "Attendance",     icon: "fact_check" },
  { href: "/dashboard/communications", label: "Communication",  icon: "chat" },
  { href: "/dashboard/events",         label: "Events",         icon: "event" },
  { href: "/dashboard/finance",        label: "Finance",        icon: "payments" },
  { href: "/dashboard/roles",          label: "Roles & Access", icon: "admin_panel_settings" },
  { href: "/dashboard/profile",        label: "My Profile",     icon: "account_circle" },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#faf8ff" }}>
      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-[260px] flex flex-col sanctuary-sidebar
          transform transition-transform duration-300 ease-in-out
          lg:static lg:translate-x-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Logo */}
        <div className="h-20 px-4 flex items-center gap-3 border-b" style={{ borderColor: "rgba(226,231,255,0.3)" }}>
          {/* Real TLPCI Logo */}
          <div className="flex-shrink-0 w-12 h-12 rounded-full overflow-hidden shadow-md" style={{ border: "2px solid rgba(255,255,255,0.25)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/tlpci-logo.png" alt="TLPCI Logo" className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-sm leading-tight" style={{ color: "white" }}>TLPCI</span>
            <span className="text-[10px] leading-snug" style={{ color: "rgba(183,196,255,0.8)" }}>ChurchMS</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 flex flex-col gap-1">
          {nav.map((item) => {
            const active =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`sanctuary-nav-item ${active ? "active" : ""}`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Church footer */}
        <div className="p-3 border-t" style={{ borderColor: "rgba(226,231,255,0.2)" }}>
          <div
            className="flex items-center gap-2 p-2 rounded-lg"
            style={{ background: "rgba(255,255,255,0.08)" }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#c5a028" }}>church</span>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(183,196,255,0.6)" }}>Active Church</span>
              <span className="text-[11px] font-semibold truncate" style={{ color: "rgba(255,255,255,0.85)" }}>
                The Lord&apos;s Pentecostal Church Intl
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Main Content ──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header
          className="flex items-center gap-4 px-6 h-16 flex-shrink-0 border-b"
          style={{
            background: "rgba(255,255,255,0.9)",
            backdropFilter: "blur(16px)",
            borderColor: "#e2e7ff",
            boxShadow: "0 1px 8px rgba(0,0,0,0.04)",
          }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg transition-colors"
            style={{ color: "#747686" }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>menu</span>
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-sm" style={{ color: "#747686" }}>
            <span style={{ color: "#747686" }}>Home</span>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_right</span>
            <span className="font-semibold" style={{ color: "#131b2e" }}>
              {nav.find(n => n.href === pathname || (n.href !== "/dashboard" && pathname.startsWith(n.href)))?.label ?? "Dashboard"}
            </span>
          </div>

          <div className="flex-1" />

          {/* Search */}
          <div className="hidden md:flex items-center relative max-w-xs w-full">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2" style={{ fontSize: 18, color: "#747686" }}>search</span>
            <input
              type="search"
              placeholder="Search people, events…"
              className="sanctuary-input"
              style={{ paddingLeft: "2.25rem" }}
            />
          </div>

          {/* Notifications */}
          <button className="relative p-2 rounded-lg transition-colors" style={{ color: "#434655" }}>
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>notifications</span>
            <span
              className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full"
              style={{ background: "#ba1a1a", border: "2px solid white" }}
            />
          </button>

          {/* User */}
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/profile"
              className="flex items-center gap-2 p-1 rounded-xl hover:bg-[#eaedff] transition-colors group cursor-pointer"
              title="My Profile & Settings"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-xs"
                style={{ background: "#1d4ed8" }}
              >
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </div>
              <div className="hidden lg:flex flex-col text-left">
                <span className="text-xs font-semibold group-hover:text-primary transition-colors" style={{ color: "#131b2e" }}>
                  {user?.full_name ?? "Admin"}
                </span>
                <span className="text-[10px] capitalize" style={{ color: "#747686" }}>
                  {user?.role?.replace("_", " ") ?? "Staff"}
                </span>
              </div>
            </Link>
            <button
              onClick={logout}
              className="p-1.5 rounded-lg hover:bg-error-container/20 text-[#747686] hover:text-error transition-colors ml-0.5"
              title="Sign out"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto" style={{ background: "#faf8ff" }}>
          <div className="w-full max-w-[1440px] mx-auto px-6 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
