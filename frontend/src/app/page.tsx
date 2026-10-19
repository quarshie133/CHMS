"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function HomePage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      router.replace(isAuthenticated ? "/dashboard" : "/login");
    }
  }, [isAuthenticated, loading, router]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-canvas" aria-busy="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/tlpci-logo.png" alt="TLPCI" className="h-16 w-16 rounded-full object-cover shadow-[var(--shadow-raised)]" />
      <div className="flex items-center gap-2 text-sm text-ink-muted">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand border-t-transparent" aria-hidden />
        Loading TLPCI ChurchMS…
      </div>
    </div>
  );
}
