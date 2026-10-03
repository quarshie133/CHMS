"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { membersApi, type Member } from "@/lib/api";
import { Modal, ConfirmDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";

interface PersonDisplay {
  id: string;
  name: string;
  email: string;
  family?: string;
  role?: string;
  phone: string;
  status: string;
  statusBg: string;
  statusColor: string;
  attendance: string;
  attendanceSub: string;
  avatar?: string;
  initials?: string;
  initBg?: string;
  initColor?: string;
  checked?: boolean;
}

const SAMPLE_PEOPLE: PersonDisplay[] = [
  {
    id: "sample-1",
    avatar:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCj43-IbnysiNLMut1qyjjcAapBBRR-bu4i95WG3-bU1VPpxmctveIKPPPi2GcSAZTw03rSDsq7cKLcPg8_CIH7bna0zX_r19E0Ftcn-z6zhYkToq15X6THiNbp2tLkfbPu5cfSZVFMHwvh7TQ0iWCxxaeIXKtjn7_XdrATvfK__vJS3KO1zegsAVnd8XdgBnN9vND1lN3XZceVmXCBjoCY5uOaJOi6Cdx_700FhusVMLFXaujxTWlPBg",
    name: "Marcus Sterling",
    email: "m.sterling@email.com",
    family: "Sterling Family",
    role: "Head",
    phone: "(555) 234-8901",
    status: "Member",
    statusBg: "#7ffc97",
    statusColor: "#002109",
    attendance: "Oct 19, 2025",
    attendanceSub: "Main Service",
    checked: true,
  },
  {
    id: "sample-2",
    avatar:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAQCzBlZQNmv0X5eXAqiJW90EcrYROwjlhqJa3WdoGbjnE1RcYSxm6nm5kBW8xdJtGvqBw8qLnCUgcI8KYTyac07OE-jdhDkqujlvcz5DeL_DSc4yAMlfHQDBgL5dvlqIDTUhYPMnKXH02IyU-xKCC_qDEEBoXT59L4gcSELtv3q_Qoj48SRsHQ57YRWG00l-zGaCOiX9R6UPAwZWS9jUpNKQ_tdSwJRv9D3LwmvmgwoSFtihcPbcqm2g",
    name: "Elena Sterling",
    email: "elena.s@email.com",
    family: "Sterling Family",
    role: "Spouse",
    phone: "(555) 234-8902",
    status: "Member",
    statusBg: "#7ffc97",
    statusColor: "#002109",
    attendance: "Oct 19, 2025",
    attendanceSub: "Main Service",
    checked: true,
  },
  {
    id: "sample-3",
    initials: "DO",
    initBg: "#dce1ff",
    initColor: "#001551",
    name: "David K. Osei",
    email: "david.osei@email.com",
    family: "Osei Family",
    role: "Head",
    phone: "(555) 871-3320",
    status: "Staff / Deacon",
    statusBg: "#dce1ff",
    statusColor: "#001551",
    attendance: "Oct 19, 2025",
    attendanceSub: "Main Service",
    checked: false,
  },
  {
    id: "sample-4",
    avatar:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBkbtaBMPnjOcUBDmSht6sbeFA1ixt1RFrgzpKF5Baa1J_GKhsj-v_4SLzcwMWsgF3LN-_2-fW8wJAihE5iCHhzwfE_mqQm5p4ptoFjoYXAmUSSUi4BqSFIj9V3g5X6ozkDeT52BCOTRxm4iaeGA0zNZmgTe5K2S_5NHj7YJa_j5vVo71CtOFSpCoRIsAFl6RvOAPzukTv734OWOBmFCN2ePxTI17ceUUuUm_w3yRNybZER2ggJ4Paj-Q",
    name: "Sarah Jenkins",
    email: "sarah.j@email.com",
    family: "Jenkins Family",
    role: "",
    phone: "(555) 412-9081",
    status: "Regular Attendee",
    statusBg: "#dae2fd",
    statusColor: "#0037b0",
    attendance: "Oct 12, 2025",
    attendanceSub: "2 weeks ago",
    checked: false,
  },
  {
    id: "sample-5",
    initials: "MC",
    initBg: "#ffddb8",
    initColor: "#2a1700",
    name: "Michael Chang",
    email: "mchang@email.com",
    family: "",
    role: "",
    phone: "(555) 902-1144",
    status: "Visitor (1st time)",
    statusBg: "#ffddb8",
    statusColor: "#2a1700",
    attendance: "Oct 19, 2025",
    attendanceSub: "Main Service",
    checked: false,
  },
  {
    id: "sample-6",
    avatar:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuA_-0LUkDvFgWY8F1ChF0sC-73pc90xYHB1tvObkIcQ4W4oQDMwopNb8AAxOZih1Zu0iSRG8Jhvf8hDwyeO2clpVrlb9Z-FU2Pcbd-ChGR3B561oRsBIS59jzfom51qKL2h9h9Prz0vfxtBVtuB1DO9r8P0ZUcF2ZpORX5MbnYTMKikHneUQ2a_VEJLb5XoXDqS_nQ9JfCw7_80d971MlsHmczTkidFhW6PPupd27IHrgNx7ZF6p3v0tQ",
    name: "Grace Adebayo",
    email: "grace.a@email.com",
    family: "Adebayo Family",
    role: "Head",
    phone: "(555) 673-2190",
    status: "Member",
    statusBg: "#7ffc97",
    statusColor: "#002109",
    attendance: "Oct 19, 2025",
    attendanceSub: "Main Service",
    checked: false,
  },
];

export default function PeopleDirectoryPage() {
  const { token } = useAuth();
  const { success, error } = useToast();

  const [activeTab, setActiveTab] = useState("Individuals");
  const [people, setPeople] = useState<PersonDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Statuses");

  // Quick Add / Edit Modal State
  const [showPersonModal, setShowPersonModal] = useState(false);
  const [editingPerson, setEditingPerson] = useState<PersonDisplay | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [personEmail, setPersonEmail] = useState("");
  const [personPhone, setPersonPhone] = useState("");
  const [personStatus, setPersonStatus] = useState("active");
  const [personFamily, setPersonFamily] = useState("");
  const [personLifeStage, setPersonLifeStage] = useState("adult");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Confirmation State
  const [personToDelete, setPersonToDelete] = useState<PersonDisplay | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchPeople = useCallback(() => {
    if (!token) {
      setPeople(SAMPLE_PEOPLE);
      setLoading(false);
      return;
    }

    setLoading(true);
    membersApi
      .list(token)
      .then((res) => {
        if (res.results && res.results.length > 0) {
          const mapped: PersonDisplay[] = res.results.map((m) => {
            const isVisitor = m.status === "visitor";
            return {
              id: m.id,
              name: m.full_name || `${m.first_name} ${m.last_name}`,
              email: m.email || "No email on record",
              phone: m.phone_mobile || "No phone",
              family: m.family_name || "",
              status: isVisitor ? "Visitor (1st time)" : m.status === "active" ? "Member" : m.status,
              statusBg: isVisitor ? "#ffddb8" : "#7ffc97",
              statusColor: isVisitor ? "#2a1700" : "#002109",
              attendance: "Oct 19, 2025",
              attendanceSub: "Main Service",
              avatar: m.photo || undefined,
              initials: `${m.first_name?.[0] || ""}${m.last_name?.[0] || ""}`.toUpperCase(),
              initBg: "#dce1ff",
              initColor: "#001551",
              checked: false,
            };
          });
          setPeople(mapped);
        } else {
          setPeople(SAMPLE_PEOPLE);
        }
      })
      .catch((e) => {
        console.warn("Could not fetch remote members, using sample list", e);
        setPeople(SAMPLE_PEOPLE);
      })
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    fetchPeople();
  }, [fetchPeople]);

  const openAddModal = () => {
    setEditingPerson(null);
    setFirstName("");
    setLastName("");
    setPersonEmail("");
    setPersonPhone("");
    setPersonStatus("active");
    setPersonFamily("");
    setPersonLifeStage("adult");
    setFormError("");
    setShowPersonModal(true);
  };

  const openEditModal = (p: PersonDisplay) => {
    setEditingPerson(p);
    const parts = p.name.split(" ");
    setFirstName(parts[0] || "");
    setLastName(parts.slice(1).join(" ") || "");
    setPersonEmail(p.email === "No email on record" ? "" : p.email);
    setPersonPhone(p.phone === "No phone" ? "" : p.phone);
    setPersonStatus(p.status.toLowerCase().includes("visitor") ? "visitor" : "active");
    setPersonFamily(p.family || "");
    setPersonLifeStage("adult");
    setFormError("");
    setShowPersonModal(true);
  };

  const handleSavePerson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setFormError("First name and last name are required.");
      return;
    }

    setFormError("");
    setIsSubmitting(true);

    try {
      if (editingPerson) {
        // UPDATE
        if (token && !editingPerson.id.startsWith("sample-")) {
          await membersApi.update(token, editingPerson.id, {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            email: personEmail.trim() || undefined,
            phone_mobile: personPhone.trim() || undefined,
            status: personStatus,
            life_stage: personLifeStage,
          });
        }

        const fullName = `${firstName.trim()} ${lastName.trim()}`;
        setPeople((prev) =>
          prev.map((item) =>
            item.id === editingPerson.id
              ? {
                  ...item,
                  name: fullName,
                  email: personEmail.trim() || "No email on record",
                  phone: personPhone.trim() || "No phone",
                  status: personStatus === "visitor" ? "Visitor" : "Member",
                  statusBg: personStatus === "visitor" ? "#ffddb8" : "#7ffc97",
                  statusColor: personStatus === "visitor" ? "#2a1700" : "#002109",
                  family: personFamily.trim() || item.family,
                  initials: `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase(),
                }
              : item
          )
        );
        success("Person updated", `"${fullName}" record was successfully updated.`);
      } else {
        // CREATE
        let newId = Date.now().toString();
        if (token) {
          try {
            const res = await membersApi.create(token, {
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              email: personEmail.trim() || undefined,
              phone_mobile: personPhone.trim() || undefined,
              status: personStatus,
              life_stage: personLifeStage,
              family_name: personFamily.trim() || undefined,
            });
            if (res?.id) newId = res.id;
          } catch (apiErr: any) {
            console.warn("Backend create person fallback", apiErr);
          }
        }

        const fullName = `${firstName.trim()} ${lastName.trim()}`;
        const newPerson: PersonDisplay = {
          id: newId,
          name: fullName,
          email: personEmail.trim() || "No email on record",
          phone: personPhone.trim() || "No phone",
          family: personFamily.trim() || "Individual",
          status: personStatus === "visitor" ? "Visitor (1st time)" : "Member",
          statusBg: personStatus === "visitor" ? "#ffddb8" : "#7ffc97",
          statusColor: personStatus === "visitor" ? "#2a1700" : "#002109",
          attendance: "Today",
          attendanceSub: "New Record",
          initials: `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase(),
          initBg: "#dce1ff",
          initColor: "#001551",
          checked: false,
        };

        setPeople((prev) => [newPerson, ...prev]);
        success("Person added", `"${fullName}" has been added to the church directory.`);
      }

      setShowPersonModal(false);
    } catch (err: any) {
      setFormError(err?.detail || "Could not save member record.");
      error("Action failed", err?.detail || "Could not save congregant.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!personToDelete) return;
    setIsDeleting(true);

    try {
      if (token && !personToDelete.id.startsWith("sample-")) {
        await membersApi.remove(token, personToDelete.id);
      }
      setPeople((prev) => prev.filter((p) => p.id !== personToDelete.id));
      success("Person removed", `"${personToDelete.name}" was removed from directory.`);
      setPersonToDelete(null);
    } catch (err: any) {
      error("Delete failed", err?.detail || "Could not delete member.");
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredPeople = people.filter((p) => {
    const matchesSearch =
      !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.phone.includes(searchQuery);

    if (!matchesSearch) return false;

    if (activeTab === "Families") return Boolean(p.family && p.family !== "None / Individual");
    if (activeTab === "Visitors") return p.status.toLowerCase().includes("visitor");
    return true;
  });

  return (
    <div className="flex flex-col w-full px-4 sm:px-6 lg:px-8 py-6 gap-6 max-w-[1440px] mx-auto slide-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 style={{ fontSize: 30, fontWeight: 600, color: "#131b2e", letterSpacing: "-0.015em" }}>
            People &amp; Families
          </h1>
          <p style={{ fontSize: 14, color: "#434655", marginTop: 4 }}>
            Manage TLPCI church members, regular attendees, and visitors in one unified directory
          </p>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={fetchPeople}
            disabled={loading}
            title="Refresh directory"
            className="p-2.5 rounded-lg border border-[#e2e7ff] bg-white hover:bg-[#f2f3ff] text-[#434655] transition-colors"
          >
            <span className={`material-symbols-outlined text-sm ${loading ? "animate-spin" : ""}`}>
              refresh
            </span>
          </button>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg shadow-sm transition-all hover:bg-blue-700 active:scale-95"
            style={{ background: "#1d4ed8", color: "#ffffff", fontSize: 14, fontWeight: 600 }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              person_add
            </span>
            <span>Add Person</span>
          </button>
        </div>
      </div>

      {/* Sub-nav Tabs */}
      <div className="flex items-center gap-1 p-1.5 rounded-xl w-fit" style={{ background: "#f2f3ff" }}>
        {[
          { label: "Individuals", count: people.length },
          { label: "Families", count: people.filter((p) => p.family).length },
          { label: "Visitors", count: people.filter((p) => p.status.toLowerCase().includes("visitor")).length },
        ].map((tab) => (
          <button
            key={tab.label}
            onClick={() => setActiveTab(tab.label)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
            style={{
              background: activeTab === tab.label ? "#ffffff" : "transparent",
              color: activeTab === tab.label ? "#0037b0" : "#434655",
              fontSize: 13,
              fontWeight: activeTab === tab.label ? 600 : 400,
              boxShadow: activeTab === tab.label ? "0 1px 3px rgba(15,23,42,0.05)" : "none",
            }}
          >
            <span>{tab.label}</span>
            <span
              className="inline-flex items-center justify-center px-2 py-0.5 rounded-full"
              style={{
                fontSize: 11,
                background: activeTab === tab.label ? "#dce1ff" : "#e2e7ff",
                color: activeTab === tab.label ? "#001551" : "#434655",
              }}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl shadow-sm" style={{ boxShadow: "0 1px 3px rgba(15,23,42,0.05)" }}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          <div className="lg:col-span-8 relative">
            <span
              className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2"
              style={{ fontSize: 18, color: "#747686" }}
            >
              search
            </span>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg transition-all outline-none"
              style={{ background: "#f2f3ff", border: "1px solid #e2e7ff", fontSize: 13, color: "#131b2e" }}
              placeholder="Search by name, phone, or email..."
              type="text"
            />
          </div>
          <div className="lg:col-span-3 relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full appearance-none pl-3 pr-8 py-2 rounded-lg cursor-pointer outline-none"
              style={{ background: "#f2f3ff", border: "1px solid #e2e7ff", fontSize: 13, color: "#131b2e" }}
            >
              <option>All Statuses</option>
              <option>Member</option>
              <option>Visitor</option>
            </select>
            <span
              className="material-symbols-outlined pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2"
              style={{ fontSize: 18, color: "#747686" }}
            >
              unfold_more
            </span>
          </div>
          <div className="lg:col-span-1 flex justify-end">
            <button
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("All Statuses");
              }}
              className="flex items-center gap-1 hover:underline"
              style={{ fontSize: 13, fontWeight: 600, color: "#0037b0" }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                close
              </span>
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>

      {/* People Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(15,23,42,0.05)" }}>
        {loading ? (
          <div className="flex items-center justify-center h-48" style={{ color: "#747686" }}>
            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
            Loading people directory...
          </div>
        ) : filteredPeople.length === 0 ? (
          <div className="p-12 text-center text-xs flex flex-col items-center justify-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: "#eaedff", color: "#0037b0" }}
            >
              <span className="material-symbols-outlined text-2xl">person_search</span>
            </div>
            <div>
              <h4 className="text-sm font-bold" style={{ color: "#131b2e" }}>
                No congregants found
              </h4>
              <p className="text-xs mt-1 max-w-sm" style={{ color: "#747686" }}>
                {searchQuery || statusFilter !== "All Statuses"
                  ? "No members match your active search terms or status filter."
                  : "The church directory is currently empty. Add your first member or visitor."}
              </p>
            </div>
            {searchQuery || statusFilter !== "All Statuses" ? (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("All Statuses");
                }}
                className="sanctuary-btn-secondary text-xs mt-1"
              >
                Clear Search &amp; Filters
              </button>
            ) : (
              <button
                onClick={openAddModal}
                className="sanctuary-btn-primary text-xs mt-1"
              >
                <span className="material-symbols-outlined text-sm">person_add</span>
                Add First Congregant
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr
                  style={{
                    background: "#f2f3ff",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#747686",
                    textTransform: "uppercase",
                    letterSpacing: "0.02em",
                  }}
                >
                  <th className="py-3 px-4">Member Name &amp; Email</th>
                  <th className="py-3 px-4">Family Connection</th>
                  <th className="py-3 px-4">Phone Number</th>
                  <th className="py-3 px-4">Membership Status</th>
                  <th className="py-3 px-4">Last Attendance</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPeople.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-[#f2f3ff]/50 transition-colors group"
                    style={{ borderBottom: "1px solid #f2f3ff" }}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {p.avatar ? (
                          <img
                            className="w-10 h-10 rounded-full object-cover shadow-sm flex-shrink-0"
                            src={p.avatar}
                            alt={p.name}
                          />
                        ) : (
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center font-semibold flex-shrink-0"
                            style={{ background: p.initBg || "#dce1ff", color: p.initColor || "#001551", fontSize: 13 }}
                          >
                            {p.initials}
                          </div>
                        )}
                        <div className="flex flex-col min-w-0">
                          <Link
                            href={`/dashboard/members/${p.id}`}
                            className="truncate hover:underline"
                            style={{ fontSize: 14, fontWeight: 600, color: "#131b2e" }}
                          >
                            {p.name}
                          </Link>
                          <span className="truncate" style={{ fontSize: 13, color: "#747686" }}>
                            {p.email}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {p.family ? (
                        <div className="flex items-center gap-1.5" style={{ color: "#0037b0" }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                            diversity_1
                          </span>
                          <span style={{ fontSize: 13, fontWeight: 500 }}>{p.family}</span>
                          {p.role && <span style={{ fontSize: 11, color: "#747686" }}>({p.role})</span>}
                        </div>
                      ) : (
                        <span style={{ fontSize: 13, color: "#747686", fontStyle: "italic" }}>
                          None / Individual
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap" style={{ fontSize: 13, color: "#434655" }}>
                      {p.phone}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full"
                        style={{ background: p.statusBg, color: p.statusColor, fontSize: 11, fontWeight: 600 }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: p.statusColor }} />
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col">
                        <span style={{ fontSize: 13, color: "#131b2e" }}>{p.attendance}</span>
                        <span style={{ fontSize: 11, color: "#747686" }}>{p.attendanceSub}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(p)}
                          title="Edit member"
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-blue-600 transition-colors"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                            edit
                          </span>
                        </button>
                        <button
                          onClick={() => setPersonToDelete(p)}
                          title="Delete member"
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                            delete
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="p-4 flex items-center justify-between border-t" style={{ borderColor: "#f2f3ff" }}>
          <span style={{ fontSize: 13, color: "#747686" }}>
            Showing {filteredPeople.length} people in directory
          </span>
          <div className="flex items-center gap-1">
            <button className="p-1.5 rounded-lg text-gray-400">
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                chevron_left
              </span>
            </button>
            <button
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "#1d4ed8", color: "#ffffff", fontSize: 13, fontWeight: 600 }}
            >
              1
            </button>
            <button className="p-1.5 rounded-lg text-gray-400">
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                chevron_right
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Modal: Add / Edit Person ─────────────────────────────────── */}
      <Modal
        isOpen={showPersonModal}
        onClose={() => !isSubmitting && setShowPersonModal(false)}
        title={editingPerson ? "Edit Congregant" : "Add Congregant"}
        subtitle={
          editingPerson
            ? `Update personal details and membership record for ${editingPerson.name}`
            : "Enter member details to create a new profile in TLPCI Central directory"
        }
        isSubmitting={isSubmitting}
      >
        <form onSubmit={handleSavePerson} className="space-y-4">
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
                placeholder="e.g. Marcus"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full sanctuary-input text-sm disabled:opacity-50"
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
                placeholder="e.g. Sterling"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full sanctuary-input text-sm disabled:opacity-50"
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
                placeholder="e.g. m.sterling@email.com"
                value={personEmail}
                onChange={(e) => setPersonEmail(e.target.value)}
                className="w-full sanctuary-input text-sm disabled:opacity-50"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: "#747686" }}>
                Mobile Phone
              </label>
              <input
                type="tel"
                disabled={isSubmitting}
                placeholder="e.g. (555) 234-8901"
                value={personPhone}
                onChange={(e) => setPersonPhone(e.target.value)}
                className="w-full sanctuary-input text-sm disabled:opacity-50"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: "#747686" }}>
                Status
              </label>
              <select
                value={personStatus}
                disabled={isSubmitting}
                onChange={(e) => setPersonStatus(e.target.value)}
                className="w-full sanctuary-input text-sm cursor-pointer disabled:opacity-50"
              >
                <option value="active">Active Member</option>
                <option value="visitor">First-Time Visitor</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: "#747686" }}>
                Life Stage
              </label>
              <select
                value={personLifeStage}
                disabled={isSubmitting}
                onChange={(e) => setPersonLifeStage(e.target.value)}
                className="w-full sanctuary-input text-sm cursor-pointer disabled:opacity-50"
              >
                <option value="adult">Adult</option>
                <option value="young_adult">Young Adult</option>
                <option value="youth">Youth</option>
                <option value="child">Child / Sunday School</option>
                <option value="senior">Senior</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: "#747686" }}>
                Household / Family
              </label>
              <input
                type="text"
                disabled={isSubmitting}
                placeholder="e.g. Sterling Family"
                value={personFamily}
                onChange={(e) => setPersonFamily(e.target.value)}
                className="w-full sanctuary-input text-sm disabled:opacity-50"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t" style={{ borderColor: "#f2f3ff" }}>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setShowPersonModal(false)}
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
              <span>{editingPerson ? "Save Changes" : "Create Person"}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Confirmation Dialog: Delete Person ───────────────────────── */}
      <ConfirmDialog
        isOpen={Boolean(personToDelete)}
        onClose={() => !isDeleting && setPersonToDelete(null)}
        onConfirm={confirmDelete}
        title="Remove Congregant"
        message={`Are you sure you want to remove "${personToDelete?.name}" from the church directory? This profile and associated records will be permanently removed.`}
        confirmText="Remove Person"
        isLoading={isDeleting}
        isDestructive={true}
      />
    </div>
  );
}
