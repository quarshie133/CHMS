"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { authApi } from "@/lib/api";
import { Modal, ConfirmDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";

export default function ProfilePage() {
  const { user, token, updateUser, logout } = useAuth();
  const { success, error, info } = useToast();

  // Profile Form State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");

  // Change Password Modal State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  // Sign out confirmation dialog
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Sync user state into local form fields
  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || "");
      setLastName(user.last_name || "");
      setEmail(user.email || "");
      setPhone(user.phone || "");
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!firstName.trim() || !lastName.trim()) {
      setProfileError("First name and last name are required.");
      return;
    }

    if (!email.trim()) {
      setProfileError("A valid email address is required.");
      return;
    }

    setIsSavingProfile(true);
    setProfileError("");

    try {
      const updated = await authApi.updateProfile(token, {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
      });
      updateUser(updated);
      success("Profile information updated successfully.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update profile.";
      setProfileError(msg);
      error(msg);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (!oldPassword) {
      setPasswordError("Please enter your current password.");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    setIsChangingPassword(true);
    setPasswordError("");

    try {
      await authApi.changePassword(token, {
        old_password: oldPassword,
        new_password: newPassword,
      });
      success("Password changed successfully. Please keep your credentials secure.");
      setShowPasswordModal(false);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update password.";
      setPasswordError(msg);
      error(msg);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const getRoleDisplayName = (role?: string) => {
    switch (role) {
      case "super_admin":
        return "Super Admin / Senior Pastor";
      case "church_admin":
        return "Church Administrator";
      case "finance_officer":
        return "Finance Officer";
      case "ministry_leader":
        return "Ministry Leader";
      case "sunday_school":
        return "Sunday School Teacher";
      case "volunteer_usher":
        return "Volunteer Usher";
      default:
        return role ? role.replace("_", " ").toUpperCase() : "Staff Member";
    }
  };

  const getInitials = () => {
    if (!user) return "TL";
    const f = user.first_name ? user.first_name[0] : "";
    const l = user.last_name ? user.last_name[0] : "";
    return (f + l).toUpperCase() || "TL";
  };

  return (
    <div className="w-full max-w-[1440px] mx-auto space-y-6">
      {/* ── Breadcrumb & Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <nav className="flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
            <Link href="/dashboard" className="hover:text-primary transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">home</span>
              <span>Home</span>
            </Link>
            <span className="material-symbols-outlined text-xs text-outline">chevron_right</span>
            <span className="text-primary">Profile</span>
          </nav>
          <h1 className="text-2xl sm:text-3xl font-bold text-on-surface" style={{ letterSpacing: "-0.015em" }}>
            My Ministry Profile
          </h1>
          <p className="text-sm text-on-surface-variant mt-0.5">
            Manage your personal staff credentials, contact details, and account security
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowPasswordModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px] text-primary">lock_reset</span>
            <span>Change Password</span>
          </button>
          <button
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-error-container/20 text-error hover:bg-error-container/40 text-xs font-semibold transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">logout</span>
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* ── Profile Top Identity Card ── */}
      <div className="bg-surface-container-lowest rounded-2xl p-6 sm:p-8 shadow-sm border border-outline-variant/30 relative overflow-hidden">
        {/* Ambient background gradient */}
        <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-gradient-to-br from-primary-fixed/20 to-secondary-fixed/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Avatar Circle */}
            <div className="relative flex-shrink-0">
              <div
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center text-white text-2xl sm:text-3xl font-extrabold shadow-md border-4 border-white"
                style={{ background: "#1d4ed8" }}
              >
                {getInitials()}
              </div>
              <span
                className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center shadow-xs border-2 border-white"
                title="Active Account"
              >
                <span className="material-symbols-outlined text-[14px]">verified</span>
              </span>
            </div>

            {/* Names & Role */}
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold text-on-surface">
                  {user?.full_name || (user ? `${user.first_name} ${user.last_name}` : "Church Staff")}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed/40 text-primary text-xs font-bold uppercase tracking-wider">
                  {getRoleDisplayName(user?.role)}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-on-surface-variant flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-outline">email</span>
                <span>{user?.email || "No email assigned"}</span>
                {user?.phone && (
                  <>
                    <span className="text-outline-variant">•</span>
                    <span className="material-symbols-outlined text-[16px] text-outline">call</span>
                    <span>{user.phone}</span>
                  </>
                )}
              </p>
              <p className="text-xs text-outline flex items-center gap-1 pt-1">
                <span className="material-symbols-outlined text-[14px] text-tertiary">church</span>
                <span>The Lord&apos;s Pentecostal Church International — TLPCI Central</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container text-xs font-semibold text-on-surface">
              <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse" />
              <span>Session Verified</span>
            </span>
          </div>
        </div>
      </div>

      {/* ── Main 2-Column Grid: Form on Left, Security & Info on Right ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ================= LEFT COLUMN: Edit Profile Form (7/12) ================= */}
        <div className="lg:col-span-7 bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
            <div>
              <h3 className="text-base font-bold text-on-surface">Personal Information</h3>
              <p className="text-xs text-outline">Update your legal name, email, and mobile contact number</p>
            </div>
            <span className="material-symbols-outlined text-outline text-[20px]">badge</span>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            {profileError && (
              <div className="p-3.5 rounded-xl bg-error-container/30 text-error text-xs flex items-center gap-2 border border-error/20">
                <span className="material-symbols-outlined text-sm flex-shrink-0">error</span>
                <span>{profileError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-on-surface block mb-1.5">
                  First Name <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20 border border-outline-variant/30 transition-all"
                  placeholder="e.g. Grace"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-on-surface block mb-1.5">
                  Last Name <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20 border border-outline-variant/30 transition-all"
                  placeholder="e.g. Miller"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-on-surface block mb-1.5">
                  Email Address <span className="text-error">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20 border border-outline-variant/30 transition-all"
                  placeholder="pastor@tlpci.org"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-on-surface block mb-1.5">
                  Mobile Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20 border border-outline-variant/30 transition-all"
                  placeholder="(555) 234-8901"
                />
              </div>
            </div>

            {/* Role Notice */}
            <div className="p-3.5 rounded-xl bg-surface-container-low text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-on-surface">
                <span className="material-symbols-outlined text-[16px] text-primary">security</span>
                <span>Assigned Church Role: {getRoleDisplayName(user?.role)}</span>
              </div>
              <p className="text-outline text-[11px] leading-relaxed">
                Role and security access tier permissions can be configured by an administrator under the Roles &amp; Access module.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant/20">
              <button
                type="submit"
                disabled={isSavingProfile}
                className="px-5 py-2.5 rounded-xl bg-primary text-on-primary text-xs sm:text-sm font-semibold hover:bg-primary-container shadow-sm hover:shadow transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {isSavingProfile ? (
                  <>
                    <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">save</span>
                    <span>Save Profile Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* ================= RIGHT COLUMN: Security & Church Entity (5/12) ================= */}
        <div className="lg:col-span-5 space-y-6">
          {/* Account Security Card */}
          <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">lock</span>
                <h3 className="text-base font-bold text-on-surface">Security &amp; Credentials</h3>
              </div>
              <span className="text-xs text-tertiary font-bold bg-tertiary-fixed/30 px-2 py-0.5 rounded-full">
                Encrypted
              </span>
            </div>

            <p className="text-xs text-on-surface-variant leading-relaxed">
              We recommend rotating your staff password periodically and ensuring it contains at least 8 alphanumeric characters.
            </p>

            <div className="p-3 bg-surface-container-low rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-on-surface">Current Password</p>
                <p className="text-[11px] text-outline">Last changed recently</p>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswordModal(true)}
                className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold transition-colors cursor-pointer"
              >
                Update
              </button>
            </div>
          </div>

          {/* Ministry Organization & Church Info */}
          <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-outline-variant/20">
              <span className="material-symbols-outlined text-primary text-[20px]">church</span>
              <h3 className="text-base font-bold text-on-surface">Church Assignment</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-outline-variant/10">
                <span className="text-outline">Denomination</span>
                <span className="font-semibold text-on-surface text-right">The Lord&apos;s Pentecostal Church Intl</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-outline-variant/10">
                <span className="text-outline">Branch Campus</span>
                <span className="font-semibold text-primary text-right">TLPCI Central</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-outline-variant/10">
                <span className="text-outline">Tenant Schema</span>
                <span className="font-mono text-on-surface text-right">cathedral</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-outline-variant/10">
                <span className="text-outline">Access Level</span>
                <span className="font-semibold text-tertiary text-right">{getRoleDisplayName(user?.role)}</span>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href="/dashboard/roles"
                className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-semibold transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">admin_panel_settings</span>
                <span>Review Role Permissions</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modal: Change Password ── */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => !isChangingPassword && setShowPasswordModal(false)}
        title="Update Staff Password"
        subtitle="Enter your current password and choose a new secure password"
        maxWidth="md"
        isSubmitting={isChangingPassword}
      >
        <form onSubmit={handleChangePassword} className="space-y-4">
          {passwordError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-sm flex-shrink-0">error</span>
              <span>{passwordError}</span>
            </div>
          )}

          <div>
            <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: "#747686" }}>
              Current Password *
            </label>
            <input
              type="password"
              required
              disabled={isChangingPassword}
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="w-full sanctuary-input text-sm disabled:opacity-50"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: "#747686" }}>
              New Password (min 8 characters) *
            </label>
            <input
              type="password"
              required
              minLength={8}
              disabled={isChangingPassword}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full sanctuary-input text-sm disabled:opacity-50"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: "#747686" }}>
              Confirm New Password *
            </label>
            <input
              type="password"
              required
              minLength={8}
              disabled={isChangingPassword}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full sanctuary-input text-sm disabled:opacity-50"
              placeholder="••••••••"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t" style={{ borderColor: "#f2f3ff" }}>
            <button
              type="button"
              disabled={isChangingPassword}
              onClick={() => setShowPasswordModal(false)}
              className="sanctuary-btn-secondary text-xs disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isChangingPassword}
              className="sanctuary-btn-primary text-xs flex items-center gap-1.5 disabled:opacity-60"
            >
              {isChangingPassword && (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              <span>Update Password</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Dialog: Confirm Sign Out ── */}
      <ConfirmDialog
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={logout}
        title="Sign Out of TLPCI ChurchMS"
        message="Are you sure you want to sign out of your session on this device?"
        confirmText="Sign Out"
        isDestructive={false}
        icon="logout"
      />
    </div>
  );
}
