"use client";

import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { Icon } from "./primitives";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextValue {
  toasts: ToastItem[];
  showToast: (toast: Omit<ToastItem, "id">) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const STYLES: Record<ToastType, { icon: string; iconCls: string }> = {
  success: { icon: "check_circle", iconCls: "text-success" },
  error: { icon: "error", iconCls: "text-danger" },
  warning: { icon: "warning", iconCls: "text-warning" },
  info: { icon: "info", iconCls: "text-brand" },
};

const MAX_VISIBLE = 4;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<string, number>());

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) window.clearTimeout(timer);
    timers.current.delete(id);
  }, []);

  const showToast = useCallback(
    ({ type, title, message }: Omit<ToastItem, "id">) => {
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      setToasts((prev) => {
        // Avoid stacking identical messages (e.g. repeated failed retries).
        const withoutDupes = prev.filter((t) => !(t.type === type && t.title === title && t.message === message));
        return [...withoutDupes, { id, type, title, message }].slice(-MAX_VISIBLE);
      });
      const ttl = type === "error" ? 7000 : 4500;
      timers.current.set(id, window.setTimeout(() => removeToast(id), ttl));
    },
    [removeToast]
  );

  const success = useCallback((title: string, message?: string) => showToast({ type: "success", title, message }), [showToast]);
  const error = useCallback((title: string, message?: string) => showToast({ type: "error", title, message }), [showToast]);
  const info = useCallback((title: string, message?: string) => showToast({ type: "info", title, message }), [showToast]);
  const warning = useCallback((title: string, message?: string) => showToast({ type: "warning", title, message }), [showToast]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, success, error, info, warning, removeToast }}>
      {children}
      <div
        aria-live="polite"
        aria-relevant="additions"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[80] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0 sm:items-end sm:p-6"
      >
        {toasts.map((t) => {
          const s = STYLES[t.type];
          return (
            <div
              key={t.id}
              role={t.type === "error" ? "alert" : "status"}
              className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-line bg-surface p-3.5 shadow-[var(--shadow-overlay)] animate-toast-in"
            >
              <Icon name={s.icon} size={20} filled className={`mt-px ${s.iconCls}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-5 text-ink">{t.title}</p>
                {t.message && <p className="mt-0.5 text-[13px] leading-5 text-ink-muted">{t.message}</p>}
              </div>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                aria-label="Dismiss notification"
                className="-mr-1 -mt-1 inline-flex h-7 w-7 items-center justify-center rounded-md text-ink-subtle transition-colors hover:bg-canvas hover:text-ink"
              >
                <Icon name="close" size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
