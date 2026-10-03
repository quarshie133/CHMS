"use client";

import { useState } from "react";
import Link from "next/link";
import { Modal, ConfirmDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";

interface PermissionRow {
  module: string;
  desc: string;
  icon: string;
  iconBg?: string;
  iconColor?: string;
  restricted?: boolean;
  restrictedNote?: string;
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  export: boolean;
}

interface RoleItem {
  id: string;
  title: string;
  badge: string;
  badgeBg: string;
  badgeColor: string;
  tier: string;
  icon: string;
  iconColor?: string;
  assignedCount: number;
  assignedLabel: string;
  assignedText: string;
  avatars?: string[];
  avatarInitials?: { text: string; bg: string; color: string }[];
  defaultPermissions: {
    view: boolean[];
    create: boolean[];
    edit: boolean[];
    delete: boolean[];
    export: boolean[];
  };
}

const ROLES: RoleItem[] = [
  {
    id: "super_admin",
    title: "Super Admin / Pastor",
    badge: "Full System Access",
    badgeBg: "bg-surface-container-high",
    badgeColor: "text-primary",
    tier: "Full Access Tier",
    icon: "verified_user",
    assignedCount: 3,
    assignedLabel: "3 Staff Assigned",
    assignedText: "Senior Pastor Grace Miller, Associate Pastor Marcus Vance, Executive Pastor Ruth Perez",
    avatars: [
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAZoG2SIK99sb6MEF4s_yO14ssVEjIHRQiSb2hZNm2PSLXNg0aIxVwQzWsqn73ktz216S9A-Zj2jSP_NPUWldzRBxUlJb8oSQ7X501Gh2txszODMlrwC_G_JvxLcTNgSxYObWzjttJlthgLfF5DfpbtmFgBva1f9me86NDnexpgPANPqkrCzhQKy4kbXBf14dXnzFyQ3pc7eUi0ytvybJZnyBryomC2AMTEOyhg4jAhIQe0X2DwiKrpyw",
      "https://lh3.googleusercontent.com/aida-public/AB6AXuD-aiMN8y-o7JqVADZao5jQqnHCyEaaUf7PBLSPV1GJm73cm_UkKWMP7Vo8VVX2O-a6QmX6b4BsGEgZdSP6kV57KIErkcxWDFMqjBUepg1CezZfgdHpP5z5EAJQKUzq7nQTcA0U4R___iU87WMfgpOyCIqUzRkxsEt5LFJlo7egvqRi0UIT20gAXqTdwG6YnwhiIHDd3BXTftd2bXTMkKpJLqo7NL8s0fQsQ7p-Kz722e8jFto8rciaYQ",
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDm_C89jk3wn_7ZNGuRyUovc870lPre_ziu1qBA-kOzwEtVep5dInct5ic121T_RSeLZrD2cQkSsjr6v8I1EiMYdu0VbDfKZPkOV2mBb84jDR_pDpibGYogxmeHzTT8Zx1SfyusaYGa1H8VYKfWzepLTKOM8W6_sHN0-amPAdJB-D_UmMSwPnnRtYyacHd-LMcjmSsjc0k65n63Aqgl871Ka8gMx_43ZOQVh3ultOQJoPImvpZ3GgSeZw",
    ],
    defaultPermissions: {
      view: [true, true, true, true, true, true, true, true, true],
      create: [true, true, true, true, true, true, true, true, true],
      edit: [true, true, true, true, true, true, true, true, true],
      delete: [true, true, true, true, true, true, true, true, true],
      export: [true, true, true, true, true, true, true, true, true],
    },
  },
  {
    id: "church_admin",
    title: "Church Admin / Secretary",
    badge: "Operations",
    badgeBg: "bg-surface-container-highest",
    badgeColor: "text-on-surface-variant",
    tier: "Standard Tier",
    icon: "group",
    assignedCount: 4,
    assignedLabel: "4 Staff Assigned",
    assignedText: "Pastor Grace Miller, Deacon Osei, +2 others assigned",
    avatars: [
      "https://lh3.googleusercontent.com/aida-public/AB6AXuD1zkpcOnuB0Eh5vZ1dqPG7NuSo5ZSaLGpCagkuWRdMHOdK4SPq9yZWA8_T2SU66Ku3y6A_-P_k1u7AokSdBPRmkSYThJzd5-zcdouqNTi01PHLMrXLxnGhFzWLJZIYQgdVqtygnE8s33LfN8SUZf2oB8J9rPwRX0b5RKCXkemjF5KRsGQR_3Pgn7XWExaLEIDBAH3td_R7qjeH70W_9TvDF2AZbqSzaZR24upQoaqEEjHum5FVJhjxig",
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBYYE7W2rA-4AXwr2NFIaZPxbfUBoJPWbOLJfgyRgK2o1nwqfhow8fWoDM7Lhf6P3YwegCJti2xJFjSoxGGe6CjuT7c--9lgDgONnxXamBql-gv7ZJ4revWYG-VELEPCbARFNGVbbAcfygawQIF1NBQqknLCzjcIuqgtlg7iQYfJb5CD6bNItf9iQprtgN2e2wFnVeBJMzK31RSwxAXH3OqKn67LbG5-MGt7g1X8A-iDxV3JrzyUqmqBQ",
      "https://lh3.googleusercontent.com/aida-public/AB6AXuA_UCaF4u9lRgQm9AY5PekxmnQhxJ-Y2by2K-sFmNOuE2G7LBuy_3HRezy57QzBcY07ZSrOdx-yLpH0xhCdsxMwTx2-r-D7jIwdSw6IfhPowu1Ck9qzLULr4uMYw2yokah6XGy9QgHBJvjm7pPfoIgWVe5tfDm1ZuKCkFRk9GVZM-JRqezsmbljSDtktNlxQ-1jhUCZs7y7XYmbi4LdWWXs_wyaQdyFAUPC43xGY_tfvnk-c4gr9aOihw",
    ],
    defaultPermissions: {
      view: [true, true, true, true, true, false, true, true, false],
      create: [true, true, true, true, true, false, true, false, false],
      edit: [true, true, true, true, true, false, true, false, false],
      delete: [false, false, false, false, true, false, false, false, false],
      export: [true, false, false, true, true, false, false, true, false],
    },
  },
  {
    id: "finance_officer",
    title: "Finance Officer",
    badge: "Financial Ledger & Giving",
    badgeBg: "bg-secondary-fixed/50",
    badgeColor: "text-secondary",
    tier: "Financial Tier",
    icon: "payments",
    iconColor: "text-secondary",
    assignedCount: 2,
    assignedLabel: "2 Staff Assigned",
    assignedText: "Arthur Pendelton, Linda Martinez",
    avatars: [
      "https://lh3.googleusercontent.com/aida-public/AB6AXuDnTsFOrtzhNiaKQgjYiMB-Im_v2M7Bs2TvZaG3IAeOOky_K19U0xdp_adC735n83z2Yn45S3RO9mBo9EmZ_Nf_lAARGsIK5vcJ1pU_Fy7ya7IsVP979xCmsiST-2beCvHbCd76ZK2erpXSVuCorEBget4HecPfgOq_tII4WY4XzWpLfRnaDOUEAM51bvoKS6838OaUY-5OP7eusKaZZacNaUiCp8aaahzWyM4WDlgb-cstxjcwChZYew",
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCIA7MiFQAF9cilgf_OPVWPG6rFvInDh6Neh7e8tN35KAePyWL1-e53l64umxo50bcPGdw6Zni6r7RIRKcSgiWKo79EgVGZ2AQ_D6y1XkftlaGfd4TbKJ_iip-D8kmetRElyqnLSewloHYhZVBipr7vwh_O-SESraDkDxtb4xT3b_re_CRzdeKfyFip3OjngW0x8j9GecRBHa5D9vgGsFGlj3qmbM7eeLk4OAR2bIXLznXmKrM-hG9fPA",
    ],
    defaultPermissions: {
      view: [true, false, false, false, false, true, true, true, false],
      create: [false, false, false, false, false, true, true, true, false],
      edit: [false, false, false, false, false, true, true, false, false],
      delete: [false, false, false, false, false, false, false, false, false],
      export: [true, false, false, false, false, true, true, true, false],
    },
  },
  {
    id: "ministry_leader",
    title: "Group / Ministry Leader",
    badge: "Ministry Level",
    badgeBg: "bg-surface-container",
    badgeColor: "text-on-surface-variant",
    tier: "Ministry Tier",
    icon: "groups_3",
    assignedCount: 8,
    assignedLabel: "8 Users Assigned",
    assignedText: "8 Volunteer coordinators and small group leaders",
    avatarInitials: [
      { text: "GL", bg: "#dae2fd", color: "#131b2e" },
      { text: "YM", bg: "#eaedff", color: "#131b2e" },
    ],
    defaultPermissions: {
      view: [true, true, false, true, true, false, false, false, false],
      create: [false, true, false, true, false, false, false, false, false],
      edit: [false, true, false, false, false, false, false, false, false],
      delete: [false, false, false, false, false, false, false, false, false],
      export: [false, false, false, false, false, false, false, false, false],
    },
  },
  {
    id: "sunday_school",
    title: "Sunday School Teacher",
    badge: "Children & Check-in",
    badgeBg: "bg-tertiary-fixed/30",
    badgeColor: "text-tertiary",
    tier: "Sunday School Tier",
    icon: "school",
    iconColor: "text-tertiary",
    assignedCount: 6,
    assignedLabel: "6 Users",
    assignedText: "6 Teachers assigned to children's church rooms",
    defaultPermissions: {
      view: [true, false, true, false, false, false, false, false, false],
      create: [false, false, true, false, false, false, false, false, false],
      edit: [false, false, true, false, false, false, false, false, false],
      delete: [false, false, false, false, false, false, false, false, false],
      export: [false, false, false, false, false, false, false, false, false],
    },
  },
  {
    id: "volunteer_usher",
    title: "Volunteer Usher / Greeter",
    badge: "Kiosk & Attendance",
    badgeBg: "bg-surface-container",
    badgeColor: "text-on-surface-variant",
    tier: "Volunteer Tier",
    icon: "badge",
    assignedCount: 14,
    assignedLabel: "14 Users",
    assignedText: "Sunday Morning Welcome and check-in team",
    defaultPermissions: {
      view: [true, false, false, false, true, false, false, false, false],
      create: [false, false, false, false, false, false, false, false, false],
      edit: [false, false, false, false, false, false, false, false, false],
      delete: [false, false, false, false, false, false, false, false, false],
      export: [false, false, false, false, false, false, false, false, false],
    },
  },
  {
    id: "auditor",
    title: "Read-Only Auditor",
    badge: "Audit & Reports",
    badgeBg: "bg-surface-container-low",
    badgeColor: "text-outline",
    tier: "Audit Tier",
    icon: "assignment",
    iconColor: "text-outline",
    assignedCount: 1,
    assignedLabel: "1 User",
    assignedText: "TLPCI Overseer Board Member",
    defaultPermissions: {
      view: [true, true, true, true, true, true, true, true, false],
      create: [false, false, false, false, false, false, false, false, false],
      edit: [false, false, false, false, false, false, false, false, false],
      delete: [false, false, false, false, false, false, false, false, false],
      export: [true, true, true, true, true, true, true, true, false],
    },
  },
];

const MODULE_DEFINITIONS = [
  {
    module: "People & Directory",
    desc: "Congregant profiles, families, contact cards",
    icon: "contacts",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
  },
  {
    module: "Groups & Ministries",
    desc: "Small groups, bible studies, choir rosters",
    icon: "groups",
    iconBg: "bg-surface-container",
    iconColor: "text-on-surface-variant",
  },
  {
    module: "Sunday School & Check-in",
    desc: "Child safety security tags, guardian checkout",
    icon: "child_care",
    iconBg: "bg-surface-container",
    iconColor: "text-on-surface-variant",
  },
  {
    module: "Communication & Broadcasts",
    desc: "Congregation newsletters, SMS alert blast",
    icon: "forward_to_inbox",
    iconBg: "bg-surface-container",
    iconColor: "text-on-surface-variant",
  },
  {
    module: "Events & Calendar",
    desc: "Service scheduling, baptisms, hall booking",
    icon: "calendar_month",
    iconBg: "bg-surface-container",
    iconColor: "text-on-surface-variant",
  },
  {
    module: "Finance & Giving Ledger",
    desc: "Tithe envelopes, online pledges, donor statements",
    icon: "lock",
    iconBg: "bg-secondary-fixed/50",
    iconColor: "text-secondary",
    restricted: true,
    restrictedNote: "Restricted to Finance Officer & Super Admin",
  },
  {
    module: "Fundraiser Campaigns",
    desc: "Building funds, missionary support goals",
    icon: "volunteer_activism",
    iconBg: "bg-surface-container",
    iconColor: "text-on-surface-variant",
  },
  {
    module: "Reports & Analytics",
    desc: "Weekly service attendance averages, growth metrics",
    icon: "query_stats",
    iconBg: "bg-surface-container",
    iconColor: "text-on-surface-variant",
  },
  {
    module: "Admin Settings & Billing",
    desc: "Church subscription plan, Diocesan sync API keys",
    icon: "settings",
    iconBg: "bg-surface-container",
    iconColor: "text-on-surface-variant",
  },
];

export default function RolesPermissionsPage() {
  const { success, error, info } = useToast();
  const [rolesList, setRolesList] = useState<RoleItem[]>(ROLES);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("church_admin");
  const [searchFilter, setSearchFilter] = useState("");
  const [campusScope, setCampusScope] = useState<"all" | "local">("local");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Create Role Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBadge, setNewBadge] = useState("");
  const [newTier, setNewTier] = useState("Standard Tier");
  const [newDesc, setNewDesc] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Edit Role Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editBadge, setEditBadge] = useState("");
  const [editTier, setEditTier] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // Delete Role State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const selectedRole = rolesList.find((r) => r.id === selectedRoleId) || rolesList[0];

  // Matrix state initialized from selected role
  const [matrixState, setMatrixState] = useState<PermissionRow[]>(() => {
    return MODULE_DEFINITIONS.map((def, idx) => ({
      ...def,
      view: selectedRole.defaultPermissions.view[idx],
      create: selectedRole.defaultPermissions.create[idx],
      edit: selectedRole.defaultPermissions.edit[idx],
      delete: selectedRole.defaultPermissions.delete[idx],
      export: selectedRole.defaultPermissions.export[idx],
    }));
  });

  const handleSelectRole = (r: RoleItem) => {
    setSelectedRoleId(r.id);
    setMatrixState(
      MODULE_DEFINITIONS.map((def, idx) => ({
        ...def,
        view: r.defaultPermissions.view[idx] ?? true,
        create: r.defaultPermissions.create[idx] ?? false,
        edit: r.defaultPermissions.edit[idx] ?? false,
        delete: r.defaultPermissions.delete[idx] ?? false,
        export: r.defaultPermissions.export[idx] ?? false,
      }))
    );
    setHasUnsavedChanges(false);
  };

  const handleToggle = (rowIndex: number, col: keyof Omit<PermissionRow, "module" | "desc" | "icon" | "iconBg" | "iconColor" | "restricted" | "restrictedNote">) => {
    const row = matrixState[rowIndex];
    if (row.restricted && selectedRole.id !== "super_admin" && selectedRole.id !== "finance_officer") {
      info("This module is restricted by church security governance.");
      return;
    }
    setMatrixState((prev) => {
      const next = [...prev];
      next[rowIndex] = { ...next[rowIndex], [col]: !next[rowIndex][col] };
      return next;
    });
    setHasUnsavedChanges(true);
  };

  const bulkSetPermissions = (type: "view" | "all", checked: boolean) => {
    setMatrixState((prev) =>
      prev.map((row) => {
        if (row.restricted && selectedRole.id !== "super_admin" && selectedRole.id !== "finance_officer") {
          return row;
        }
        if (type === "view") {
          return { ...row, view: checked };
        } else {
          return {
            ...row,
            view: checked,
            create: checked,
            edit: checked,
            delete: checked,
            export: checked,
          };
        }
      })
    );
    setHasUnsavedChanges(true);
  };

  const resetToDefault = () => {
    setMatrixState(
      MODULE_DEFINITIONS.map((def, idx) => ({
        ...def,
        view: selectedRole.defaultPermissions.view[idx] ?? true,
        create: selectedRole.defaultPermissions.create[idx] ?? false,
        edit: selectedRole.defaultPermissions.edit[idx] ?? false,
        delete: selectedRole.defaultPermissions.delete[idx] ?? false,
        export: selectedRole.defaultPermissions.export[idx] ?? false,
      }))
    );
    setHasUnsavedChanges(false);
    info("Reset permissions back to saved defaults.");
  };

  const saveChanges = async () => {
    setIsSaving(true);
    // Simulate brief network dispatch to replicate DRF save
    await new Promise((r) => setTimeout(r, 400));
    setRolesList((prev) =>
      prev.map((r) => {
        if (r.id === selectedRole.id) {
          return {
            ...r,
            defaultPermissions: {
              view: matrixState.map((m) => m.view),
              create: matrixState.map((m) => m.create),
              edit: matrixState.map((m) => m.edit),
              delete: matrixState.map((m) => m.delete),
              export: matrixState.map((m) => m.export),
            },
          };
        }
        return r;
      })
    );
    setHasUnsavedChanges(false);
    setIsSaving(false);
    success(`Permissions for "${selectedRole.title}" saved successfully.`);
  };

  const handleCreateRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      error("Role title is required.");
      return;
    }
    setIsCreating(true);
    const id = newTitle.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const newRole: RoleItem = {
      id,
      title: newTitle.trim(),
      badge: newBadge.trim() || "Custom Role",
      badgeBg: "bg-surface-container-high",
      badgeColor: "text-primary",
      tier: newTier,
      icon: "shield_person",
      assignedCount: 0,
      assignedLabel: "0 Users",
      assignedText: newDesc.trim() || "Custom leadership role",
      defaultPermissions: {
        view: matrixState.map(() => true),
        create: matrixState.map(() => false),
        edit: matrixState.map(() => false),
        delete: matrixState.map(() => false),
        export: matrixState.map(() => false),
      },
    };
    setRolesList((prev) => [...prev, newRole]);
    setSelectedRoleId(id);
    handleSelectRole(newRole);
    setIsCreating(false);
    setShowCreateModal(false);
    setNewTitle("");
    setNewBadge("");
    setNewDesc("");
    success(`Role "${newRole.title}" created successfully.`);
  };

  const openEditModal = () => {
    setEditTitle(selectedRole.title);
    setEditBadge(selectedRole.badge);
    setEditTier(selectedRole.tier);
    setShowEditModal(true);
  };

  const handleEditRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim()) {
      error("Role title is required.");
      return;
    }
    setIsEditing(true);
    setRolesList((prev) =>
      prev.map((r) => {
        if (r.id === selectedRole.id) {
          return {
            ...r,
            title: editTitle.trim(),
            badge: editBadge.trim() || r.badge,
            tier: editTier || r.tier,
          };
        }
        return r;
      })
    );
    setIsEditing(false);
    setShowEditModal(false);
    success(`Role "${editTitle}" updated successfully.`);
  };

  const handleDeleteRole = () => {
    if (selectedRole.id === "super_admin") {
      error("The Super Admin / Pastor role cannot be removed.");
      setShowDeleteConfirm(false);
      return;
    }
    setIsDeleting(true);
    const updated = rolesList.filter((r) => r.id !== selectedRole.id);
    setRolesList(updated);
    if (updated.length > 0) {
      setSelectedRoleId(updated[0].id);
      handleSelectRole(updated[0]);
    }
    setIsDeleting(false);
    setShowDeleteConfirm(false);
    success(`Role "${selectedRole.title}" removed.`);
  };

  const filteredRoles = rolesList.filter(
    (r) =>
      r.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      r.badge.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto space-y-6">
      {/* ── Breadcrumb & Top Bar Section ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-col space-y-1">
          <nav className="flex items-center space-x-1.5 text-on-surface-variant text-xs font-semibold">
            <Link href="/dashboard" className="hover:text-primary transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">home</span>
              Home
            </Link>
            <span className="material-symbols-outlined text-[14px] text-outline">chevron_right</span>
            <span className="text-on-surface-variant">Admin</span>
            <span className="material-symbols-outlined text-[14px] text-outline">chevron_right</span>
            <span className="text-primary font-semibold">Roles &amp; Permissions</span>
          </nav>
          <div className="flex items-baseline gap-2 pt-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-on-surface">Roles &amp; Permissions</h1>
            <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-primary-fixed text-[11px] font-semibold tracking-wide uppercase">
              Security Tier 1
            </span>
          </div>
          <p className="text-sm text-on-surface-variant max-w-3xl">
            Configure system roles and define granular module access for church ministry staff, staff, and volunteer leaders.
          </p>
        </div>

        {/* Top Bar Actions */}
        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
          <div className="relative w-full sm:w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">
              search
            </span>
            <input
              type="search"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filter roles &amp; tags..."
              className="w-full bg-surface-container-lowest pl-9 pr-3 py-2 rounded-xl text-xs sm:text-sm text-on-surface placeholder:text-outline shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-on-primary text-sm font-semibold hover:bg-primary-container shadow-sm hover:shadow transition-all shrink-0 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add_moderator</span>
            <span>Create New Role</span>
          </button>
        </div>
      </div>

      {/* ── Main 2-Column Admin Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ================= LEFT COLUMN: Roles Directory (4/12) ================= */}
        <div className="lg:col-span-4 xl:col-span-4 flex flex-col space-y-4">
          {/* Summary Stats Card */}
          <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[20px]">admin_panel_settings</span>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-outline font-semibold">Configured Roles</p>
                <p className="text-lg font-bold text-on-surface">7 Active Roles</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs px-2.5 py-1 rounded-full bg-surface-container-high text-primary font-semibold">
                38 Users
              </span>
            </div>
          </div>

          {/* Role List */}
          <div className="flex flex-col space-y-2">
            {filteredRoles.map((r) => {
              const isSelected = selectedRoleId === r.id;
              return (
                <div
                  key={r.id}
                  onClick={() => handleSelectRole(r)}
                  className={`bg-surface-container-lowest rounded-xl p-4 shadow-sm transition-all cursor-pointer relative overflow-hidden group ${
                    isSelected ? "shadow-md ring-2 ring-primary" : "hover:shadow-md"
                  }`}
                >
                  {isSelected && <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-primary" />}
                  <div className={`flex items-start justify-between ${isSelected ? "pl-1" : ""}`}>
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105 ${
                          isSelected ? "bg-primary text-on-primary shadow-xs" : "bg-surface-container " + (r.iconColor || "text-primary")
                        }`}
                      >
                        <span className="material-symbols-outlined text-[20px]">{r.icon}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h2
                            className={`text-sm font-bold leading-tight ${
                              isSelected ? "text-primary" : "text-on-surface"
                            }`}
                          >
                            {r.title}
                          </h2>
                          {isSelected && <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
                        </div>
                        <span
                          className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${r.badgeBg} ${r.badgeColor}`}
                        >
                          {r.badge}
                        </span>
                      </div>
                    </div>
                    <button
                      className="text-outline hover:text-on-surface p-1 rounded-lg hover:bg-surface-container-low transition-colors"
                      title="Role actions"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[18px]">more_vert</span>
                    </button>
                  </div>

                  <div className={`mt-3 flex items-center justify-between pt-1 text-on-surface-variant text-xs ${isSelected ? "pl-1" : ""}`}>
                    <div className="flex items-center -space-x-2 overflow-hidden">
                      {r.avatars &&
                        r.avatars.map((av, i) => (
                          <img
                            key={i}
                            src={av}
                            alt="Staff"
                            className="inline-block h-6 w-6 rounded-full object-cover shadow-xs border-2 border-white"
                          />
                        ))}
                      {r.avatarInitials &&
                        r.avatarInitials.map((ini, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center justify-center h-6 w-6 rounded-full text-[10px] font-semibold border-2 border-white"
                            style={{ background: ini.bg, color: ini.color }}
                          >
                            {ini.text}
                          </span>
                        ))}
                      {r.id === "church_admin" && (
                        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-surface-container-high text-on-surface text-[10px] font-semibold border-2 border-white">
                          +1
                        </span>
                      )}
                      {r.id === "ministry_leader" && (
                        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-surface-container-high text-on-surface text-[10px] font-semibold border-2 border-white">
                          +6
                        </span>
                      )}
                    </div>
                    <span
                      className={`text-xs ${
                        isSelected ? "text-primary font-bold" : "text-outline font-medium"
                      }`}
                    >
                      {r.assignedLabel}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Role Inheritance Note */}
          <div className="bg-surface-container-low rounded-xl p-4 text-on-surface-variant space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-on-surface">
              <span className="material-symbols-outlined text-[18px] text-primary">info</span>
              Role Hierarchies &amp; Multi-Branch
            </div>
            <p className="text-xs leading-relaxed text-outline">
              Staff with multiple roles receive the highest permission level across modules. Campus overrides take precedence over global roles.
            </p>
          </div>
        </div>

        {/* ================= RIGHT COLUMN: Permission Matrix (8/12) ================= */}
        <div className="lg:col-span-8 xl:col-span-8 flex flex-col space-y-4 pb-24">
          {/* Role Header Card */}
          <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-outline uppercase tracking-wider font-semibold">Configuring Role Profile</span>
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-outline"></span>
                  <span className="text-xs text-tertiary font-bold bg-tertiary-fixed/30 px-2 py-0.5 rounded-full">
                    {selectedRole.tier}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-on-surface">
                  {selectedRole.title}
                </h2>
                <div className="flex items-center gap-3 pt-1">
                  <div className="flex items-center -space-x-2">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-surface-container text-xs font-semibold text-on-surface border-2 border-white">
                      PM
                    </span>
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-surface-container-high text-xs font-semibold text-on-surface border-2 border-white">
                      KO
                    </span>
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-surface-container-highest text-xs font-semibold text-on-surface border-2 border-white">
                      SA
                    </span>
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary-fixed text-xs font-semibold text-on-primary-fixed border-2 border-white">
                      +1
                    </span>
                  </div>
                  <span className="text-xs text-on-surface-variant font-medium">
                    {selectedRole.assignedText}
                  </span>
                </div>
              </div>

              {/* Action Controls */}
              <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                <button
                  type="button"
                  onClick={openEditModal}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container text-xs font-semibold transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px] text-outline">edit</span>
                  Edit Role Name
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-container-low text-error hover:bg-error-container/30 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">delete_outline</span>
                  Delete Role
                </button>
              </div>
            </div>

            {/* Scope and Campus Selector */}
            <div className="bg-surface-container-low rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[20px] text-primary">domain</span>
                <div>
                  <p className="text-xs font-semibold text-on-surface">Campus Enforcement Scope</p>
                  <p className="text-xs text-outline">
                    Define whether these role permissions apply network-wide or solely to local church data.
                  </p>
                </div>
              </div>
              <div className="flex items-center bg-surface-container-lowest p-1 rounded-xl shadow-xs shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setCampusScope("all");
                    setHasUnsavedChanges(true);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    campusScope === "all"
                      ? "bg-primary text-on-primary shadow-xs"
                      : "text-outline hover:text-on-surface"
                  }`}
                >
                  All Campuses
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCampusScope("local");
                    setHasUnsavedChanges(true);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                    campusScope === "local"
                      ? "bg-primary text-on-primary shadow-xs"
                      : "text-outline hover:text-on-surface"
                  }`}
                >
                  <span className="material-symbols-outlined text-[14px]">church</span>
                  TLPCI Central only
                </button>
              </div>
            </div>
          </div>

          {/* Quick Presets Bar */}
          <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-outline text-[20px]">tune</span>
              <span className="text-xs uppercase tracking-wider text-on-surface-variant font-bold">
                Bulk Action Presets:
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => bulkSetPermissions("view", true)}
                className="px-3 py-1.5 rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high text-xs font-semibold transition-colors cursor-pointer"
              >
                Grant All View
              </button>
              <button
                type="button"
                onClick={() => bulkSetPermissions("all", true)}
                className="px-3 py-1.5 rounded-lg bg-primary-fixed/50 text-on-primary-fixed text-xs font-semibold hover:bg-primary-fixed transition-colors cursor-pointer"
              >
                Grant All Full Access
              </button>
              <button
                type="button"
                onClick={resetToDefault}
                className="px-3 py-1.5 rounded-lg bg-surface-container-low text-outline hover:text-on-surface text-xs font-semibold transition-colors cursor-pointer"
              >
                Reset to Default
              </button>
            </div>
          </div>

          {/* Permission Matrix Table */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low text-outline text-xs uppercase tracking-wider font-semibold">
                    <th className="py-3 px-4" scope="col">
                      System Module
                    </th>
                    <th className="py-3 px-4 text-center" scope="col">
                      View (Read)
                    </th>
                    <th className="py-3 px-4 text-center" scope="col">
                      Create (Add)
                    </th>
                    <th className="py-3 px-4 text-center" scope="col">
                      Edit (Modify)
                    </th>
                    <th className="py-3 px-4 text-center" scope="col">
                      Delete (Remove)
                    </th>
                    <th className="py-3 px-4 text-center" scope="col">
                      Export Data
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container text-sm">
                  {matrixState.map((row, idx) => {
                    const isRestricted =
                      row.restricted &&
                      selectedRole.id !== "super_admin" &&
                      selectedRole.id !== "finance_officer";

                    return (
                      <tr
                        key={row.module}
                        className={`transition-colors ${
                          isRestricted
                            ? "bg-surface-container-low/30 hover:bg-surface-container-low/60"
                            : "hover:bg-surface-container-low/50"
                        }`}
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-start sm:items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                row.iconBg || "bg-surface-container"
                              } ${row.iconColor || "text-on-surface-variant"}`}
                            >
                              <span className="material-symbols-outlined text-[18px]">{row.icon}</span>
                            </div>
                            <div>
                              <div className="text-sm text-on-surface font-semibold">{row.module}</div>
                              <div className="text-xs text-outline">{row.desc}</div>
                              {row.restrictedNote && (
                                <div className="inline-flex items-center gap-1 mt-1 text-[11px] text-secondary bg-secondary-fixed/40 px-2 py-0.5 rounded-full font-semibold">
                                  <span className="material-symbols-outlined text-[12px]">security</span>
                                  {row.restrictedNote}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {(["view", "create", "edit", "delete", "export"] as const).map((col) => {
                          if (isRestricted) {
                            return (
                              <td key={col} className="py-3.5 px-4 text-center opacity-40 cursor-not-allowed">
                                <div className="w-11 h-6 bg-surface-container-highest rounded-full mx-auto relative after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-surface-container-lowest after:rounded-full after:h-5 after:w-5"></div>
                              </td>
                            );
                          }

                          const checked = row[col];
                          return (
                            <td key={col} className="py-3.5 px-4 text-center">
                              <label className="toggle-switch cursor-pointer inline-block">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => handleToggle(idx, col)}
                                  className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-surface-container-highest rounded-full peer-checked:bg-primary relative transition-all duration-200 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-surface-container-lowest after:rounded-full after:h-5 after:w-5 after:transition-all after:shadow-xs peer-checked:after:translate-x-full"></div>
                              </label>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Legend / Footer of Table */}
            <div className="px-4 py-3 bg-surface-container-low/70 flex flex-wrap items-center justify-between text-outline text-xs">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
                  Permission Granted
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-surface-container-highest"></span>
                  Permission Denied
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px] text-secondary">lock</span>
                  Role Policy Enforced
                </span>
              </div>
              <span className="font-mono text-[11px]">Audit hash ID: #SEC-9842-MS</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Sticky Notification Bar for Unsaved Changes ── */}
      {hasUnsavedChanges && (
        <div className="fixed bottom-0 left-0 lg:left-[260px] right-0 z-40 bg-surface-container-lowest/95 backdrop-blur-md px-6 py-3.5 shadow-xl border-t border-surface-container transition-all duration-300">
          <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-secondary-container animate-pulse shrink-0"></span>
              <div>
                <p className="text-sm text-on-surface font-semibold">
                  You have unsaved changes to {selectedRole.title} permissions
                </p>
                <p className="text-xs text-outline">
                  Modified module access will propagate immediately across {selectedRole.assignedCount} assigned church staff accounts.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={resetToDefault}
                className="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold transition-colors cursor-pointer"
              >
                Discard
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={saveChanges}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-primary text-on-primary hover:bg-primary-container text-xs font-semibold shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                    <span>Saving Permissions...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">save</span>
                    <span>Save Permission Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Role Modal ── */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => !isCreating && setShowCreateModal(false)}
        title="Create New Role"
        subtitle="Define a custom access profile and role permissions for ministry teams"
        maxWidth="md"
        isSubmitting={isCreating}
      >
        <form onSubmit={handleCreateRole} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: "#747686" }}>
              Role Title *
            </label>
            <input
              type="text"
              required
              disabled={isCreating}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Media & Sound Lead"
              className="w-full sanctuary-input text-sm disabled:opacity-50"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: "#747686" }}>
              Badge Label
            </label>
            <input
              type="text"
              disabled={isCreating}
              value={newBadge}
              onChange={(e) => setNewBadge(e.target.value)}
              placeholder="e.g. AV / Media"
              className="w-full sanctuary-input text-sm disabled:opacity-50"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: "#747686" }}>
              Access Tier
            </label>
            <select
              value={newTier}
              disabled={isCreating}
              onChange={(e) => setNewTier(e.target.value)}
              className="w-full sanctuary-input text-sm cursor-pointer disabled:opacity-50"
            >
              <option value="Volunteer Tier">Volunteer Tier</option>
              <option value="Ministry Tier">Ministry Tier</option>
              <option value="Standard Tier">Standard Tier</option>
              <option value="Full Access Tier">Full Access Tier</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: "#747686" }}>
              Role Description / Scope
            </label>
            <textarea
              rows={2}
              disabled={isCreating}
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Describe user scope and pastoral accountability..."
              className="w-full sanctuary-input text-sm leading-relaxed disabled:opacity-50 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t" style={{ borderColor: "#f2f3ff" }}>
            <button
              type="button"
              disabled={isCreating}
              onClick={() => setShowCreateModal(false)}
              className="sanctuary-btn-secondary text-xs disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating}
              className="sanctuary-btn-primary text-xs flex items-center gap-1.5 disabled:opacity-60"
            >
              {isCreating && (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              <span>Create Role</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Edit Role Modal ── */}
      <Modal
        isOpen={showEditModal}
        onClose={() => !isEditing && setShowEditModal(false)}
        title="Edit Role Profile"
        subtitle={`Update configuration for "${selectedRole?.title}"`}
        maxWidth="md"
        isSubmitting={isEditing}
      >
        <form onSubmit={handleEditRole} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: "#747686" }}>
              Role Title *
            </label>
            <input
              type="text"
              required
              disabled={isEditing}
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full sanctuary-input text-sm disabled:opacity-50"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: "#747686" }}>
              Badge Label
            </label>
            <input
              type="text"
              disabled={isEditing}
              value={editBadge}
              onChange={(e) => setEditBadge(e.target.value)}
              className="w-full sanctuary-input text-sm disabled:opacity-50"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: "#747686" }}>
              Access Tier
            </label>
            <select
              value={editTier}
              disabled={isEditing}
              onChange={(e) => setEditTier(e.target.value)}
              className="w-full sanctuary-input text-sm cursor-pointer disabled:opacity-50"
            >
              <option value="Volunteer Tier">Volunteer Tier</option>
              <option value="Sunday School Tier">Sunday School Tier</option>
              <option value="Ministry Tier">Ministry Tier</option>
              <option value="Financial Tier">Financial Tier</option>
              <option value="Standard Tier">Standard Tier</option>
              <option value="Full Access Tier">Full Access Tier</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t" style={{ borderColor: "#f2f3ff" }}>
            <button
              type="button"
              disabled={isEditing}
              onClick={() => setShowEditModal(false)}
              className="sanctuary-btn-secondary text-xs disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isEditing}
              className="sanctuary-btn-primary text-xs flex items-center gap-1.5 disabled:opacity-60"
            >
              {isEditing && (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Confirm Delete Role Dialog ── */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => !isDeleting && setShowDeleteConfirm(false)}
        onConfirm={handleDeleteRole}
        title="Delete Role"
        message={`Are you sure you want to remove the "${selectedRole.title}" role? Any assigned users will need to be reallocated to another role.`}
        confirmText="Delete Role"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
