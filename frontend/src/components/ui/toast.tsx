"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

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
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({ type, title, message }: Omit<ToastItem, "id">) => {
      const id = Date.now().toString() + Math.random().toString(36).substring(2, 6);
      setToasts((prev) => [...prev, { id, type, title, message }]);
      setTimeout(() => {
        removeToast(id);
      }, 4200);
    },
    [removeToast]
  );

  const success = useCallback(
    (title: string, message?: string) => showToast({ type: "success", title, message }),
    [showToast]
  );

  const error = useCallback(
    (title: string, message?: string) => showToast({ type: "error", title, message }),
    [showToast]
  );

  const info = useCallback(
    (title: string, message?: string) => showToast({ type: "info", title, message }),
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, showToast, success, error, info, removeToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto p-4 rounded-xl shadow-lg border flex items-start gap-3 bg-white animate-in slide-in-from-bottom-5 duration-200"
            style={{
              borderColor:
                t.type === "success"
                  ? "#bbf7d0"
                  : t.type === "error"
                  ? "#fecaca"
                  : t.type === "warning"
                  ? "#fed7aa"
                  : "#e2e7ff",
            }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background:
                  t.type === "success"
                    ? "#dcfce7"
                    : t.type === "error"
                    ? "#fee2e2"
                    : t.type === "warning"
                    ? "#ffedd5"
                    : "#dce1ff",
                color:
                  t.type === "success"
                    ? "#15803d"
                    : t.type === "error"
                    ? "#b91c1c"
                    : t.type === "warning"
                    ? "#c2410c"
                    : "#0037b0",
              }}
            >
              <span className="material-symbols-outlined text-[18px]">
                {t.type === "success"
                  ? "check_circle"
                  : t.type === "error"
                  ? "error"
                  : t.type === "warning"
                  ? "warning"
                  : "info"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold leading-tight" style={{ color: "#131b2e" }}>
                {t.title}
              </h4>
              {t.message && (
                <p className="text-[11px] mt-0.5 leading-snug" style={{ color: "#434655" }}>
                  {t.message}
                </p>
              )}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-gray-400 hover:text-gray-600 transition-colors -mr-1 -mt-1 p-1"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        ))}
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
