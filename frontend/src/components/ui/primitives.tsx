"use client";

import Link from "next/link";
import React, { forwardRef } from "react";
import type { BadgeTone } from "@/lib/format";

/* ── Icon ─────────────────────────────────────────────────────────────── */
export function Icon({
  name,
  size = 20,
  className = "",
  filled = false,
  label,
}: {
  name: string;
  size?: number;
  className?: string;
  filled?: boolean;
  /** Provide only when the icon conveys meaning on its own. */
  label?: string;
}) {
  return (
    <span
      className={`material-symbols-outlined ${filled ? "icon-filled" : ""} ${className}`}
      style={{ fontSize: size }}
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      aria-label={label}
    >
      {name}
    </span>
  );
}

/* ── Spinner ──────────────────────────────────────────────────────────── */
export function Spinner({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      className={`inline-block rounded-full border-2 border-current border-t-transparent animate-spin ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    />
  );
}

/* ── Button ───────────────────────────────────────────────────────────── */
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "danger-ghost" | "link";
type ButtonSize = "md" | "sm" | "xs";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: string;
  iconRight?: string;
  loading?: boolean;
  /** Icon-only button; `aria-label` is required. */
  iconOnly?: boolean;
}

export function buttonClass(variant: ButtonVariant = "secondary", size: ButtonSize = "md", iconOnly = false) {
  return [
    "btn",
    `btn-${variant}`,
    size === "sm" ? "btn-sm" : size === "xs" ? "btn-xs" : "",
    iconOnly ? "btn-icon" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", icon, iconRight, loading, iconOnly, className = "", children, disabled, type = "button", ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${buttonClass(variant, size, iconOnly)} ${className}`}
      {...rest}
    >
      {loading ? <Spinner size={size === "xs" ? 12 : 14} /> : icon ? <Icon name={icon} /> : null}
      {children}
      {iconRight && !loading && <Icon name={iconRight} />}
    </button>
  );
});

export function ButtonLink({
  href,
  variant = "secondary",
  size = "md",
  icon,
  iconRight,
  className = "",
  children,
  ...rest
}: {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: string;
  iconRight?: string;
  className?: string;
  children: React.ReactNode;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  return (
    <Link href={href} className={`${buttonClass(variant, size)} ${className}`} {...rest}>
      {icon && <Icon name={icon} />}
      {children}
      {iconRight && <Icon name={iconRight} />}
    </Link>
  );
}

/* ── Badge ────────────────────────────────────────────────────────────── */
export function Badge({
  tone = "neutral",
  dot = false,
  icon,
  children,
  className = "",
}: {
  tone?: BadgeTone;
  dot?: boolean;
  icon?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={`badge badge-${tone} ${dot ? "badge-dot" : ""} ${className}`}>
      {icon && <Icon name={icon} size={14} />}
      {children}
    </span>
  );
}

/* ── Avatar ───────────────────────────────────────────────────────────── */
const AVATAR_TONES = [
  "bg-brand-soft text-brand",
  "bg-accent-soft text-accent-ink",
  "bg-success-soft text-success",
  "bg-[#f4f3ff] text-[#5925dc]",
  "bg-[#fdf2fa] text-[#c11574]",
  "bg-canvas text-ink-muted",
];

function toneFor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_TONES[h % AVATAR_TONES.length];
}

export function Avatar({
  name,
  initials,
  src,
  size = 36,
  className = "",
}: {
  name: string;
  initials: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" className={`rounded-full object-cover flex-shrink-0 ${className}`} style={{ width: size, height: size }} />;
  }
  return (
    <span
      aria-hidden
      className={`inline-flex items-center justify-center rounded-full font-semibold flex-shrink-0 ${toneFor(name)} ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(11, Math.round(size * 0.36)) }}
    >
      {initials}
    </span>
  );
}

/* ── Card ─────────────────────────────────────────────────────────────── */
export function Card({
  children,
  className = "",
  as: Tag = "div",
  ...rest
}: { children: React.ReactNode; className?: string; as?: React.ElementType } & React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag className={`card ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

export function CardHeader({
  title,
  description,
  icon,
  actions,
  className = "",
  id,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: string;
  actions?: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div className={`flex items-start justify-between gap-3 px-5 pt-5 pb-4 ${className}`}>
      <div className="flex items-start gap-3 min-w-0">
        {icon && (
          <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft text-brand flex-shrink-0">
            <Icon name={icon} size={18} />
          </span>
        )}
        <div className="min-w-0">
          <h2 id={id} className="text-[15px] font-semibold leading-6 text-ink">{title}</h2>
          {description && <p className="text-[13px] text-ink-muted mt-0.5">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
}

/* ── Page header ──────────────────────────────────────────────────────── */
export function PageHeader({
  title,
  description,
  actions,
  meta,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  meta?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold leading-8 tracking-tight text-ink">{title}</h1>
          {meta}
        </div>
        {description && <p className="mt-1 max-w-2xl text-sm text-ink-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">{actions}</div>}
    </div>
  );
}

/* ── Stat card ────────────────────────────────────────────────────────── */
export function StatCard({
  label,
  value,
  icon,
  hint,
  href,
  loading,
  tone = "brand",
}: {
  label: string;
  value: React.ReactNode;
  icon: string;
  hint?: React.ReactNode;
  href?: string;
  loading?: boolean;
  tone?: "brand" | "accent" | "success" | "neutral";
}) {
  const toneClass = {
    brand: "bg-brand-soft text-brand",
    accent: "bg-accent-soft text-accent-ink",
    success: "bg-success-soft text-success",
    neutral: "bg-canvas text-ink-muted",
  }[tone];

  const body = (
    <>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-medium text-ink-muted">{label}</span>
        <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${toneClass}`}>
          <Icon name={icon} size={20} />
        </span>
      </div>
      <div className="mt-3">
        {loading ? (
          <div className="skeleton h-8 w-24" />
        ) : (
          <div className="text-[28px] font-semibold leading-9 tracking-tight text-ink tabular-nums">{value}</div>
        )}
        {hint && !loading && <div className="mt-1 text-[13px] text-ink-muted">{hint}</div>}
      </div>
      {href && (
        <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-brand opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          View details <Icon name="arrow_forward" size={16} />
        </span>
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} className="card card-interactive group block p-5 animate-rise-in focus-visible:outline-offset-4">
        {body}
      </Link>
    );
  }
  return <div className="card p-5 animate-rise-in">{body}</div>;
}

/* ── Segmented control (tabs / filters) ───────────────────────────────── */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  size = "md",
}: {
  options: Array<{ value: T; label: string; count?: number; icon?: string }>;
  value: T;
  onChange: (v: T) => void;
  label: string;
  size?: "md" | "sm";
}) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex max-w-full items-center gap-1 overflow-x-auto no-scrollbar rounded-lg border border-line bg-surface-muted p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 font-medium transition-colors ${
              size === "sm" ? "h-7 text-[13px]" : "h-8 text-[13px]"
            } ${active ? "bg-surface text-ink shadow-[var(--shadow-card)]" : "text-ink-muted hover:text-ink"}`}
          >
            {o.icon && <Icon name={o.icon} size={16} />}
            {o.label}
            {o.count !== undefined && (
              <span className={`rounded-full px-1.5 text-[11px] tabular-nums ${active ? "bg-brand-soft text-brand" : "bg-line text-ink-muted"}`}>
                {o.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ── Search input ─────────────────────────────────────────────────────── */
export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  label = "Search",
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <Icon name="search" size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="control pl-9 pr-9"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-6 w-6 items-center justify-center rounded text-ink-subtle hover:text-ink"
        >
          <Icon name="close" size={16} />
        </button>
      )}
    </div>
  );
}

/* ── Pagination ───────────────────────────────────────────────────────── */
export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  noun = "results",
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (p: number) => void;
  noun?: string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className="flex flex-col gap-3 border-t border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[13px] text-ink-muted" aria-live="polite">
        {total === 0 ? `No ${noun}` : <>Showing <span className="font-medium text-ink">{from}–{to}</span> of <span className="font-medium text-ink">{total}</span> {noun}</>}
      </p>
      {pages > 1 && (
        <nav className="flex items-center gap-2" aria-label="Pagination">
          <Button size="sm" icon="chevron_left" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
            Previous
          </Button>
          <span className="text-[13px] text-ink-muted tabular-nums">
            Page {page} of {pages}
          </span>
          <Button size="sm" iconRight="chevron_right" onClick={() => onPageChange(page + 1)} disabled={page >= pages}>
            Next
          </Button>
        </nav>
      )}
    </div>
  );
}

/* ── Empty / error / loading states ───────────────────────────────────── */
export function EmptyState({
  icon = "inbox",
  title,
  description,
  action,
  compact = false,
}: {
  icon?: string;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? "px-4 py-8" : "px-6 py-14"}`}>
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface-muted text-ink-muted">
        <Icon name={icon} size={22} />
      </span>
      <h3 className="mt-3 text-[15px] font-semibold text-ink">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-[13px] text-ink-muted">{description}</p>}
      {action && <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
  compact = false,
}: {
  message: string;
  onRetry?: () => void;
  compact?: boolean;
}) {
  return (
    <div role="alert" className={`flex flex-col items-center justify-center text-center ${compact ? "px-4 py-8" : "px-6 py-14"}`}>
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-danger-line bg-danger-soft text-danger">
        <Icon name="error" size={22} />
      </span>
      <h3 className="mt-3 text-[15px] font-semibold text-ink">Couldn&apos;t load this data</h3>
      <p className="mt-1 max-w-sm text-[13px] text-ink-muted">{message}</p>
      {onRetry && (
        <Button size="sm" icon="refresh" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function Alert({
  tone = "danger",
  title,
  children,
  className = "",
}: {
  tone?: "danger" | "warning" | "info" | "success";
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const map = {
    danger: { cls: "border-danger-line bg-danger-soft text-danger", icon: "error" },
    warning: { cls: "border-warning-line bg-warning-soft text-warning", icon: "warning" },
    info: { cls: "border-[#cddcec] bg-brand-softer text-brand", icon: "info" },
    success: { cls: "border-success-line bg-success-soft text-success", icon: "check_circle" },
  }[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={`flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-[13px] ${map.cls} ${className}`}>
      <Icon name={map.icon} size={18} className="mt-px" />
      <div className="min-w-0 text-ink">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? "mt-0.5 text-ink-muted" : ""}>{children}</div>}
      </div>
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden />;
}

export function TableSkeleton({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="divide-y divide-line" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-4 py-3.5">
          <Skeleton className="h-9 w-9 rounded-full" />
          {Array.from({ length: cols }).map((__, c) => (
            <Skeleton key={c} className={`h-3.5 ${c === 0 ? "w-40" : "hidden w-24 sm:block"}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ── Description list (detail views) ──────────────────────────────────── */
export function DetailList({ items, columns = 2 }: { items: Array<{ label: string; value: React.ReactNode; icon?: string }>; columns?: 1 | 2 | 3 }) {
  const grid = columns === 1 ? "" : columns === 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3";
  return (
    <dl className={`grid grid-cols-1 gap-x-6 gap-y-4 ${grid}`}>
      {items.map((it) => (
        <div key={it.label} className="min-w-0">
          <dt className="flex items-center gap-1.5 text-[12px] font-medium text-ink-muted">
            {it.icon && <Icon name={it.icon} size={15} />}
            {it.label}
          </dt>
          <dd className="mt-0.5 break-words text-sm text-ink">{it.value || <span className="text-ink-subtle">—</span>}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ── Progress bar ─────────────────────────────────────────────────────── */
export function Progress({ value, label, tone = "brand" }: { value: number; label: string; tone?: "brand" | "success" | "accent" }) {
  const pct = Math.max(0, Math.min(100, value));
  const bar = { brand: "bg-brand", success: "bg-success", accent: "bg-accent" }[tone];
  return (
    <div role="progressbar" aria-label={label} aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} className="h-2 w-full overflow-hidden rounded-full bg-line">
      <div className={`h-full rounded-full ${bar} transition-[width] duration-500`} style={{ width: `${pct}%` }} />
    </div>
  );
}
