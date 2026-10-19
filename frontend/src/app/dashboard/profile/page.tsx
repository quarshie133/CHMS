"use client";

import { useState, type SyntheticEvent } from "react";
import { useAuth } from "@/lib/auth-context";
import { authApi, errorMessage, fieldError } from "@/lib/api";
import { formatDate, initials, ROLE_LABELS } from "@/lib/format";
import { Modal, ConfirmDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { Field, Input } from "@/components/ui/form";
import { Alert, Avatar, Badge, Button, Card, CardHeader, DetailList, PageHeader } from "@/components/ui/primitives";

export default function ProfilePage() {
  const { user, token, updateUser, logout } = useAuth();
  const toast = useToast();

  // The dashboard layout only renders pages once the user is loaded.
  const [firstName, setFirstName] = useState(user?.first_name ?? "");
  const [lastName, setLastName] = useState(user?.last_name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);

  const [pwOpen, setPwOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwErrors, setPwErrors] = useState<Record<string, string>>({});
  const [pwApiError, setPwApiError] = useState<unknown>(null);
  const [changingPw, setChangingPw] = useState(false);

  const [confirmSignOut, setConfirmSignOut] = useState(false);

  const dirty =
    !!user && (firstName !== (user.first_name || "") || lastName !== (user.last_name || "") || email !== (user.email || "") || phone !== (user.phone || ""));

  const resetForm = () => {
    if (!user) return;
    setFirstName(user.first_name || "");
    setLastName(user.last_name || "");
    setEmail(user.email || "");
    setPhone(user.phone || "");
    setErrors({});
    setApiError(null);
  };

  const saveProfile = async (e: SyntheticEvent) => {
    e.preventDefault();
    if (!token || saving) return;
    const errs: Record<string, string> = {};
    if (!firstName.trim()) errs.first_name = "First name is required.";
    if (!lastName.trim()) errs.last_name = "Last name is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.email = "Enter a valid email address.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    setApiError(null);
    try {
      const updated = await authApi.updateProfile(token, {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
      });
      updateUser(updated);
      toast.success("Profile saved", "Your details were updated.");
    } catch (err) {
      setApiError(err);
    } finally {
      setSaving(false);
    }
  };

  const openPassword = () => {
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPwErrors({});
    setPwApiError(null);
    setPwOpen(true);
  };

  const changePassword = async (e: SyntheticEvent) => {
    e.preventDefault();
    if (!token || changingPw) return;
    const errs: Record<string, string> = {};
    if (!oldPassword) errs.old = "Enter your current password.";
    if (newPassword.length < 8) errs.new = "Use at least 8 characters.";
    else if (newPassword === oldPassword) errs.new = "Choose a password different from your current one.";
    if (confirmPassword !== newPassword) errs.confirm = "Passwords don't match.";
    setPwErrors(errs);
    if (Object.keys(errs).length) return;
    setChangingPw(true);
    setPwApiError(null);
    try {
      await authApi.changePassword(token, { old_password: oldPassword, new_password: newPassword });
      toast.success("Password changed", "Use your new password next time you sign in.");
      setPwOpen(false);
    } catch (err) {
      setPwApiError(err);
    } finally {
      setChangingPw(false);
    }
  };

  const role = ROLE_LABELS[user?.role ?? ""] ?? user?.role ?? "—";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="My profile" description="Your account details and sign-in security." />

      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar name={user?.full_name ?? ""} initials={initials(user?.first_name, user?.last_name)} src={user?.avatar} size={64} />
            <div className="min-w-0">
              <h2 className="truncate text-xl font-semibold text-ink">{user?.full_name}</h2>
              <p className="truncate text-sm text-ink-muted">{user?.email}</p>
              <Badge tone="brand" className="mt-2">
                {role}
              </Badge>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button icon="lock_reset" onClick={openPassword}>
              Change password
            </Button>
            <Button variant="danger-ghost" icon="logout" onClick={() => setConfirmSignOut(true)}>
              Sign out
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardHeader title="Personal information" description="How you appear to other staff." icon="badge" />
          <form onSubmit={saveProfile} noValidate className="flex flex-col gap-4 px-5 pb-5">
            {apiError ? <Alert title="Couldn't save your profile">{errorMessage(apiError)}</Alert> : null}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="First name" required error={errors.first_name || fieldError(apiError, "first_name")}>
                {(p) => <Input {...p} autoComplete="given-name" value={firstName} disabled={saving} onChange={(e) => setFirstName(e.target.value)} />}
              </Field>
              <Field label="Last name" required error={errors.last_name || fieldError(apiError, "last_name")}>
                {(p) => <Input {...p} autoComplete="family-name" value={lastName} disabled={saving} onChange={(e) => setLastName(e.target.value)} />}
              </Field>
              <Field label="Email" required hint="Used to sign in." error={errors.email || fieldError(apiError, "email")}>
                {(p) => <Input {...p} type="email" autoComplete="email" value={email} disabled={saving} onChange={(e) => setEmail(e.target.value)} />}
              </Field>
              <Field label="Phone" error={fieldError(apiError, "phone")}>
                {(p) => <Input {...p} type="tel" autoComplete="tel" value={phone} disabled={saving} onChange={(e) => setPhone(e.target.value)} />}
              </Field>
            </div>
            <div className="flex justify-end gap-2 border-t border-line pt-4">
              <Button onClick={resetForm} disabled={!dirty || saving}>
                Discard
              </Button>
              <Button type="submit" variant="primary" loading={saving} disabled={!dirty}>
                Save changes
              </Button>
            </div>
          </form>
        </Card>

        <Card className="lg:col-span-5 lg:self-start">
          <CardHeader title="Account" icon="shield_person" />
          <div className="px-5 pb-5">
            <DetailList
              columns={1}
              items={[
                { label: "Role", value: role },
                { label: "Church", value: "The Lord's Pentecostal Church International" },
                { label: "Account created", value: formatDate(user?.date_joined) },
              ]}
            />
            <p className="mt-4 rounded-lg bg-surface-muted p-3 text-[13px] text-ink-muted">
              Your role determines which records you can see. Ask a Super Admin or Church Admin if you need different access.
            </p>
          </div>
        </Card>
      </div>

      <Modal
        isOpen={pwOpen}
        onClose={() => setPwOpen(false)}
        title="Change password"
        subtitle="Enter your current password, then choose a new one."
        maxWidth="md"
        isSubmitting={changingPw}
        footer={
          <>
            <Button onClick={() => setPwOpen(false)} disabled={changingPw}>
              Cancel
            </Button>
            <Button type="submit" form="password-form" variant="primary" loading={changingPw}>
              Update password
            </Button>
          </>
        }
      >
        <form id="password-form" onSubmit={changePassword} noValidate className="flex flex-col gap-4">
          {pwApiError && !fieldError(pwApiError, "old_password") ? <Alert title="Couldn't change password">{errorMessage(pwApiError)}</Alert> : null}
          <Field label="Current password" required error={pwErrors.old || fieldError(pwApiError, "old_password")}>
            {(p) => <Input {...p} type="password" autoComplete="current-password" value={oldPassword} disabled={changingPw} onChange={(e) => setOldPassword(e.target.value)} />}
          </Field>
          <Field label="New password" required hint="At least 8 characters." error={pwErrors.new || fieldError(pwApiError, "new_password")}>
            {(p) => <Input {...p} type="password" autoComplete="new-password" value={newPassword} disabled={changingPw} onChange={(e) => setNewPassword(e.target.value)} />}
          </Field>
          <Field label="Confirm new password" required error={pwErrors.confirm}>
            {(p) => <Input {...p} type="password" autoComplete="new-password" value={confirmPassword} disabled={changingPw} onChange={(e) => setConfirmPassword(e.target.value)} />}
          </Field>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={confirmSignOut}
        onClose={() => setConfirmSignOut(false)}
        onConfirm={logout}
        title="Sign out?"
        message="You'll need to sign in again to access the church workspace on this device."
        confirmText="Sign out"
        variant="info"
        icon="logout"
      />
    </div>
  );
}
