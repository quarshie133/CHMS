"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err: unknown) {
      setError((err as { detail?: string })?.detail ?? "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(roleEmail: string) {
    setEmail(roleEmail);
    setPassword("password123");
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative"
      style={{ background: "#faf8ff" }}
    >
      {/* Decorative background ambiance */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full blur-3xl opacity-40"
          style={{ background: "#dce1ff" }}
        />
        <div
          className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full blur-3xl opacity-30"
          style={{ background: "#ffddb8" }}
        />
      </div>

      <div className="relative w-full max-w-md slide-up">
        {/* Brand Header */}
        <div className="text-center mb-8">
          {/* Real TLPCI Logo */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full shadow-xl mb-3 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/tlpci-logo.png" alt="TLPCI Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: "#131b2e", letterSpacing: "-0.015em" }}>
            TLPCI ChurchMS
          </h1>
          <p className="text-xs mt-1" style={{ color: "#747686" }}>
            The Lord&apos;s Pentecostal Church International — Ministry Portal
          </p>
        </div>

        {/* Card */}
        <div className="sanctuary-card p-8 shadow-xl space-y-6">
          <div>
            <h2 className="text-lg font-bold" style={{ color: "#131b2e" }}>
              Sign in to your account
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "#747686" }}>
              Enter your church credentials to proceed
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl flex items-center gap-2 text-xs text-[#ba1a1a] bg-[#ffdad6]">
              <span className="material-symbols-outlined text-sm">error</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: "#747686" }}>
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="pastor@churchms.org"
                className="w-full sanctuary-input text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: "#747686" }}>
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full sanctuary-input text-sm pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  tabIndex={-1}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full sanctuary-btn-primary justify-center py-3 text-sm font-semibold"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Authenticating...
                </span>
              ) : (
                "Sign In to TLPCI"
              )}
            </button>
          </form>

          {/* Quick Demo Logins */}
          <div className="pt-4 border-t space-y-2.5" style={{ borderColor: "#e2e7ff" }}>
            <span className="text-[10px] font-bold uppercase tracking-wider block text-center" style={{ color: "#747686" }}>
              Quick Demo Accounts
            </span>
            <div className="grid grid-cols-3 gap-2 text-xs font-semibold">
              <button
                type="button"
                onClick={() => fillDemo("admin@churchms.org")}
                className="p-2 rounded-lg text-left border transition-colors hover:border-[#1d4ed8]"
                style={{ background: "#f2f3ff", borderColor: "#e2e7ff", color: "#131b2e" }}
              >
                <div className="text-[11px] font-bold truncate" style={{ color: "#0037b0" }}>Admin</div>
                <div className="text-[10px] truncate" style={{ color: "#747686" }}>Super User</div>
              </button>
              <button
                type="button"
                onClick={() => fillDemo("pastor@churchms.org")}
                className="p-2 rounded-lg text-left border transition-colors hover:border-[#1d4ed8]"
                style={{ background: "#f2f3ff", borderColor: "#e2e7ff", color: "#131b2e" }}
              >
                <div className="text-[11px] font-bold truncate" style={{ color: "#0037b0" }}>Pastor</div>
                <div className="text-[10px] truncate" style={{ color: "#747686" }}>Branch Lead</div>
              </button>
              <button
                type="button"
                onClick={() => fillDemo("finance@churchms.org")}
                className="p-2 rounded-lg text-left border transition-colors hover:border-[#855300]"
                style={{ background: "#f2f3ff", borderColor: "#e2e7ff", color: "#131b2e" }}
              >
                <div className="text-[11px] font-bold truncate" style={{ color: "#855300" }}>Finance</div>
                <div className="text-[10px] truncate" style={{ color: "#747686" }}>Treasurer</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
