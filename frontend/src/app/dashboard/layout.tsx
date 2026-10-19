"use client";

import { useEffect, useRef, useState, type SyntheticEvent, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth, ADMIN_ROLES, STAFF_ROLES } from "@/lib/auth-context";
import { Alert, Avatar, Icon } from "@/components/ui/primitives";
import { initials, ROLE_LABELS } from "@/lib/format";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  roles?: string[];
}

const NAV_GROUPS: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "Overview",
    items: [{ href: "/dashboard", label: "Dashboard", icon: "space_dashboard" }],
  },
  {
    label: "People",
    items: [
      { href: "/dashboard/members", label: "People", icon: "group" },
      { href: "/dashboard/groups", label: "Groups", icon: "diversity_3" },
      { href: "/dashboard/attendance", label: "Attendance", icon: "fact_check" },
    ],
  },
  {
    label: "Ministry",
    items: [
      { href: "/dashboard/events", label: "Events", icon: "event" },
      { href: "/dashboard/sermons", label: "Sermons", icon: "auto_stories" },
      { href: "/dashboard/communications", label: "Communication", icon: "sms" },
    ],
  },
  {
    label: "Administration",
    items: [
      { href: "/dashboard/finance", label: "Finance", icon: "payments" },
      { href: "/dashboard/roles", label: "Roles & Access", icon: "admin_panel_settings", roles: ADMIN_ROLES },
    ],
  },
];

const ALL_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

function isActive(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === "/dashboard" : pathname === href || pathname.startsWith(`${href}/`);
}

/** Breadcrumb trail derived from the URL, e.g. People › Add person. */
function getBreadcrumbs(pathname: string) {
  const crumbs: Array<{ label: string; href?: string }> = [];
  const section = ALL_ITEMS.filter((i) => i.href !== "/dashboard").find((i) => isActive(pathname, i.href));
  if (pathname === "/dashboard/profile") return [{ label: "My profile" }];
  if (!section) return [{ label: "Dashboard" }];
  const rest = pathname.slice(section.href.length).split("/").filter(Boolean);
  crumbs.push({ label: section.label, href: rest.length ? section.href : undefined });
  if (rest[0] === "new") crumbs.push({ label: "Add person" });
  else if (rest[0]) crumbs.push({ label: "Profile" });
  return crumbs;
}

const COLLAPSE_KEY = "churchms:sidebar-collapsed";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, loading, isAuthenticated, hasRole } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  // Desktop collapse preference. The shell only renders after auth resolves on
  // the client, so reading storage here can't cause a hydration mismatch.
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return typeof window !== "undefined" && localStorage.getItem(COLLAPSE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const crumbs = getBreadcrumbs(pathname);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1");
      } catch {
        /* ignore */
      }
      return !c;
    });
  };

  // Auth guard: send signed-out visitors to the login page.
  useEffect(() => {
    if (!loading && !isAuthenticated) router.replace("/login");
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  if (loading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas" aria-busy="true">
        <div className="flex flex-col items-center gap-3 text-ink-muted">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" aria-hidden />
          <span className="text-sm">Loading your workspace…</span>
        </div>
      </div>
    );
  }

  const isStaff = hasRole(...STAFF_ROLES);

  return (
    <div className="flex h-dvh overflow-hidden bg-canvas">
      <a
        href="#main"
        className="sr-only z-[90] rounded-md bg-surface px-3 py-2 text-sm font-semibold text-brand shadow focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>

      {/* ── Desktop sidebar ───────────────────────────────────────────── */}
      <aside
        className={`hidden lg:flex flex-col flex-shrink-0 bg-nav transition-[width] duration-200 ease-out ${collapsed ? "w-[76px]" : "w-64"}`}
        aria-label="Primary"
      >
        <Sidebar collapsed={collapsed} pathname={pathname} hasRole={hasRole} onToggleCollapse={toggleCollapsed} />
      </aside>

      {/* ── Mobile drawer ─────────────────────────────────────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 bg-[#0b1220]/50 animate-fade-in" onClick={() => setMobileOpen(false)} aria-hidden />
          <aside className="relative flex h-full w-72 max-w-[85vw] flex-col bg-nav shadow-[var(--shadow-overlay)] animate-slide-in-left">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation"
              className="absolute right-3 top-4 inline-flex h-9 w-9 items-center justify-center rounded-lg text-nav-ink hover:bg-nav-hover hover:text-white"
            >
              <Icon name="close" />
            </button>
            <Sidebar collapsed={false} pathname={pathname} hasRole={hasRole} autoFocus onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* ── Main column ───────────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 flex-shrink-0 items-center gap-3 border-b border-line bg-surface/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-surface/80 sm:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
            aria-expanded={mobileOpen}
            className="-ml-1 inline-flex h-10 w-10 items-center justify-center rounded-lg text-ink-muted hover:bg-canvas hover:text-ink lg:hidden"
          >
            <Icon name="menu" size={22} />
          </button>

          <nav aria-label="Breadcrumb" className="min-w-0">
            <ol className="flex min-w-0 items-center gap-1.5 text-sm">
              <li className="hidden sm:block">
                <Link href="/dashboard" className="text-ink-muted hover:text-ink">
                  Home
                </Link>
              </li>
              {crumbs.map((c, i) => (
                <li key={i} className="flex min-w-0 items-center gap-1.5">
                  <Icon name="chevron_right" size={16} className={`text-ink-subtle ${i === 0 ? "hidden sm:inline-block" : ""}`} />
                  {c.href ? (
                    <Link href={c.href} className="truncate text-ink-muted hover:text-ink">
                      {c.label}
                    </Link>
                  ) : (
                    <span className="truncate font-semibold text-ink" aria-current="page">
                      {c.label}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </nav>

          <div className="flex-1" />

          {isStaff && <GlobalSearch />}

          <UserMenu
            name={user?.full_name || "Account"}
            email={user?.email || ""}
            role={ROLE_LABELS[user?.role ?? ""] ?? user?.role ?? ""}
            initialsText={initials(user?.first_name, user?.last_name)}
            onLogout={logout}
          />
        </header>

        <main id="main" className="flex-1 overflow-y-auto" tabIndex={-1}>
          <div key={pathname} className="mx-auto w-full max-w-[1400px] px-4 py-6 animate-rise-in sm:px-6 lg:px-8 lg:py-8">
            {!isStaff && (
              <Alert tone="warning" title="Limited access" className="mb-6">
                Your account role ({ROLE_LABELS[user?.role ?? ""] ?? user?.role}) doesn&apos;t include staff access, so most church records
                can&apos;t be shown. Ask a church administrator to update your role if you need access.
              </Alert>
            )}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────── */

function Sidebar({
  collapsed,
  pathname,
  hasRole,
  onToggleCollapse,
  autoFocus,
  onNavigate,
}: {
  collapsed: boolean;
  pathname: string;
  hasRole: (...roles: string[]) => boolean;
  onToggleCollapse?: () => void;
  autoFocus?: boolean;
  onNavigate?: () => void;
}) {
  const firstLink = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    if (autoFocus) firstLink.current?.focus();
  }, [autoFocus]);

  let linkIndex = 0;

  return (
    <>
      <div className={`flex h-16 flex-shrink-0 items-center gap-3 border-b border-nav-line ${collapsed ? "justify-center px-2" : "px-5"}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/tlpci-logo.png" alt="" className="h-9 w-9 flex-shrink-0 rounded-full bg-white object-cover ring-2 ring-white/10" />
        {!collapsed && (
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold text-white">TLPCI ChurchMS</p>
            <p className="truncate text-[12px] text-nav-ink">Ministry workspace</p>
          </div>
        )}
      </div>

      <nav className={`flex-1 overflow-y-auto py-4 ${collapsed ? "px-3" : "px-4"}`} aria-label="Main navigation">
        {NAV_GROUPS.map((group) => {
          const items = group.items.filter((i) => !i.roles || hasRole(...i.roles));
          if (items.length === 0) return null;
          return (
            <div key={group.label} className="mb-5 last:mb-0">
              {collapsed ? (
                <div className="mx-auto mb-2 h-px w-6 bg-nav-line" aria-hidden />
              ) : (
                <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#7f93ad]">{group.label}</p>
              )}
              <ul className="flex flex-col gap-0.5">
                {items.map((item) => {
                  const active = isActive(pathname, item.href);
                  const isFirst = linkIndex++ === 0;
                  return (
                    <li key={item.href}>
                      <Link
                        ref={isFirst ? firstLink : undefined}
                        href={item.href}
                        onClick={onNavigate}
                        aria-current={active ? "page" : undefined}
                        title={collapsed ? item.label : undefined}
                        className={`nav-item ${collapsed ? "justify-center px-0" : ""}`}
                      >
                        <Icon name={item.icon} size={20} filled={active} />
                        {collapsed ? <span className="sr-only">{item.label}</span> : <span className="truncate">{item.label}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className={`flex-shrink-0 border-t border-nav-line p-3 ${collapsed ? "flex justify-center" : ""}`}>
        {onToggleCollapse ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`nav-item w-full ${collapsed ? "justify-center px-0" : ""}`}
          >
            <Icon name={collapsed ? "left_panel_open" : "left_panel_close"} />
            {!collapsed && <span>Collapse</span>}
          </button>
        ) : (
          <div className="flex items-center gap-2 px-2 py-1 text-[12px] text-nav-ink">
            <Icon name="church" size={18} className="text-accent" />
            <span className="truncate">The Lord&apos;s Pentecostal Church Intl</span>
          </div>
        )}
      </div>
    </>
  );
}

function GlobalSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const submit = (e: SyntheticEvent) => {
    e.preventDefault();
    const term = q.trim();
    router.push(term ? `/dashboard/members?q=${encodeURIComponent(term)}` : "/dashboard/members");
    setQ("");
  };
  return (
    <form role="search" onSubmit={submit} className="relative hidden w-full max-w-xs md:block">
      <Icon name="search" size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search people…"
        aria-label="Search people by name, email or phone"
        className="control control-sm bg-surface-muted pl-9"
      />
    </form>
  );
}

function UserMenu({
  name,
  email,
  role,
  initialsText,
  onLogout,
}: {
  name: string;
  email: string;
  role: string;
  initialsText: string;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    ref.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus();
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${name}`}
        className="flex items-center gap-2.5 rounded-lg p-1 pr-1.5 transition-colors hover:bg-canvas"
      >
        <Avatar name={name} initials={initialsText} size={32} />
        <span className="hidden text-left leading-tight xl:block">
          <span className="block max-w-[160px] truncate text-[13px] font-semibold text-ink">{name}</span>
          <span className="block text-[12px] text-ink-muted">{role}</span>
        </span>
        <Icon name="expand_more" size={18} className="hidden text-ink-subtle xl:inline-block" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Account"
          className="absolute right-0 top-full z-40 mt-2 w-64 origin-top-right overflow-hidden rounded-xl border border-line bg-surface shadow-[var(--shadow-overlay)] animate-scale-in"
        >
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-sm font-semibold text-ink">{name}</p>
            <p className="truncate text-[13px] text-ink-muted">{email}</p>
            <span className="badge badge-brand mt-2">{role}</span>
          </div>
          <div className="p-1.5">
            <Link
              role="menuitem"
              href="/dashboard/profile"
              onClick={() => setOpen(false)}
              className="flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm text-ink hover:bg-canvas focus:bg-canvas"
            >
              <Icon name="account_circle" size={18} className="text-ink-muted" />
              My profile
            </Link>
            <button
              role="menuitem"
              type="button"
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              className="flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-sm text-danger hover:bg-danger-soft focus:bg-danger-soft"
            >
              <Icon name="logout" size={18} />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
