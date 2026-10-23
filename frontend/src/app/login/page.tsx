"use client";

import { useEffect, useState, type SyntheticEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { errorMessage } from "@/lib/api";
import { Field, Input } from "@/components/ui/form";
import { Alert, Button, Icon } from "@/components/ui/primitives";

const DEMO_ACCOUNTS =
  process.env.NODE_ENV !== "production"
    ? [
        { email: "admin@churchms.org", label: "Admin" },
        { email: "pastor@churchms.org", label: "Pastor" },
        { email: "finance@churchms.org", label: "Finance" },
      ]
    : [];

export default function LoginPage() {
  const { login, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Already signed in — go straight to the workspace.
  useEffect(() => {
    if (!authLoading && isAuthenticated) router.replace("/dashboard");
  }, [authLoading, isAuthenticated, router]);

  async function handleSubmit(e: SyntheticEvent) {
    e.preventDefault();
    if (loading) return;
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.push("/dashboard");
    } catch (err) {
      const status = (err as { status?: number })?.status;
      setError(
        status === 401
          ? "That email and password combination didn't work. Please try again."
          : errorMessage(err, "Sign-in failed. Please try again."),
      );
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(480px,560px)]">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-nav lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/tlpci-logo.png"
            alt=""
            className="h-11 w-11 rounded-full bg-white object-cover"
          />
          <div className="leading-tight">
            <p className="text-sm font-semibold text-white">
              TLPCI House of Prayer - CHMS
            </p>
            <p className="text-[12px] text-nav-ink">Ministry workspace</p>
          </div>
        </div>
        <div className="max-w-md">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight text-white">
            Caring for every member of the congregation.
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-nav-ink">
            People, groups, attendance, giving and communication for The
            Lord&apos;s Pentecostal Church International - in one place.
          </p>
        </div>
        <p className="text-[12px] text-[#7f93ad]">
          Founded 1961 · The Lord&apos;s Pentecostal Church International
        </p>
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full border-[40px] border-white/[0.04]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 right-24 h-72 w-72 rounded-full border-[32px] border-accent/10"
        />
      </aside>

      {/* Form */}
      <main className="flex items-center justify-center bg-surface px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm animate-rise-in">
          <div className="mb-8 flex flex-col items-center text-center lg:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/tlpci-logo.png"
              alt="TLPCI logo"
              className="h-16 w-16 rounded-full object-cover shadow-[var(--shadow-raised)]"
            />
            <p className="mt-3 text-sm font-semibold text-ink">
              TLPCI ChurchMS
            </p>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight text-ink">
            Sign in
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Use the email and password for your church account.
          </p>

          <form
            onSubmit={handleSubmit}
            noValidate
            className="mt-8 flex flex-col gap-4"
          >
            {error && <Alert>{error}</Alert>}
            <Field label="Email">
              {(p) => (
                <Input
                  {...p}
                  type="email"
                  autoComplete="email"
                  autoFocus
                  value={email}
                  disabled={loading}
                  placeholder="you@church.org"
                  onChange={(e) => setEmail(e.target.value)}
                />
              )}
            </Field>
            <Field label="Password">
              {(p) => (
                <div className="relative">
                  <Input
                    {...p}
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    disabled={loading}
                    className="pr-11"
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    aria-pressed={showPassword}
                    className="absolute right-1.5 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-ink-muted hover:bg-canvas hover:text-ink"
                  >
                    <Icon
                      name={showPassword ? "visibility_off" : "visibility"}
                      size={18}
                    />
                  </button>
                </div>
              )}
            </Field>
            <Button
              type="submit"
              variant="primary"
              loading={loading}
              className="mt-2 w-full"
            >
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          {DEMO_ACCOUNTS.length > 0 && (
            <div className="mt-8 border-t border-line pt-6">
              <p className="text-[12px] font-medium text-ink-muted">
                Development accounts
              </p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {DEMO_ACCOUNTS.map((a) => (
                  <Button
                    key={a.email}
                    size="sm"
                    onClick={() => {
                      setEmail(a.email);
                      setPassword("password123");
                      setError("");
                    }}
                  >
                    {a.label}
                  </Button>
                ))}
              </div>
              <p className="mt-2 text-[12px] text-ink-subtle">
                Fills in seeded demo credentials. Hidden in production builds.
              </p>
            </div>
          )}
          <div className="mt-10 text-center">
            <p className="text-xs text-ink-muted">
              Developed by <span className="font-medium text-ink">Noqtech</span>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
