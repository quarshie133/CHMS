"use client";

import React, { useEffect, useCallback } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | string;
  children: React.ReactNode;
  isSubmitting?: boolean;
}

const MAX_WIDTHS: Record<string, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
};

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  maxWidth = "md",
  children,
  isSubmitting = false,
}: ModalProps) {
  const widthClass = MAX_WIDTHS[maxWidth] || maxWidth;
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) {
        onClose();
      }
    },
    [onClose, isSubmitting]
  );

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      style={{ backgroundColor: "rgba(15, 23, 42, 0.45)", backdropFilter: "blur(6px)" }}
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <div
        className={`w-full ${widthClass} bg-white rounded-2xl shadow-2xl border flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150`}
        style={{ borderColor: "#e2e7ff", maxHeight: "calc(100vh - 3rem)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0"
          style={{ borderColor: "#f2f3ff", background: "#faf8ff" }}
        >
          <div>
            <h3 className="text-base font-bold" style={{ color: "#131b2e", letterSpacing: "-0.01em" }}>
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs mt-0.5" style={{ color: "#747686" }}>
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close dialog"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-40 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto max-h-[calc(100vh-12rem)]">{children}</div>
      </div>
    </div>
  );
}

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
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
  icon = "warning",
}: ConfirmDialogProps) {
  if (!isOpen) return null;
  const isDestruct = variant ? variant === "danger" : isDestructive;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="sm"
      isSubmitting={isLoading}
    >
      <div className="flex flex-col items-center text-center space-y-4">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 shadow-xs"
          style={{
            background: isDestruct ? "#ffdad6" : "#eaedff",
            color: isDestruct ? "#ba1a1a" : "#0037b0",
          }}
        >
          <span className="material-symbols-outlined text-2xl">{icon}</span>
        </div>

        <div>
          <p className="text-sm leading-relaxed" style={{ color: "#434655" }}>
            {message}
          </p>
        </div>

        <div className="flex items-center gap-3 w-full pt-2">
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold border transition-all cursor-pointer"
            style={{
              borderColor: "#e2e7ff",
              background: "#ffffff",
              color: "#434655",
            }}
          >
            {cancelText}
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold text-white shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            style={{
              background: isDestruct ? "#ba1a1a" : "#1d4ed8",
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            {isLoading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <span>{confirmText}</span>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
