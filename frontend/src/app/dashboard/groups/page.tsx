"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { groupsApi, membersApi, type Group, type Member } from "@/lib/api";
import { Modal, ConfirmDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";

const SAMPLE_GROUPS: Group[] = [
  {
    id: "sample-1",
    name: "Choir & Worship Ministry",
    category_name: "Worship & Creative Arts",
    leader_name: "Marcus Sterling",
    member_count: 24,
    is_active: true,
    is_open: true,
    cover_image: null,
    description: "Leads congregational singing every Sunday morning. Weekly rehearsals on Thursdays at 7:00 PM.",
  },
  {
    id: "sample-2",
    name: "Men's Fellowship",
    category_name: "Fellowship & Discipleship",
    leader_name: "Deacon Ray Campbell",
    member_count: 18,
    is_active: true,
    is_open: true,
    cover_image: null,
    description: "Studying the Word over Saturday morning breakfast in the Fellowship Hall.",
  },
  {
    id: "sample-3",
    name: "Youth Ministry & TELPSAM",
    category_name: "Next Gen Ministries",
    leader_name: "Sarah Jenkins",
    member_count: 36,
    is_active: true,
    is_open: true,
    cover_image: null,
    description: "High school and college fellowship gathering Friday evenings for worship, small groups, and games.",
  },
  {
    id: "sample-4",
    name: "Ushers & Hospitality Greeters",
    category_name: "Sunday Serving Teams",
    leader_name: "David Osei",
    member_count: 16,
    is_active: true,
    is_open: true,
    cover_image: null,
    description: "Warmly welcoming first-time guests, guiding families to seating, and assisting with tithes & offerings.",
  },
  {
    id: "sample-5",
    name: "Women Fellowship",
    category_name: "Fellowship & Discipleship",
    leader_name: "Elena Sterling",
    member_count: 28,
    is_active: true,
    is_open: true,
    cover_image: null,
    description: "Bi-weekly devotional fellowship supporting mothers, career women, and mentoring young ladies.",
  },
];

const CATEGORIES = [
  "Fellowship & Discipleship",
  "Worship & Creative Arts",
  "Next Gen Ministries",
  "Sunday Serving Teams",
  "Pastoral Ministries",
];

export default function GroupsPage() {
  const { token } = useAuth();
  const { success, error } = useToast();

  const [groups, setGroups] = useState<Group[]>([]);
  const [membersList, setMembersList] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Create / Edit Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState(CATEGORIES[0]);
  const [formLeader, setFormLeader] = useState("");
  const [selectedLeaderMode, setSelectedLeaderMode] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formIsOpen, setFormIsOpen] = useState(true);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Confirmation State
  const [groupToDelete, setGroupToDelete] = useState<Group | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchGroups = useCallback(() => {
    if (!token) {
      setGroups(SAMPLE_GROUPS);
      setLoading(false);
      return;
    }
    setLoading(true);

    // Fetch members to populate leader selector
    membersApi
      .list(token)
      .then((r) => {
        if (r.results && r.results.length > 0) {
          setMembersList(r.results);
        }
      })
      .catch((e) => console.warn("Members fetch fallback for groups", e));

    groupsApi
      .list(token)
      .then((r) => {
        if (r.results && r.results.length > 0) {
          setGroups(r.results);
        } else {
          setGroups(SAMPLE_GROUPS);
        }
      })
      .catch((e) => {
        console.warn("Could not fetch remote groups, using TLPCI sample groups", e);
        setGroups(SAMPLE_GROUPS);
      })
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const openCreateModal = () => {
    setEditingGroup(null);
    setFormName("");
    setFormCategory(CATEGORIES[0]);
    setFormLeader("");
    setSelectedLeaderMode("");
    setFormDesc("");
    setFormIsOpen(true);
    setFormError("");
    setShowModal(true);
  };

  const openEditModal = (g: Group) => {
    setEditingGroup(g);
    setFormName(g.name);
    setFormCategory(g.category_name || CATEGORIES[0]);
    const leaderName = g.leader_name || "";
    setFormLeader(leaderName);
    const matched = membersList.some(
      (m) => `${m.first_name} ${m.last_name}`.toLowerCase() === leaderName.toLowerCase()
    );
    setSelectedLeaderMode(matched ? leaderName : leaderName ? "custom" : "");
    setFormDesc(g.description || "");
    setFormIsOpen(g.is_open ?? true);
    setFormError("");
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError("Group name is required.");
      return;
    }

    setFormError("");
    setIsSubmitting(true);

    try {
      if (editingGroup) {
        // UPDATE
        if (token && !editingGroup.id.startsWith("sample-")) {
          await groupsApi.update(token, editingGroup.id, {
            name: formName.trim(),
            description: formDesc.trim(),
            is_open: formIsOpen,
          });
        }
        // Optimistic / Local update
        setGroups((prev) =>
          prev.map((item) =>
            item.id === editingGroup.id
              ? {
                  ...item,
                  name: formName.trim(),
                  category_name: formCategory,
                  leader_name: formLeader || item.leader_name,
                  description: formDesc.trim(),
                  is_open: formIsOpen,
                }
              : item
          )
        );
        success("Group updated successfully", `"${formName.trim()}" has been updated.`);
      } else {
        // CREATE
        let newId = Date.now().toString();
        if (token) {
          try {
            const res = await groupsApi.create(token, {
              name: formName.trim(),
              description: formDesc.trim(),
              is_open: formIsOpen,
              is_active: true,
            });
            if (res?.id) newId = res.id;
          } catch (apiErr: any) {
            console.warn("Backend create fallback to local", apiErr);
          }
        }

        const newGroup: Group = {
          id: newId,
          name: formName.trim(),
          category_name: formCategory,
          leader_name: formLeader.trim() || "Ministry Leader",
          member_count: 1,
          is_active: true,
          is_open: formIsOpen,
          cover_image: null,
          description: formDesc.trim(),
        };

        setGroups((prev) => [newGroup, ...prev]);
        success("Ministry group created", `"${formName.trim()}" is now active.`);
      }

      setShowModal(false);
    } catch (err: any) {
      setFormError(err?.detail || "An error occurred while saving the group. Please check your connection.");
      error("Action failed", err?.detail || "Could not save ministry group.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!groupToDelete) return;
    setIsDeleting(true);

    try {
      if (token && !groupToDelete.id.startsWith("sample-")) {
        await groupsApi.remove(token, groupToDelete.id);
      }
      setGroups((prev) => prev.filter((g) => g.id !== groupToDelete.id));
      success("Ministry group removed", `"${groupToDelete.name}" was successfully deleted.`);
      setGroupToDelete(null);
    } catch (err: any) {
      error("Delete failed", err?.detail || "Could not remove the group.");
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredGroups = groups.filter((g) => {
    if (categoryFilter === "all") return true;
    if (categoryFilter === "fellowship") return g.category_name?.includes("Fellowship");
    if (categoryFilter === "serving")
      return g.category_name?.includes("Serving") || g.category_name?.includes("Worship");
    if (categoryFilter === "youth") return g.category_name?.includes("Next Gen");
    return true;
  });

  return (
    <div className="flex flex-col gap-6 slide-up w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <nav
            className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider mb-1"
            style={{ color: "#747686" }}
          >
            <span>Home</span>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span style={{ color: "#0037b0" }}>Groups &amp; Ministries</span>
          </nav>
          <h1
            className="text-2xl font-bold"
            style={{ color: "#131b2e", letterSpacing: "-0.015em" }}
          >
            Groups &amp; Ministries
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "#434655" }}>
            Organize small groups, worship rosters, discipleship circles, and serving teams across TLPCI
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchGroups}
            disabled={loading}
            title="Refresh groups list"
            className="p-2.5 rounded-lg border border-[#e2e7ff] bg-white hover:bg-[#f2f3ff] text-[#434655] transition-colors"
          >
            <span className={`material-symbols-outlined text-sm ${loading ? "animate-spin" : ""}`}>
              refresh
            </span>
          </button>
          <button onClick={openCreateModal} className="sanctuary-btn-primary text-xs">
            <span className="material-symbols-outlined text-sm">group_add</span>
            New Ministry Group
          </button>
        </div>
      </div>

      {/* ── Filters ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 p-1 rounded-xl w-fit overflow-x-auto" style={{ background: "#f2f3ff" }}>
        {[
          { key: "all", label: "All Groups" },
          { key: "fellowship", label: "Fellowship & Bible Study" },
          { key: "serving", label: "Serving & Worship Teams" },
          { key: "youth", label: "Next Gen & Youth" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setCategoryFilter(f.key)}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap"
            style={
              categoryFilter === f.key
                ? {
                    background: "#ffffff",
                    color: "#0037b0",
                    boxShadow: "0 1px 3px rgba(15,23,42,0.08)",
                  }
                : { color: "#434655" }
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Groups Cards Grid ────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center h-48" style={{ color: "#747686" }}>
          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
          Loading ministry groups...
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="sanctuary-card p-12 text-center text-xs flex flex-col items-center justify-center gap-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: "#eaedff", color: "#0037b0" }}
          >
            <span className="material-symbols-outlined text-2xl">groups</span>
          </div>
          <div>
            <h4 className="text-sm font-bold" style={{ color: "#131b2e" }}>
              No ministry groups found
            </h4>
            <p className="text-xs mt-1 max-w-sm" style={{ color: "#747686" }}>
              {categoryFilter !== "all"
                ? "There are no ministry groups matching the selected category filter."
                : "Get started by organizing your first fellowship, serving team, or ministry circle."}
            </p>
          </div>
          {categoryFilter !== "all" ? (
            <button
              onClick={() => setCategoryFilter("all")}
              className="sanctuary-btn-secondary text-xs mt-1"
            >
              Show All Groups
            </button>
          ) : (
            <button onClick={openCreateModal} className="sanctuary-btn-primary text-xs mt-1">
              <span className="material-symbols-outlined text-sm">group_add</span>
              Create Ministry Group
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredGroups.map((g) => (
            <div
              key={g.id}
              className="sanctuary-card p-5 flex flex-col justify-between hover:shadow-md transition-shadow relative group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span
                    className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                    style={{ background: "#eaedff", color: "#0037b0" }}
                  >
                    {g.category_name || "Ministry"}
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className="pill text-[10px] font-bold"
                      style={{
                        background: g.is_open ? "#dcfce7" : "#f1f5f9",
                        color: g.is_open ? "#16a34a" : "#64748b",
                      }}
                    >
                      {g.is_open ? "Open Roster" : "Closed Roster"}
                    </span>
                    {/* Action buttons */}
                    <div className="flex items-center gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEditModal(g)}
                        title="Edit Group"
                        className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-blue-600 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                      </button>
                      <button
                        onClick={() => setGroupToDelete(g)}
                        title="Delete Group"
                        className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-bold" style={{ color: "#131b2e" }}>
                    {g.name}
                  </h3>
                  <p className="text-xs mt-1 line-clamp-2" style={{ color: "#434655" }}>
                    {g.description || "Active church group meeting weekly."}
                  </p>
                </div>
              </div>

              <div
                className="pt-4 mt-4 border-t flex items-center justify-between"
                style={{ borderColor: "#e2e7ff" }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: "#dce1ff", color: "#001551" }}
                  >
                    {g.leader_name?.[0] || "L"}
                  </div>
                  <div className="flex flex-col text-[11px] leading-tight">
                    <span style={{ color: "#747686" }}>Leader</span>
                    <span className="font-semibold" style={{ color: "#131b2e" }}>
                      {g.leader_name || "Ministry Staff"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-xs font-bold" style={{ color: "#0037b0" }}>
                  <span className="material-symbols-outlined text-sm">group</span>
                  <span>{g.member_count ?? 1}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal: Create / Edit Group ───────────────────────────────── */}
      <Modal
        isOpen={showModal}
        onClose={() => !isSubmitting && setShowModal(false)}
        title={editingGroup ? "Edit Ministry Group" : "Create Ministry Group"}
        subtitle={
          editingGroup
            ? `Update group settings and roster parameters for "${editingGroup.name}"`
            : "Set up a new fellowship, serving team, or ministry circle"
        }
        isSubmitting={isSubmitting}
      >
        <form onSubmit={handleSave} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">error</span>
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label
              className="text-xs font-bold uppercase tracking-wider block mb-1.5"
              style={{ color: "#747686" }}
            >
              Group Name *
            </label>
            <input
              type="text"
              required
              disabled={isSubmitting}
              placeholder="e.g. Young Adults & TELPSAM"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="w-full sanctuary-input text-sm disabled:opacity-50"
            />
          </div>

          <div>
            <label
              className="text-xs font-bold uppercase tracking-wider block mb-1.5"
              style={{ color: "#747686" }}
            >
              Category *
            </label>
            <select
              value={formCategory}
              disabled={isSubmitting}
              onChange={(e) => setFormCategory(e.target.value)}
              className="w-full sanctuary-input text-sm cursor-pointer disabled:opacity-50"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              className="text-xs font-bold uppercase tracking-wider block mb-1.5"
              style={{ color: "#747686" }}
            >
              Ministry Leader
            </label>
            <div className="space-y-2">
              <select
                value={selectedLeaderMode}
                disabled={isSubmitting}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedLeaderMode(val);
                  if (val !== "custom") {
                    setFormLeader(val);
                  } else {
                    setFormLeader("");
                  }
                }}
                className="w-full sanctuary-input text-sm cursor-pointer disabled:opacity-50"
              >
                <option value="">Select from church members directory...</option>
                {membersList.map((m) => {
                  const fullName = `${m.first_name} ${m.last_name}`;
                  return (
                    <option key={m.id} value={fullName}>
                      {fullName} {m.life_stage ? `(${m.life_stage})` : ""}
                    </option>
                  );
                })}
                <option value="custom">+ Other / Enter Custom Leader Name</option>
              </select>

              {(selectedLeaderMode === "custom" ||
                (!membersList.some(
                  (m) =>
                    `${m.first_name} ${m.last_name}`.toLowerCase() === formLeader.toLowerCase()
                ) &&
                  formLeader)) && (
                <input
                  type="text"
                  disabled={isSubmitting}
                  placeholder="Enter leader's full name (e.g. Pastor Grace Miller, Deacon Ray)"
                  value={formLeader}
                  onChange={(e) => setFormLeader(e.target.value)}
                  className="w-full sanctuary-input text-sm disabled:opacity-50"
                />
              )}
            </div>
          </div>

          <div>
            <label
              className="text-xs font-bold uppercase tracking-wider block mb-1.5"
              style={{ color: "#747686" }}
            >
              Description / Meeting Schedule
            </label>
            <textarea
              rows={3}
              disabled={isSubmitting}
              placeholder="Meeting times, room location, focus..."
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              className="w-full sanctuary-input text-sm leading-relaxed disabled:opacity-50"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <div>
              <span className="text-xs font-bold block" style={{ color: "#131b2e" }}>
                Roster Status
              </span>
              <span className="text-[11px]" style={{ color: "#747686" }}>
                Allow congregants to join freely
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formIsOpen}
                disabled={isSubmitting}
                onChange={(e) => setFormIsOpen(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t" style={{ borderColor: "#f2f3ff" }}>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setShowModal(false)}
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
              <span>{editingGroup ? "Save Changes" : "Create Group"}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Confirmation Dialog: Delete Group ────────────────────────── */}
      <ConfirmDialog
        isOpen={Boolean(groupToDelete)}
        onClose={() => !isDeleting && setGroupToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete Ministry Group"
        message={`Are you sure you want to delete "${groupToDelete?.name}"? All assigned rosters and group settings will be permanently removed.`}
        confirmText="Delete Group"
        isLoading={isDeleting}
        isDestructive={true}
      />
    </div>
  );
}
