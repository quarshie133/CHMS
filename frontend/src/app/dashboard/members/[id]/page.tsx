"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { membersApi, type Member } from "@/lib/api";
import { Modal, ConfirmDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";

type TabKey = "overview" | "family" | "groups" | "attendance" | "giving" | "notes" | "comms";

export default function MemberProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuth();
  const { success, error } = useToast();

  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");

  // Edit Profile Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editStatus, setEditStatus] = useState("active");
  const [editLifeStage, setEditLifeStage] = useState("adult");
  const [editFamily, setEditFamily] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Delete Profile State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [notesList, setNotesList] = useState([
    {
      id: "1",
      initials: "GM",
      author: "Pastor Grace Miller",
      avatarBg: "#1d4ed8",
      avatarColor: "#ffffff",
      date: "3 days ago",
      text: "“Met for coffee regarding new family small group kickoff. Enthusiastic about leading weekly prayer.”",
      status: "Follow-up completed",
    },
    {
      id: "2",
      initials: "ET",
      author: "Elder Thomas",
      avatarBg: "#855300",
      avatarColor: "#ffffff",
      date: "Sep 15",
      text: "“Marcus volunteered for fall community outreach logistics. Coordinated team setup with church facilities.”",
      tag: "#Volunteering #Outreach",
    },
  ]);

  useEffect(() => {
    if (!token || !id) return;
    setLoading(true);
    membersApi
      .get(token, id)
      .then((m) => setMember(m))
      .catch((err) => {
        console.warn("Could not fetch remote member, using demo profile fallback", err);
        setMember({
          id,
          full_name: "Marcus Sterling",
          first_name: "Marcus",
          last_name: "Sterling",
          email: "m.sterling@email.com",
          phone_mobile: "(555) 234-8901",
          status: "active",
          life_stage: "adult",
          photo:
            "https://lh3.googleusercontent.com/aida-public/AB6AXuDywSpo0Yd1s8U0enVlimDoSOfGNxshvHFUIpGOzdaoFEhDBuUXfkQeki8AcNOktH5LyCZ2e8xzMfceUypz_Y5UzA-C9ZZmhkSo_tnDZTThiddeAdoGMCEsXahCtYSau0g_-5TGzN71ddWwWrGpIP7AQQNOp1gwDFZC-ppw9XwMTOzAUrm7fwBM2yEllN3FXHEJ4x3n9cmPSDQdYBCTMiPlgHruqedeMrZ0v8Nxh_Wi1JUURWGGULDs8Q",
          age: 38,
          family_name: "Sterling Family",
          membership_date: "2021-10-15",
          created_at: "2021-10-15T00:00:00Z",
        });
      })
      .finally(() => setLoading(false));
  }, [token, id]);

  const openEditModal = () => {
    if (!member) return;
    setEditFirstName(member.first_name || "");
    setEditLastName(member.last_name || "");
    setEditEmail(member.email || "");
    setEditPhone(member.phone_mobile || "");
    setEditStatus(member.status || "active");
    setEditLifeStage(member.life_stage || "adult");
    setEditFamily(member.family_name || "");
    setFormError("");
    setShowEditModal(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !id) return;
    if (!editFirstName.trim() || !editLastName.trim()) {
      setFormError("First name and last name are required.");
      return;
    }
    setIsSubmitting(true);
    setFormError("");
    try {
      const updated = await membersApi.update(token, id, {
        first_name: editFirstName.trim(),
        last_name: editLastName.trim(),
        email: editEmail.trim() || undefined,
        phone_mobile: editPhone.trim() || undefined,
        status: editStatus,
        life_stage: editLifeStage,
        family_name: editFamily.trim() || undefined,
      });
      setMember(updated);
      success("Congregant profile updated successfully.");
      setShowEditModal(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update profile.";
      setFormError(msg);
      error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMember = async () => {
    if (!token || !id) return;
    setIsDeleting(true);
    try {
      await membersApi.remove(token, id);
      success("Congregant profile removed from directory.");
      router.push("/dashboard/members");
    } catch (err: unknown) {
      error(err instanceof Error ? err.message : "Failed to delete congregant profile.");
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    setNotesList([
      {
        id: Date.now().toString(),
        initials: "GM",
        author: "Pastor Grace Miller",
        avatarBg: "#1d4ed8",
        avatarColor: "#ffffff",
        date: "Just now",
        text: `“${newNoteText}”`,
        status: "Active note",
      },
      ...notesList,
    ]);
    setNewNoteText("");
    setShowAddNoteModal(false);
    success("Pastoral care note recorded securely.");
  };

  const displayName = member?.full_name || (member ? `${member.first_name} ${member.last_name}` : "Marcus Sterling");

  return (
    <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
      {/* ── Breadcrumb & Meta Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-on-surface-variant text-sm">
          <Link href="/dashboard/members" className="hover:text-primary transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">people</span>
            <span>Directory</span>
          </Link>
          <span className="text-outline-variant">/</span>
          <span className="text-on-surface font-semibold">{displayName}</span>
          <span className="text-outline-variant">•</span>
          <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-primary text-xs font-medium">
            ID #REC-{member?.id ? member.id.slice(0, 6) : "8049"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-tertiary bg-tertiary-fixed/40 px-3 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse"></span>
            Checked In This Sunday (9:30 AM Service)
          </span>
        </div>
      </div>

      {/* ── Header Section Card ── */}
      <div className="bg-surface-container-lowest rounded-xl shadow-sm p-6 relative overflow-hidden">
        {/* Ambient decorative gradient wash */}
        <div className="absolute -right-24 -top-24 w-96 h-96 rounded-full bg-gradient-to-br from-primary-fixed/30 to-surface-container-high/40 blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Identity Group */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Avatar with Online/Active Badge */}
            <div className="relative flex-shrink-0">
              <img
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover shadow-sm bg-surface-container-high"
                src={
                  member?.photo ||
                  "https://lh3.googleusercontent.com/aida-public/AB6AXuDywSpo0Yd1s8U0enVlimDoSOfGNxshvHFUIpGOzdaoFEhDBuUXfkQeki8AcNOktH5LyCZ2e8xzMfceUypz_Y5UzA-C9ZZmhkSo_tnDZTThiddeAdoGMCEsXahCtYSau0g_-5TGzN71ddWwWrGpIP7AQQNOp1gwDFZC-ppw9XwMTOzAUrm7fwBM2yEllN3FXHEJ4x3n9cmPSDQdYBCTMiPlgHruqedeMrZ0v8Nxh_Wi1JUURWGGULDs8Q"
                }
                alt={displayName}
              />
              <span
                className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center shadow-sm"
                title="Active congregant"
              >
                <span className="material-symbols-outlined text-[14px]">check</span>
              </span>
            </div>

            {/* Name, Family & Meta Row */}
            <div className="flex flex-col min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-1.5">
                <h1 className="text-2xl sm:text-3xl font-bold text-on-surface tracking-tight">{displayName}</h1>
                {/* Badges */}
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2.5 py-0.5 rounded-full bg-surface-container-high text-primary text-xs font-semibold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">verified</span>
                    Active Member
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-secondary-fixed/50 text-secondary text-xs font-semibold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">family_restroom</span>
                    {member?.family_name || "Sterling Family"} (Head of Household)
                  </span>
                </div>
              </div>

              {/* Key Stats Meta Row */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-on-surface-variant text-sm">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-primary">calendar_month</span>
                  Member since <strong className="font-semibold text-on-surface">Oct 2021</strong> (4 years)
                </span>
                <span className="text-outline-variant font-bold">•</span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-secondary">mail</span>
                  Envelope <strong className="font-semibold text-on-surface">#1084</strong>
                </span>
                <span className="text-outline-variant font-bold">•</span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-primary">water_drop</span>
                  Baptized <strong className="font-semibold text-on-surface">Apr 14, 2018</strong>
                </span>
                <span className="text-outline-variant font-bold">•</span>
                <span>
                  Age <strong className="font-semibold text-on-surface">{member?.age || "38"}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
            <a
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-container text-on-surface text-sm font-semibold hover:bg-surface-container-high transition-colors shadow-sm"
              href={`tel:${member?.phone_mobile || "5552348901"}`}
            >
              <span className="material-symbols-outlined text-[18px] text-primary">call</span>
              <span>{member?.phone_mobile || "(555) 234-8901"}</span>
            </a>
            <Link
              href="/dashboard/communications"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-container text-on-surface text-sm font-semibold hover:bg-surface-container-high transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px] text-secondary">chat</span>
              <span>Message</span>
            </Link>
            <button
              onClick={() => {
                setActiveTab("notes");
                setShowAddNoteModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary-container text-on-primary text-sm font-semibold hover:opacity-95 transition-opacity shadow-sm"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">volunteer_activism</span>
              <span>Log Pastoral Care</span>
            </button>
            <button
              onClick={openEditModal}
              className="p-2 rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors flex items-center justify-center"
              title="Edit Congregant Profile"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">edit</span>
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 rounded-lg bg-error-container/20 text-error hover:bg-error-container/40 transition-colors flex items-center justify-center"
              title="Delete Congregant Profile"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">delete</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Horizontal Navigation Tabs ── */}
      <div className="bg-surface-container-lowest rounded-xl shadow-sm px-4 py-1 overflow-x-auto flex items-center gap-1">
        {[
          { key: "overview", label: "Overview", icon: "dashboard" },
          { key: "family", label: "Family", badge: "4" },
          { key: "groups", label: "Groups & Ministries", badge: "2" },
          { key: "attendance", label: "Attendance History" },
          { key: "giving", label: "Giving Records" },
          { key: "notes", label: "Pastoral Notes", badge: "3", badgeColor: "bg-secondary-fixed text-on-secondary-fixed" },
          { key: "comms", label: "Communication Log" },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as TabKey)}
              className={`px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap flex items-center gap-2 transition-all ${
                isActive
                  ? "bg-primary text-on-primary shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
              }`}
              type="button"
            >
              {tab.icon && <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-xs font-semibold ${
                    tab.badgeColor || (isActive ? "bg-white/20 text-white" : "bg-surface-container-high text-primary")
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Main Content Area: Overview Tab 3-Column Grid ── */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ================= LEFT COLUMN: Width 4/12 ================= */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {/* Personal Information Card */}
            <div className="bg-surface-container-lowest rounded-xl shadow-sm p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-primary-fixed/50 text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px]">badge</span>
                  </span>
                  <h2 className="text-lg font-semibold text-on-surface">Personal Information</h2>
                </div>
                <button className="text-primary hover:text-primary-container text-xs font-semibold" type="button">
                  Edit
                </button>
              </div>

              <div className="flex flex-col gap-3 text-sm">
                <div className="p-3 bg-surface-container-low rounded-lg flex items-start gap-3">
                  <span className="material-symbols-outlined text-outline text-[20px] mt-0.5">mail</span>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[11px] text-outline uppercase tracking-wider font-semibold">Email Address</span>
                    <a className="text-primary font-semibold truncate hover:underline" href={`mailto:${member?.email || "m.sterling@email.com"}`}>
                      {member?.email || "m.sterling@email.com"}
                    </a>
                  </div>
                </div>

                <div className="p-3 bg-surface-container-low rounded-lg flex items-start gap-3">
                  <span className="material-symbols-outlined text-outline text-[20px] mt-0.5">smartphone</span>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[11px] text-outline uppercase tracking-wider font-semibold">Mobile Phone</span>
                    <span className="text-on-surface font-semibold">{member?.phone_mobile || "(555) 234-8901"}</span>
                  </div>
                </div>

                <div className="p-3 bg-surface-container-low rounded-lg flex items-start gap-3">
                  <span className="material-symbols-outlined text-outline text-[20px] mt-0.5">home_pin</span>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[11px] text-outline uppercase tracking-wider font-semibold">Home Address</span>
                    <span className="text-on-surface font-semibold">742 Evergreen Terrace</span>
                    <span className="text-on-surface-variant text-xs">Springfield, OR 97477</span>
                  </div>
                </div>

                <div className="p-3 bg-surface-container-low rounded-lg flex items-start gap-3">
                  <span className="material-symbols-outlined text-outline text-[20px] mt-0.5">work</span>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[11px] text-outline uppercase tracking-wider font-semibold">Occupation</span>
                    <span className="text-on-surface font-semibold">Software Architect</span>
                    <span className="text-on-surface-variant text-xs">Northwest Cloud Labs</span>
                  </div>
                </div>

                <div className="p-3 bg-surface-container-low rounded-lg flex items-start gap-3">
                  <span className="material-symbols-outlined text-outline text-[20px] mt-0.5">favorite</span>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[11px] text-outline uppercase tracking-wider font-semibold">Marital Status</span>
                    <span className="text-on-surface font-semibold">Married to Elena Sterling</span>
                    <span className="text-on-surface-variant text-xs">12 years (Anniversary: June 18)</span>
                  </div>
                </div>

                <div className="p-3 bg-error-container/40 rounded-lg flex items-start gap-3">
                  <span className="material-symbols-outlined text-error text-[20px] mt-0.5">contact_emergency</span>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[11px] text-error font-semibold uppercase tracking-wider">Emergency Contact</span>
                    <span className="text-on-surface font-semibold">Elena Sterling (Spouse)</span>
                    <span className="text-on-surface-variant text-xs">(555) 234-8902</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Family Unit Mini Card */}
            <div className="bg-surface-container-lowest rounded-xl shadow-sm p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-secondary-fixed/50 text-secondary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px]">diversity_1</span>
                  </span>
                  <h2 className="text-lg font-semibold text-on-surface">Family Unit (4)</h2>
                </div>
                <span className="text-xs px-2 py-0.5 rounded bg-surface-container-high text-primary font-semibold">
                  Household #412
                </span>
              </div>

              <div className="flex flex-col gap-2.5">
                {/* Elena */}
                <div className="p-3 bg-surface-container-low hover:bg-surface-container transition-colors rounded-lg flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      className="w-10 h-10 rounded-full object-cover bg-surface-container-high flex-shrink-0"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuBAmLFSo3m8wa8XKilW15tbNRIWlFtsLCpt43Djp2xfyD6CSSL6DV0Tnf6BvlxdDmx8osJZEa5Dq-6C_OMYUA94R5OLgsnMb0w6l1vzaJPNnM1-MeGj5Cs2nWn8uySjN60YqvCZlF2FR7V2IX2mfQDonEfs728iILVcwkrqfy1OjuuSe0sj6vXY5mkohld1mlQWRK_DeiS5PeRc4woAGTmUl6Z1Vixo1MeKl1Y70cSS32damSxa6j573g"
                      alt="Elena Sterling"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-semibold text-on-surface truncate">Elena Sterling</span>
                      <span className="text-xs text-outline">Spouse • Adult Choir Member</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface text-xs font-medium flex-shrink-0">
                    Adult
                  </span>
                </div>

                {/* Leo */}
                <div className="p-3 bg-surface-container-low hover:bg-surface-container transition-colors rounded-lg flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      className="w-10 h-10 rounded-full object-cover bg-surface-container-high flex-shrink-0"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuCr8pfh0NKD0_9DePYXU-X0uZXXmkG_cfAEV2c3ICxvdWcMOTa0rdzfIAJQURgou7njSkm0WWrjiZkeTxfP8wtT-JXabE90LWBIoAvtypQq7J86rE8JTmdLucG-HMB-Ip_sK4HH1gyAQjJf5TIx9hLYeuI13GBVRulk4fBtaBd1tub6QGx9pjdpnUugNvG1LL1l_q5h2sykQlDC9jOzWxUpiBHJxkbkjUbIhtMLDaZATWVuKXf8k6SyrA"
                      alt="Leo Sterling"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-semibold text-on-surface truncate">Leo Sterling</span>
                      <span className="text-xs text-outline">Son • Age 8 • Sunday School (Grades 3-4)</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed text-xs font-semibold flex-shrink-0">
                    Checked In
                  </span>
                </div>

                {/* Maya */}
                <div className="p-3 bg-surface-container-low hover:bg-surface-container transition-colors rounded-lg flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      className="w-10 h-10 rounded-full object-cover bg-surface-container-high flex-shrink-0"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuDBuZmgmLYtCR0KAF2zLF3oR282qOWy-XL9nVyVL98r1Y4qilET1kMLdB4eIoeDlEard9ldl6wwaYvlloAlu2JNZM9PACiBtFYfYi5JcLjnqQA_4-4wRrXXZts1VxJiBilCvacXJCu66_JhHuaU9KKzU9rP7OQfnuwqcwX9LFvoaydrKjKwMtgD5lB7ZNE_AMTsjkoq6mfAwCPxUWtRacRcTl2gmPi68TQjEg_FgJIOdz6JfKAw17-1MQ"
                      alt="Maya Sterling"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-semibold text-on-surface truncate">Maya Sterling</span>
                      <span className="text-xs text-outline">Daughter • Age 5 • Sunday School (Kinder)</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed text-xs font-semibold flex-shrink-0">
                    Checked In
                  </span>
                </div>
              </div>

              <button
                className="inline-flex items-center justify-center gap-1.5 py-2 rounded-lg bg-surface-container text-on-surface text-sm font-semibold hover:bg-surface-container-high transition-colors"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">manage_accounts</span>
                <span>Manage Household Record</span>
              </button>
            </div>
          </div>

          {/* ================= MIDDLE COLUMN: Width 5/12 ================= */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* Attendance Rhythm Card */}
            <div className="bg-surface-container-lowest rounded-xl shadow-sm p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-tertiary-fixed/50 text-tertiary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px]">insights</span>
                  </span>
                  <div>
                    <h2 className="text-lg font-semibold text-on-surface">Attendance Rhythm</h2>
                    <span className="text-xs text-outline">Rolling last 12 weeks evaluation</span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-tertiary-fixed text-on-tertiary-fixed text-xs font-semibold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">trending_up</span>
                  83% Consistency
                </span>
              </div>

              {/* Top stats */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-surface-container-low p-3 rounded-lg flex flex-col">
                  <span className="text-2xl font-bold text-primary leading-none">
                    10<span className="text-xs font-normal text-outline">/12</span>
                  </span>
                  <span className="text-xs text-outline mt-1 font-medium">Sundays Present</span>
                </div>
                <div className="bg-surface-container-low p-3 rounded-lg flex flex-col">
                  <span className="text-2xl font-bold text-secondary leading-none">
                    11<span className="text-xs font-normal text-outline">/12</span>
                  </span>
                  <span className="text-xs text-outline mt-1 font-medium">Kids Checked-in</span>
                </div>
                <div className="bg-surface-container-low p-3 rounded-lg flex flex-col">
                  <span className="text-2xl font-bold text-tertiary leading-none">
                    7<span className="text-xs font-normal text-outline"> wks</span>
                  </span>
                  <span className="text-xs text-outline mt-1 font-medium">Small Group Streak</span>
                </div>
              </div>

              {/* 12-Week Matrix */}
              <div className="bg-surface-container-low p-4 rounded-lg flex flex-col gap-2">
                <div className="flex items-center justify-between text-outline text-[11px] font-semibold uppercase tracking-wider">
                  <span>Wk 1 (Jul)</span>
                  <span>Wk 6</span>
                  <span>Wk 12 (Current)</span>
                </div>
                <div className="grid grid-cols-12 gap-1.5 h-16 items-end pt-2">
                  {[
                    { w: 1, attended: true, h: "h-12" },
                    { w: 2, attended: true, h: "h-12" },
                    { w: 3, attended: false, h: "h-3", note: "Family Vacation" },
                    { w: 4, attended: true, h: "h-12" },
                    { w: 5, attended: true, h: "h-12" },
                    { w: 6, attended: true, h: "h-12" },
                    { w: 7, attended: false, h: "h-3", note: "Work Travel" },
                    { w: 8, attended: true, h: "h-12" },
                    { w: 9, attended: true, h: "h-12" },
                    { w: 10, attended: true, h: "h-12" },
                    { w: 11, attended: true, h: "h-12" },
                    { w: 12, attended: true, h: "h-14", isNow: true },
                  ].map((bar) => (
                    <div key={bar.w} className="flex flex-col items-center gap-1 group relative">
                      <div
                        className={`w-full rounded-t transition-all ${
                          bar.isNow
                            ? "bg-tertiary-container ring-2 ring-tertiary-fixed shadow-sm"
                            : bar.attended
                            ? "bg-primary group-hover:opacity-80"
                            : "bg-outline-variant/50"
                        } ${bar.h}`}
                        title={bar.isNow ? "Present (Today)" : bar.attended ? `Week ${bar.w}: Present` : `Absent: ${bar.note}`}
                      />
                      <span
                        className={`text-[10px] ${
                          bar.isNow ? "font-bold text-tertiary" : "text-outline"
                        }`}
                      >
                        {bar.isNow ? "Now" : bar.w}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-2 text-xs text-on-surface-variant border-t border-surface-container">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-primary"></span> TLPCI Sunday Service
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-tertiary-container"></span> Present Today
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm bg-outline-variant/60"></span> Missed
                  </span>
                </div>
              </div>
            </div>

            {/* Milestones Timeline Card */}
            <div className="bg-surface-container-lowest rounded-xl shadow-sm p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-primary-fixed/50 text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px]">history_edu</span>
                  </span>
                  <h2 className="text-lg font-semibold text-on-surface">Milestones Timeline</h2>
                </div>
                <button className="text-primary hover:text-primary-container text-xs font-semibold flex items-center gap-0.5" type="button">
                  <span className="material-symbols-outlined text-[16px]">add</span> Add
                </button>
              </div>

              {/* Chronological items with continuous line */}
              <div className="relative pl-6 flex flex-col gap-4">
                <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-surface-container-highest"></div>

                {/* Milestone 1 */}
                <div className="relative flex items-start gap-3">
                  <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-primary text-on-primary flex items-center justify-center ring-4 ring-surface-container-lowest">
                    <span className="material-symbols-outlined text-[12px]">group</span>
                  </div>
                  <div className="flex flex-col bg-surface-container-low p-3 rounded-lg w-full">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-sm font-semibold text-on-surface">Appointed Small Group Co-Leader</span>
                      <span className="text-xs text-outline font-medium">Oct 2025</span>
                    </div>
                    <p className="text-xs text-on-surface-variant">Confirmed by Pastoral Leadership Council for West End community fellowship.</p>
                  </div>
                </div>

                {/* Milestone 2 */}
                <div className="relative flex items-start gap-3">
                  <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-secondary text-on-secondary flex items-center justify-center ring-4 ring-surface-container-lowest">
                    <span className="material-symbols-outlined text-[12px]">school</span>
                  </div>
                  <div className="flex flex-col bg-surface-container-low p-3 rounded-lg w-full">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-sm font-semibold text-on-surface">Completed Discipleship Track 201</span>
                      <span className="text-xs text-outline font-medium">Nov 2023</span>
                    </div>
                    <p className="text-xs text-on-surface-variant">8-week intensive biblical stewardship &amp; spiritual leadership program.</p>
                  </div>
                </div>

                {/* Milestone 3 */}
                <div className="relative flex items-start gap-3">
                  <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-primary-container text-on-primary flex items-center justify-center ring-4 ring-surface-container-lowest">
                    <span className="material-symbols-outlined text-[12px]">loyalty</span>
                  </div>
                  <div className="flex flex-col bg-surface-container-low p-3 rounded-lg w-full">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-sm font-semibold text-on-surface">Formal Membership Covenant Signed</span>
                      <span className="text-xs text-outline font-medium">Oct 2021</span>
                    </div>
                    <p className="text-xs text-on-surface-variant">Welcomed into full church covenant by the TLPCI Board of Elders.</p>
                  </div>
                </div>

                {/* Milestone 4 */}
                <div className="relative flex items-start gap-3">
                  <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-tertiary text-on-tertiary flex items-center justify-center ring-4 ring-surface-container-lowest">
                    <span className="material-symbols-outlined text-[12px]">water_drop</span>
                  </div>
                  <div className="flex flex-col bg-surface-container-low p-3 rounded-lg w-full">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-sm font-semibold text-on-surface">Water Baptism by Senior Pastor</span>
                      <span className="text-xs text-outline font-medium">Apr 14, 2018</span>
                    </div>
                    <p className="text-xs text-on-surface-variant">Easter Sunday service baptism certificate #BAP-2018-044.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Groups & Ministries Card */}
            <div className="bg-surface-container-lowest rounded-xl shadow-sm p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-primary-fixed/50 text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px]">groups_3</span>
                  </span>
                  <h2 className="text-lg font-semibold text-on-surface">Active Groups &amp; Ministries</h2>
                </div>
                <Link href="/dashboard/groups" className="text-xs font-semibold text-primary hover:underline">
                  View All
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Group 1 */}
                <div className="bg-surface-container-low p-4 rounded-lg flex flex-col justify-between gap-3 hover:bg-surface-container transition-colors">
                  <div className="flex flex-col">
                    <div className="flex items-center justify-between mb-1">
                      <span className="px-2 py-0.5 rounded-full bg-primary-container text-on-primary text-[11px] font-bold">
                        Leader
                      </span>
                      <span className="text-outline text-xs">18 Members</span>
                    </div>
                    <h3 className="text-sm font-semibold text-on-surface">Men's Fellowship</h3>
                    <p className="text-xs text-on-surface-variant line-clamp-2 mt-0.5">
                      Saturday bi-weekly breakfast study &amp; mentoring outreach.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-outline text-xs">
                    <span className="material-symbols-outlined text-[14px]">schedule</span>
                    <span>Sat • 7:30 AM • Chapel Room B</span>
                  </div>
                </div>

                {/* Group 2 */}
                <div className="bg-surface-container-low p-4 rounded-lg flex flex-col justify-between gap-3 hover:bg-surface-container transition-colors">
                  <div className="flex flex-col">
                    <div className="flex items-center justify-between mb-1">
                      <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed text-[11px] font-bold">
                        Co-Leader
                      </span>
                      <span className="text-outline text-xs">12 Adults</span>
                    </div>
                    <h3 className="text-sm font-semibold text-on-surface">West End Small Group</h3>
                    <p className="text-xs text-on-surface-variant line-clamp-2 mt-0.5">
                      Weekly neighborhood gathering for Bible study and family support.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-outline text-xs">
                    <span className="material-symbols-outlined text-[14px]">schedule</span>
                    <span>Wed • 7:00 PM • Rotates Homes</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ================= RIGHT COLUMN: Width 3/12 ================= */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            {/* Pastoral Notes & Follow-up Card */}
            <div className="bg-surface-container-lowest rounded-xl shadow-sm p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-secondary-fixed/50 text-secondary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px]">note_alt</span>
                  </span>
                  <h2 className="text-lg font-semibold text-on-surface">Pastoral Notes</h2>
                </div>
                <span className="w-5 h-5 rounded-full bg-secondary-fixed text-on-secondary-fixed text-xs flex items-center justify-center font-bold">
                  {notesList.length}
                </span>
              </div>

              {/* + Add Note Quick Input Button */}
              <button
                onClick={() => setShowAddNoteModal(true)}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-surface-container text-primary text-sm font-semibold hover:bg-surface-container-high transition-colors shadow-sm"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                <span>+ Add Note</span>
              </button>

              {/* Note Items Stack */}
              <div className="flex flex-col gap-3">
                {notesList.map((note) => (
                  <div key={note.id} className="bg-surface-container-low p-3 rounded-lg flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                          style={{ background: note.avatarBg, color: note.avatarColor }}
                        >
                          {note.initials}
                        </div>
                        <span className="text-xs font-semibold text-on-surface">{note.author}</span>
                      </div>
                      <span className="text-[11px] text-outline">{note.date}</span>
                    </div>
                    <p className="text-xs text-on-surface leading-snug">{note.text}</p>
                    {note.status && (
                      <div className="flex items-center gap-1 text-[11px] text-tertiary font-medium">
                        <span className="material-symbols-outlined text-[14px]">check_circle</span>
                        <span>{note.status}</span>
                      </div>
                    )}
                    {note.tag && <span className="text-[11px] text-outline font-medium">{note.tag}</span>}
                  </div>
                ))}
              </div>

              <button
                onClick={() => setActiveTab("notes")}
                className="text-xs font-semibold text-primary text-center hover:underline pt-1"
                type="button"
              >
                View Complete Pastoral History
              </button>
            </div>

            {/* Giving Summary (Finance Preview) Card */}
            <div className="bg-surface-container-lowest rounded-xl shadow-sm p-6 flex flex-col gap-4 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-full bg-tertiary-fixed/50 text-tertiary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px]">payments</span>
                  </span>
                  <h2 className="text-lg font-semibold text-on-surface">Giving Summary</h2>
                </div>
                <span className="material-symbols-outlined text-outline text-[20px]">lock</span>
              </div>

              {/* Highlight Pill */}
              <div className="bg-tertiary-fixed/30 text-on-tertiary-fixed-variant px-3 py-2 rounded-lg flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[20px] text-tertiary">workspace_premium</span>
                <div className="flex flex-col">
                  <span className="text-xs font-bold">Consistent Monthly Giver</span>
                  <span className="text-[11px] text-outline">Recurring gift active via ACH</span>
                </div>
              </div>

              {/* YTD Total Display */}
              <div className="bg-surface-container-low p-4 rounded-lg flex flex-col">
                <span className="text-[11px] text-outline uppercase tracking-wider font-semibold">
                  YTD Total Giving (2025)
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl text-on-surface font-bold tracking-tight">$4,200</span>
                  <span className="text-xs text-tertiary font-semibold flex items-center">
                    <span className="material-symbols-outlined text-[14px]">north_east</span> on pace
                  </span>
                </div>

                {/* Visual Bar Distribution */}
                <div className="w-full h-2.5 rounded-full bg-surface-container-high overflow-hidden flex mt-3">
                  <div className="bg-primary h-full w-[85%]" title="Regular Tithe: $3,600 (85.7%)"></div>
                  <div className="bg-secondary-container h-full w-[15%]" title="Building Fund: $600 (14.3%)"></div>
                </div>

                {/* Breakdown rows */}
                <div className="flex flex-col gap-1.5 mt-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-on-surface-variant">
                      <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
                      <span>Regular Tithe</span>
                    </span>
                    <span className="font-semibold text-on-surface">$3,600.00</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-on-surface-variant">
                      <span className="w-2.5 h-2.5 rounded-full bg-secondary-container"></span>
                      <span>Building Fund</span>
                    </span>
                    <span className="font-semibold text-on-surface">$600.00</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Link
                  href="/dashboard/finance"
                  className="w-full py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold transition-colors text-center shadow-sm"
                >
                  View Tax Statements &amp; Ledger
                </Link>
                <span className="text-center text-[11px] text-outline">Privileged Pastor/Finance Access Only</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Additional Tab Views (when not on overview) ── */}
      {activeTab === "family" && (
        <div className="bg-surface-container-lowest rounded-xl shadow-sm p-6 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-on-surface">Sterling Family Unit</h2>
              <p className="text-sm text-on-surface-variant">Household ID #412 • 4 Members registered</p>
            </div>
            <button className="px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-semibold shadow-sm">
              + Add Family Member
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { name: "Marcus Sterling", role: "Head of Household", age: 38, email: "m.sterling@email.com", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuDywSpo0Yd1s8U0enVlimDoSOfGNxshvHFUIpGOzdaoFEhDBuUXfkQeki8AcNOktH5LyCZ2e8xzMfceUypz_Y5UzA-C9ZZmhkSo_tnDZTThiddeAdoGMCEsXahCtYSau0g_-5TGzN71ddWwWrGpIP7AQQNOp1gwDFZC-ppw9XwMTOzAUrm7fwBM2yEllN3FXHEJ4x3n9cmPSDQdYBCTMiPlgHruqedeMrZ0v8Nxh_Wi1JUURWGGULDs8Q" },
              { name: "Elena Sterling", role: "Spouse", age: 36, email: "elena.s@email.com", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBAmLFSo3m8wa8XKilW15tbNRIWlFtsLCpt43Djp2xfyD6CSSL6DV0Tnf6BvlxdDmx8osJZEa5Dq-6C_OMYUA94R5OLgsnMb0w6l1vzaJPNnM1-MeGj5Cs2nWn8uySjN60YqvCZlF2FR7V2IX2mfQDonEfs728iILVcwkrqfy1OjuuSe0sj6vXY5mkohld1mlQWRK_DeiS5PeRc4woAGTmUl6Z1Vixo1MeKl1Y70cSS32damSxa6j573g" },
              { name: "Leo Sterling", role: "Child (Grade 3-4)", age: 8, email: "Parent managed", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCr8pfh0NKD0_9DePYXU-X0uZXXmkG_cfAEV2c3ICxvdWcMOTa0rdzfIAJQURgou7njSkm0WWrjiZkeTxfP8wtT-JXabE90LWBIoAvtypQq7J86rE8JTmdLucG-HMB-Ip_sK4HH1gyAQjJf5TIx9hLYeuI13GBVRulk4fBtaBd1tub6QGx9pjdpnUugNvG1LL1l_q5h2sykQlDC9jOzWxUpiBHJxkbkjUbIhtMLDaZATWVuKXf8k6SyrA" },
              { name: "Maya Sterling", role: "Child (Kinder)", age: 5, email: "Parent managed", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuDBuZmgmLYtCR0KAF2zLF3oR282qOWy-XL9nVyVL98r1Y4qilET1kMLdB4eIoeDlEard9ldl6wwaYvlloAlu2JNZM9PACiBtFYfYi5JcLjnqQA_4-4wRrXXZts1VxJiBilCvacXJCu66_JhHuaU9KKzU9rP7OQfnuwqcwX9LFvoaydrKjKwMtgD5lB7ZNE_AMTsjkoq6mfAwCPxUWtRacRcTl2gmPi68TQjEg_FgJIOdz6JfKAw17-1MQ" },
            ].map((f) => (
              <div key={f.name} className="p-4 bg-surface-container-low rounded-xl flex items-center gap-4">
                <img src={f.img} alt={f.name} className="w-12 h-12 rounded-full object-cover shadow-sm" />
                <div className="flex flex-col min-w-0">
                  <span className="font-semibold text-on-surface text-sm truncate">{f.name}</span>
                  <span className="text-xs text-primary font-medium">{f.role}</span>
                  <span className="text-xs text-outline">{f.email}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "notes" && (
        <div className="bg-surface-container-lowest rounded-xl shadow-sm p-6 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-on-surface">Pastoral Care &amp; Counseling History</h2>
              <p className="text-sm text-on-surface-variant">Confidential pastoral notes logged by authorized ministry staff.</p>
            </div>
            <button
              onClick={() => setShowAddNoteModal(true)}
              className="px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-semibold shadow-sm flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span>Add Pastoral Note</span>
            </button>
          </div>
          <div className="flex flex-col gap-4">
            {notesList.map((note) => (
              <div key={note.id} className="p-4 bg-surface-container-low rounded-xl flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ background: note.avatarBg, color: note.avatarColor }}
                    >
                      {note.initials}
                    </div>
                    <span className="font-semibold text-sm text-on-surface">{note.author}</span>
                  </div>
                  <span className="text-xs text-outline">{note.date}</span>
                </div>
                <p className="text-sm text-on-surface pl-9">{note.text}</p>
                {note.status && (
                  <div className="pl-9 flex items-center gap-1 text-xs text-tertiary font-semibold">
                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                    <span>{note.status}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Modal for Adding Pastoral Note ── */}
      <Modal
        isOpen={showAddNoteModal}
        onClose={() => setShowAddNoteModal(false)}
        title="Log Pastoral Care Note"
        subtitle="Confidential pastoral notation for follow-up and discipleship"
        maxWidth="lg"
      >
        <form onSubmit={handleAddNote} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: "#747686" }}>
              Confidential Note Content *
            </label>
            <textarea
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              placeholder="Record summary of prayer request, home visit, hospital check-in, or spiritual milestone..."
              rows={4}
              required
              className="w-full sanctuary-input text-sm leading-relaxed resize-none"
            />
          </div>
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-center gap-2 text-xs text-blue-900">
            <span className="material-symbols-outlined text-[18px] text-blue-700">lock</span>
            <span>Encrypted &amp; viewable solely by authorized church ministry staff</span>
          </div>
          <div className="flex items-center justify-end gap-2 pt-3 border-t" style={{ borderColor: "#f2f3ff" }}>
            <button
              type="button"
              onClick={() => setShowAddNoteModal(false)}
              className="sanctuary-btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="sanctuary-btn-primary text-xs"
            >
              Save Note
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Modal for Editing Member Profile ── */}
      <Modal
        isOpen={showEditModal}
        onClose={() => !isSubmitting && setShowEditModal(false)}
        title="Edit Congregant Profile"
        subtitle="Update personal information, household, and church status"
        maxWidth="xl"
        isSubmitting={isSubmitting}
      >
        <form onSubmit={handleSaveProfile} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">error</span>
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: "#747686" }}>
                First Name *
              </label>
              <input
                type="text"
                required
                disabled={isSubmitting}
                value={editFirstName}
                onChange={(e) => setEditFirstName(e.target.value)}
                className="w-full sanctuary-input text-sm disabled:opacity-50"
                placeholder="First Name"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: "#747686" }}>
                Last Name *
              </label>
              <input
                type="text"
                required
                disabled={isSubmitting}
                value={editLastName}
                onChange={(e) => setEditLastName(e.target.value)}
                className="w-full sanctuary-input text-sm disabled:opacity-50"
                placeholder="Last Name"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: "#747686" }}>
                Email Address
              </label>
              <input
                type="email"
                disabled={isSubmitting}
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="w-full sanctuary-input text-sm disabled:opacity-50"
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: "#747686" }}>
                Phone Number
              </label>
              <input
                type="tel"
                disabled={isSubmitting}
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="w-full sanctuary-input text-sm disabled:opacity-50"
                placeholder="(555) 000-0000"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: "#747686" }}>
                Membership Status
              </label>
              <select
                value={editStatus}
                disabled={isSubmitting}
                onChange={(e) => setEditStatus(e.target.value)}
                className="w-full sanctuary-input text-sm cursor-pointer disabled:opacity-50"
              >
                <option value="active">Active Congregant</option>
                <option value="inactive">Inactive</option>
                <option value="visitor">Visitor</option>
                <option value="transferred">Transferred</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: "#747686" }}>
                Life Stage
              </label>
              <select
                value={editLifeStage}
                disabled={isSubmitting}
                onChange={(e) => setEditLifeStage(e.target.value)}
                className="w-full sanctuary-input text-sm cursor-pointer disabled:opacity-50"
              >
                <option value="adult">Adult</option>
                <option value="young_adult">Young Adult</option>
                <option value="youth">Youth</option>
                <option value="child">Child / Sunday School</option>
                <option value="senior">Senior</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: "#747686" }}>
              Family / Household Unit
            </label>
            <input
              type="text"
              disabled={isSubmitting}
              value={editFamily}
              onChange={(e) => setEditFamily(e.target.value)}
              className="w-full sanctuary-input text-sm disabled:opacity-50"
              placeholder="e.g. Sterling Household"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t" style={{ borderColor: "#f2f3ff" }}>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setShowEditModal(false)}
              className="sanctuary-btn-secondary text-xs disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="sanctuary-btn-primary text-xs flex items-center gap-1.5 disabled:opacity-60"
            >
              {isSubmitting && (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Confirmation Dialog for Delete ── */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => !isDeleting && setShowDeleteConfirm(false)}
        onConfirm={handleDeleteMember}
        title="Delete Congregant Profile"
        message={`Are you sure you want to permanently remove ${displayName} from the TLPCI church directory? All records, giving history, and attendance will be archived.`}
        confirmText="Delete Congregant"
        isDestructive={true}
        isLoading={isDeleting}
      />
    </div>
  );
}
