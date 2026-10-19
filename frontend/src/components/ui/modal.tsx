"use client";

import React, { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { Button, Icon } from "./primitives";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | string;
  children: React.ReactNode;
  /** Sticky action row. Put the primary action last. */
  footer?: React.ReactNode;
  /** While true, the dialog cannot be dismissed (request in flight). */
  isSubmitting?: boolean;
  /** "dialog" is centered; "drawer" slides in from the right for record details. */
  variant?: "dialog" | "drawer";
}

const MAX_WIDTHS: Record<string, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-xl",
  "2xl": "sm:max-w-2xl",
};

// Only the top-most open dialog reacts to Escape / owns focus.
const stack: string[] = [];

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  maxWidth = "md",
  children,
  footer,
  isSubmitting = false,
  variant = "dialog",
}: ModalProps) {
  const id = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const submittingRef = useRef(isSubmitting);
  useEffect(() => {
    onCloseRef.current = onClose;
    submittingRef.current = isSubmitting;
  });

  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    stack.push(id);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Move focus into the dialog: first form field, otherwise the panel.
    const t = window.setTimeout(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const body = panel.querySelector<HTMLElement>("[data-modal-body]");
      const first = body?.querySelector<HTMLElement>("input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled])");
      (first ?? panel).focus();
    }, 20);

    const onKey = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== id) return;
      if (e.key === "Escape") {
        if (!submittingRef.current) {
          e.stopPropagation();
          onCloseRef.current();
        }
      } else if (e.key === "Tab" && panelRef.current) {
        const nodes = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((n) => n.offsetParent !== null);
        if (nodes.length === 0) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);

    return () => {
      window.clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      const i = stack.lastIndexOf(id);
      if (i >= 0) stack.splice(i, 1);
      if (stack.length === 0) document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [isOpen, id]);

  if (!isOpen || typeof document === "undefined") return null;

  const isDrawer = variant === "drawer";
  const widthClass = MAX_WIDTHS[maxWidth] || maxWidth;

  const dialog = (
    <div
      className={`fixed inset-0 z-[60] flex ${isDrawer ? "justify-end" : "items-end justify-center sm:items-center sm:p-6"}`}
      role="presentation"
    >
      <div
        className="absolute inset-0 bg-[#0b1220]/50 backdrop-blur-[2px] animate-fade-in"
        aria-hidden
        onClick={() => !isSubmitting && onClose()}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={subtitle ? `${id}-desc` : undefined}
        tabIndex={-1}
        className={
          isDrawer
            ? `relative flex h-full w-full ${widthClass || "sm:max-w-lg"} flex-col bg-surface shadow-[var(--shadow-overlay)] outline-none animate-slide-in-right`
            : `relative flex w-full ${widthClass} max-h-[92dvh] flex-col overflow-hidden rounded-t-[var(--radius-dialog)] border border-line bg-surface shadow-[var(--shadow-overlay)] outline-none animate-scale-in sm:max-h-[calc(100dvh-3rem)] sm:rounded-[var(--radius-dialog)]`
        }
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 id={`${id}-title`} className="text-base font-semibold leading-6 text-ink">
              {title}
            </h2>
            {subtitle && (
              <p id={`${id}-desc`} className="mt-0.5 text-[13px] text-ink-muted">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close dialog"
            className="-mr-1.5 -mt-0.5 inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-canvas hover:text-ink disabled:opacity-40"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        <div data-modal-body className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {children}
        </div>

        {footer && (
          <div className="flex flex-col-reverse gap-2 border-t border-line bg-surface-muted px-5 py-3.5 sm:flex-row sm:items-center sm:justify-end sm:px-6">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
}

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  variant?: "danger" | "warning" | "info";
  isLoading?: boolean;
  icon?: string;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Delete",
  cancelText = "Cancel",
  isDestructive = true,
  variant,
  isLoading = false,
  icon,
}: ConfirmDialogProps) {
  const tone = variant ?? (isDestructive ? "danger" : "info");
  const iconName = icon ?? (tone === "danger" ? "delete" : tone === "warning" ? "warning" : "help");
  const iconCls =
    tone === "danger"
      ? "bg-danger-soft text-danger"
      : tone === "warning"
        ? "bg-warning-soft text-warning"
        : "bg-brand-soft text-brand";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="md"
      isSubmitting={isLoading}
      footer={
        <>
          <Button onClick={onClose} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button variant={tone === "danger" ? "danger" : "primary"} onClick={onConfirm} loading={isLoading}>
            {isLoading ? "Working…" : confirmText}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-4">
        <span className={`inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${iconCls}`}>
          <Icon name={iconName} size={20} />
        </span>
        <div className="pt-1.5 text-sm leading-relaxed text-ink-muted">{message}</div>
      </div>
    </Modal>
  );
}
