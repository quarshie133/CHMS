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
    <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: "#faf8ff" }}>
      {/* Real TLPCI Logo */}
      <div className="w-20 h-20 rounded-full overflow-hidden shadow-xl" style={{ border: "3px solid #e2e7ff" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/tlpci-logo.png" alt="TLPCI" className="w-full h-full object-cover" />
      </div>
      <div className="flex flex-col items-center gap-1">
        <span className="font-bold text-sm" style={{ color: "#131b2e" }}>TLPCI ChurchMS</span>
        <span className="text-xs" style={{ color: "#747686" }}>Loading…</span>
      </div>
      <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#0037b0", borderTopColor: "transparent" }} />
    </div>
  );
}
