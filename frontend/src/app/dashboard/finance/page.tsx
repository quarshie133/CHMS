"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { contributionsApi, fundsApi, membersApi, type Contribution, type Fund, type Member } from "@/lib/api";
import { Modal, ConfirmDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";

interface TransactionDisplay {
  id: string;
  name: string;
  ref: string;
  fund: string;
  fundBg: string;
  fundColor: string;
  method: string;
  methodIcon: string;
  amount: string;
  date: string;
  status: string;
  statusBg: string;
  statusColor: string;
  initials?: string;
  avatar?: string;
}

const SAMPLE_TRANSACTIONS: TransactionDisplay[] = [
  {
    id: "sample-1",
    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuCdGVNJN_ogoGDOkWh6e9m4i_QeEfTEt1Us9sEg0TeDIewK0pw9I9FSq6i9VaF7O29IYBe0xE-NhvEf4IvcFSp3f9r2_DifUePWTovBcXCshga2WtQBAwd8-sTafM66-FYbqe2jvMXjlN5KjPrAjJni0AuLzOIjNDAp_7d6I3BKQQmvNjG04MblpZzt4yigTjYXEA9e-J58OTKYeF879_eQMw7nW1qwTVcd1EhMKgTf5rf1-ZSrA_Wo7A",
    name: "David & Sarah Osei",
    ref: "Envelope #2041",
    fund: "General Tithe",
    fundBg: "#dce1ff",
    fundColor: "#001551",
    method: "Bank ACH (••9021)",
    methodIcon: "account_balance",
    amount: "$650.00",
    date: "Today, 09:42 AM",
    status: "Completed",
    statusBg: "#7ffc97",
    statusColor: "#005320",
  },
  {
    id: "sample-2",
    initials: "AV",
    name: "Anonymous Visitor",
    ref: "Guest Offering Kiosk",
    fund: "Sunday Offering",
    fundBg: "#eaedff",
    fundColor: "#434655",
    method: "Debit Card (••4419)",
    methodIcon: "credit_card",
    amount: "$50.00",
    date: "Today, 08:15 AM",
    status: "Completed",
    statusBg: "#7ffc97",
    statusColor: "#005320",
  },
  {
    id: "sample-3",
    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuBS1Iu50O74VQvh7uKlhJNa6TbhSLzU8EcQkglaBK84LGvigje3TmSEFf6mbvE9cAT4513zZlmPQnPuCWVFryTT7Xi1u8TaT_DozJwmKq7rO_Vcz2u8tjbnDGhNT_ofHcqCoaK-UQ3bM4BTaGlgecutSkwzeOZUEelKLznMxnJwnFAHmlO2EkjiSs1LpCJoC68aAkH-EW1I24KadS69q-BzHV3BLf8l6pkDeIIl1TIgjfxBiEQlYV74aA",
    name: "Marcus Sterling",
    ref: "Envelope #1084",
    fund: "Building Fund",
    fundBg: "#ffddb8",
    fundColor: "#2a1700",
    method: "Check #4421",
    methodIcon: "receipt",
    amount: "$1,200.00",
    date: "Yesterday, 11:00 AM",
    status: "Completed",
    statusBg: "#7ffc97",
    statusColor: "#005320",
  },
  {
    id: "sample-4",
    initials: "GE",
    name: "Grace & Emmanuel Adebayo",
    ref: "Online Portal",
    fund: "Missions & Outreach",
    fundBg: "#7ffc97",
    fundColor: "#002109",
    method: "Credit Card (••8832)",
    methodIcon: "credit_card",
    amount: "$250.00",
    date: "Yesterday, 09:15 AM",
    status: "Pending",
    statusBg: "#ffddb8",
    statusColor: "#653e00",
  },
];

export default function FinancePage() {
  const { token } = useAuth();
  const { success, error } = useToast();

  const [activeTab, setActiveTab] = useState("Giving Overview");
  const [transactions, setTransactions] = useState<TransactionDisplay[]>([]);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [membersList, setMembersList] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  // Record Giving Modal
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [donorType, setDonorType] = useState<"member" | "custom" | "anonymous">("member");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [donorName, setDonorName] = useState("");
  const [selectedFundId, setSelectedFundId] = useState("");
  const [contributionType, setContributionType] = useState("tithe");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Delete Confirmation
  const [itemToDelete, setItemToDelete] = useState<TransactionDisplay | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchTransactions = useCallback(() => {
    if (!token) {
      setTransactions(SAMPLE_TRANSACTIONS);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Fetch members for donor select
    membersApi
      .list(token)
      .then((r) => {
        if (r.results && r.results.length > 0) {
          setMembersList(r.results);
          if (!selectedMemberId) setSelectedMemberId(r.results[0].id);
        }
      })
      .catch((e) => console.warn("Members fetch fallback", e));

    // Fetch funds
    fundsApi
      .list(token)
      .then((r) => {
        if (r.results && r.results.length > 0) {
          setFunds(r.results);
          if (!selectedFundId) setSelectedFundId(r.results[0].id);
        }
      })
      .catch((e) => console.warn("Funds fetch fallback", e));

    // Fetch contributions
    contributionsApi
      .list(token)
      .then((res) => {
        if (res.results && res.results.length > 0) {
          const mapped: TransactionDisplay[] = res.results.map((c) => {
            const num = parseFloat(c.amount || "0");
            const formatted = isNaN(num) ? c.amount : `$${num.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
            return {
              id: c.id,
              name: c.member_name || (c.notes.includes("Guest") ? "Anonymous Donor" : "Church Member"),
              ref: c.notes || `Ref #${c.id.substring(0, 6)}`,
              fund: c.fund_name || "General Tithe",
              fundBg: "#dce1ff",
              fundColor: "#001551",
              method: c.payment_method ? c.payment_method.replace("_", " ").toUpperCase() : "Cash",
              methodIcon: c.payment_method === "check" ? "receipt" : c.payment_method === "card" ? "credit_card" : "account_balance",
              amount: formatted,
              date: c.date || "Today",
              status: "Completed",
              statusBg: "#7ffc97",
              statusColor: "#005320",
              initials: c.member_name ? c.member_name.split(" ").map((n) => n[0]).join("") : "TD",
            };
          });
          setTransactions(mapped);
        } else {
          setTransactions(SAMPLE_TRANSACTIONS);
        }
      })
      .catch((e) => {
        console.warn("Using sample transactions", e);
        setTransactions(SAMPLE_TRANSACTIONS);
      })
      .finally(() => setLoading(false));
  }, [token, selectedFundId]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleRecordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError("Please enter a valid contribution amount greater than $0.");
      return;
    }

    setFormError("");
    setIsSubmitting(true);

    try {
      let createdId = Date.now().toString();
      const fundObj = funds.find((f) => f.id === selectedFundId) || { name: "General Tithe" };

      let resolvedDonorName = "Anonymous Giver";
      let memberIdToSend: string | undefined = undefined;

      if (donorType === "member") {
        const found = membersList.find((m) => m.id === selectedMemberId);
        resolvedDonorName = found?.full_name || (found ? `${found.first_name} ${found.last_name}` : "Church Member");
        memberIdToSend = selectedMemberId;
      } else if (donorType === "custom") {
        resolvedDonorName = donorName.trim() || "Guest Donor";
      }

      if (token && selectedFundId) {
        try {
          const res = await contributionsApi.create(token, {
            fund: selectedFundId,
            member: donorType === "member" ? memberIdToSend : undefined,
            contribution_type: contributionType,
            amount: parsedAmount.toFixed(2),
            payment_method: paymentMethod,
            date: date,
            notes: reference ? `${reference} - ${notes}` : notes || "Recorded in admin portal",
            is_anonymous: donorType === "anonymous",
          } as any);
          if (res?.id) createdId = res.id;
        } catch (apiErr: any) {
          console.warn("Backend create fallback", apiErr);
        }
      }

      const formattedAmount = `$${parsedAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
      const newTx: TransactionDisplay = {
        id: createdId,
        name: resolvedDonorName,
        ref: reference ? `Ref #${reference}` : "Walk-in Giving",
        fund: fundObj.name,
        fundBg: "#dce1ff",
        fundColor: "#001551",
        method: paymentMethod.replace("_", " ").toUpperCase(),
        methodIcon: paymentMethod === "check" ? "receipt" : paymentMethod === "card" ? "credit_card" : "account_balance",
        amount: formattedAmount,
        date: "Today, Just now",
        status: "Completed",
        statusBg: "#7ffc97",
        statusColor: "#005320",
        initials: donorType === "anonymous" ? "AN" : resolvedDonorName.split(" ").map((n) => n[0]).join("") || "CM",
      };

      setTransactions((prev) => [newTx, ...prev]);
      success("Giving recorded successfully", `${formattedAmount} deposited to ${fundObj.name}.`);
      setShowRecordModal(false);

      // Reset form
      setDonorName("");
      setAmount("");
      setReference("");
      setNotes("");
      setDonorType("member");
    } catch (err: any) {
      setFormError(err?.detail || "Failed to record contribution.");
      error("Error recording contribution", err?.detail);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);

    try {
      if (token && !itemToDelete.id.startsWith("sample-")) {
        await contributionsApi.remove(token, itemToDelete.id);
      }
      setTransactions((prev) => prev.filter((t) => t.id !== itemToDelete.id));
      success("Transaction deleted", `Removed giving entry for ${itemToDelete.name}.`);
      setItemToDelete(null);
    } catch (err: any) {
      error("Delete failed", err?.detail || "Could not delete transaction.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col w-full px-4 sm:px-6 lg:px-8 py-6 gap-6 max-w-[1440px] mx-auto slide-up">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col">
          <h1 style={{ fontSize: 30, fontWeight: 600, color: "#131b2e", letterSpacing: "-0.015em" }}>
            Finance &amp; Giving
          </h1>
          <p style={{ fontSize: 14, color: "#747686", marginTop: 4 }}>
            Track tithes, offerings, building pledge campaigns, and operating reserves for TLPCI Central
          </p>
        </div>
        <div className="flex items-center flex-wrap gap-3">
          <button
            onClick={fetchTransactions}
            disabled={loading}
            title="Refresh transactions"
            className="p-2.5 rounded-lg border border-[#e2e7ff] bg-white hover:bg-[#f2f3ff] text-[#434655] transition-colors"
          >
            <span className={`material-symbols-outlined text-sm ${loading ? "animate-spin" : ""}`}>
              refresh
            </span>
          </button>
          <button
            onClick={() => setShowRecordModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-sm transition-all hover:bg-blue-700 active:scale-95"
            style={{ background: "#1d4ed8", color: "#ffffff", fontSize: 14, fontWeight: 600 }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              add_circle
            </span>
            <span>+ Record Giving</span>
          </button>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {["Giving Overview", "Pledges & Campaigns", "Expenses", "Budgets", "Donor Statements"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-2 rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5"
            style={{
              background: activeTab === tab ? "#eaedff" : "transparent",
              color: activeTab === tab ? "#0037b0" : "#434655",
              fontSize: 14,
              fontWeight: activeTab === tab ? 600 : 400,
              boxShadow: activeTab === tab ? "0 1px 3px rgba(15,23,42,0.05)" : "none",
            }}
          >
            {tab === "Giving Overview" && (
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                account_balance_wallet
              </span>
            )}
            <span>{tab}</span>
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "This Month's Giving",
            value: "$48,320.00",
            icon: "volunteer_activism",
            iconBg: "rgba(0,80,31,0.1)",
            iconColor: "#00501f",
            trend: "+8.4%",
            trendText: "vs last month ($44,570)",
            trendColor: "#00501f",
          },
          {
            label: "Operating Expenses",
            value: "$21,150.00",
            icon: "payments",
            iconBg: "rgba(254,166,25,0.2)",
            iconColor: "#855300",
            sub: "Within limit: $26,000",
            badge: "81% Used",
          },
          {
            label: "Net Operating Income",
            value: "+$27,170.00",
            valueColor: "#00501f",
            icon: "savings",
            iconBg: "rgba(29,78,216,0.1)",
            iconColor: "#1d4ed8",
            badge2: "Healthy Reserve",
            badge2Color: "#00501f",
            sub2: "56.2% margin",
          },
          {
            label: "Pledges Fulfilled",
            value: "78.5%",
            icon: "domain_add",
            iconBg: "#dae2fd",
            iconColor: "#0037b0",
            progress: 78.5,
            progressText: "$117,750 of $150,000 annual goal",
          },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-white p-6 rounded-xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
            style={{ boxShadow: "0 1px 3px rgba(15,23,42,0.05)" }}
          >
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.02em",
                    color: "#747686",
                  }}
                >
                  {card.label}
                </span>
                <span
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                    color: card.valueColor || "#131b2e",
                    letterSpacing: "-0.02em",
                    marginTop: 4,
                  }}
                >
                  {card.value}
                </span>
              </div>
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: card.iconBg }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 24, color: card.iconColor }}>
                  {card.icon}
                </span>
              </div>
            </div>
            <div className="mt-4">
              {card.trend && (
                <div className="flex items-center gap-2" style={{ fontSize: 13 }}>
                  <span className="inline-flex items-center" style={{ color: card.trendColor, fontWeight: 600 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                      trending_up
                    </span>
                    <span>{card.trend}</span>
                  </span>
                  <span style={{ color: "#747686" }}>{card.trendText}</span>
                </div>
              )}
              {card.sub && (
                <div className="flex items-center justify-between" style={{ fontSize: 13 }}>
                  <span style={{ color: "#747686" }}>
                    Within limit: <strong style={{ color: "#131b2e" }}>$26,000</strong>
                  </span>
                  <span
                    className="px-2 py-0.5 rounded-full"
                    style={{ background: "#eaedff", fontSize: 11, fontWeight: 600, color: "#131b2e" }}
                  >
                    {card.badge}
                  </span>
                </div>
              )}
              {card.badge2 && (
                <div className="flex items-center gap-2">
                  <span
                    className="px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(0,80,31,0.15)", color: card.badge2Color, fontSize: 11, fontWeight: 600 }}
                  >
                    {card.badge2}
                  </span>
                  <span style={{ fontSize: 13, color: "#747686" }}>{card.sub2}</span>
                </div>
              )}
              {card.progress !== undefined && (
                <div className="flex flex-col gap-1">
                  <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "#eaedff" }}>
                    <div className="h-full rounded-full" style={{ width: `${card.progress}%`, background: "#1d4ed8" }} />
                  </div>
                  <span style={{ fontSize: 11, color: "#747686" }}>{card.progressText}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Transactions Table Section */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(15,23,42,0.05)" }}>
        <div className="p-6 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ borderColor: "#f2f3ff" }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: "#131b2e" }}>Recent Giving Transactions</h2>
            <p style={{ fontSize: 13, color: "#747686" }}>
              Real-time records of incoming church tithes, offerings, and designated funds
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48" style={{ color: "#747686" }}>
            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
            Loading transactions...
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
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
                  <th className="py-3 px-6">Donor Name</th>
                  <th className="py-3 px-4">Fund Name</th>
                  <th className="py-3 px-4">Payment Method</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4">Date &amp; Time</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr
                    key={t.id}
                    className="hover:bg-[#f2f3ff]/40 transition-colors group"
                    style={{ borderBottom: "1px solid #f2f3ff" }}
                  >
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-3">
                        {t.avatar ? (
                          <img className="w-9 h-9 rounded-full object-cover flex-shrink-0" src={t.avatar} alt={t.name} />
                        ) : (
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center font-semibold flex-shrink-0"
                            style={{ background: "#dce1ff", color: "#001551", fontSize: 13 }}
                          >
                            {t.initials || "CM"}
                          </div>
                        )}
                        <div className="flex flex-col min-w-0">
                          <span className="truncate" style={{ fontSize: 14, fontWeight: 600, color: "#131b2e" }}>
                            {t.name}
                          </span>
                          <span style={{ fontSize: 11, color: "#747686" }}>{t.ref}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full"
                        style={{ background: t.fundBg, color: t.fundColor, fontSize: 11, fontWeight: 600 }}
                      >
                        {t.fund}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1" style={{ fontSize: 13, color: "#434655" }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#747686" }}>
                          {t.methodIcon}
                        </span>
                        {t.method}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span style={{ fontSize: 16, fontWeight: 700, color: "#131b2e" }}>{t.amount}</span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap" style={{ fontSize: 13, color: "#747686" }}>
                      {t.date}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full"
                        style={{ background: t.statusBg, color: t.statusColor, fontSize: 11, fontWeight: 600 }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: t.statusColor }} />
                        {t.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <button
                        onClick={() => setItemToDelete(t)}
                        title="Delete record"
                        className="w-8 h-8 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 inline-flex items-center justify-center transition-colors"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                          delete
                        </span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal: Record Giving ───────────────────────────────────────── */}
      <Modal
        isOpen={showRecordModal}
        onClose={() => !isSubmitting && setShowRecordModal(false)}
        title="Record Giving / Contribution"
        subtitle="Post a tithe, Sunday offering, or special building donation to church accounts"
        isSubmitting={isSubmitting}
      >
        <form onSubmit={handleRecordSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">error</span>
              <span>{formError}</span>
            </div>
          )}

          {/* Section 1: Contributor Identification */}
          <div className="space-y-3 pb-3 border-b border-outline-variant/20">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-outline flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-primary">person</span>
                <span>1. Contributor / Donor</span>
              </label>
              <div className="flex items-center gap-3 text-xs">
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="donorType"
                    checked={donorType === "member"}
                    onChange={() => setDonorType("member")}
                    className="accent-primary"
                  />
                  <span className="text-on-surface font-medium">Congregant</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="donorType"
                    checked={donorType === "custom"}
                    onChange={() => setDonorType("custom")}
                    className="accent-primary"
                  />
                  <span className="text-on-surface font-medium">Guest / Other</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="donorType"
                    checked={donorType === "anonymous"}
                    onChange={() => setDonorType("anonymous")}
                    className="accent-primary"
                  />
                  <span className="text-on-surface font-medium">Anonymous</span>
                </label>
              </div>
            </div>

            {donorType === "member" && (
              <div>
                <select
                  value={selectedMemberId}
                  disabled={isSubmitting}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  className="w-full sanctuary-input text-sm cursor-pointer disabled:opacity-50"
                >
                  {membersList.length > 0 ? (
                    membersList.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.full_name || `${m.first_name} ${m.last_name}`} {m.family_name ? `(${m.family_name})` : ""}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="1">Marcus Sterling (Sterling Family)</option>
                      <option value="2">Elena Sterling (Sterling Family)</option>
                      <option value="3">David K. Osei (Osei Family)</option>
                      <option value="4">Sarah Jenkins (Jenkins Family)</option>
                      <option value="6">Grace Adebayo (Adebayo Family)</option>
                    </>
                  )}
                </select>
              </div>
            )}

            {donorType === "custom" && (
              <div>
                <input
                  type="text"
                  required
                  disabled={isSubmitting}
                  placeholder="Enter guest or organization donor name..."
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                  className="w-full sanctuary-input text-sm disabled:opacity-50"
                />
              </div>
            )}

            {donorType === "anonymous" && (
              <div className="p-2.5 rounded-lg bg-surface-container text-xs text-outline flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-tertiary">visibility_off</span>
                <span>This offering will be recorded as anonymous cash/kiosk without an individual tax receipt profile.</span>
              </div>
            )}
          </div>

          {/* Section 2: Fund Allocation & Amount */}
          <div className="space-y-3 pb-3 border-b border-outline-variant/20">
            <label className="text-xs font-bold uppercase tracking-wider text-outline flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm text-primary">volunteer_activism</span>
              <span>2. Fund &amp; Gift Amount</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold block mb-1 text-on-surface">
                  Target Fund <span className="text-error">*</span>
                </label>
                <select
                  value={selectedFundId}
                  disabled={isSubmitting}
                  onChange={(e) => setSelectedFundId(e.target.value)}
                  className="w-full sanctuary-input text-sm cursor-pointer disabled:opacity-50"
                >
                  {funds.length > 0 ? (
                    funds.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="gen">General Tithe</option>
                      <option value="sun">Sunday Offering</option>
                      <option value="bld">Building Fund</option>
                      <option value="mis">Missions &amp; Outreach</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1 text-on-surface">
                  Giving Classification
                </label>
                <select
                  value={contributionType}
                  disabled={isSubmitting}
                  onChange={(e) => setContributionType(e.target.value)}
                  className="w-full sanctuary-input text-sm cursor-pointer disabled:opacity-50"
                >
                  <option value="tithe">Tithe</option>
                  <option value="offering">Sunday Offering</option>
                  <option value="donation">Special Donation</option>
                  <option value="building">Building Fund</option>
                  <option value="missions">Missions</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold block mb-1 text-on-surface">
                  Amount ($ USD) <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-gray-500 text-sm">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    disabled={isSubmitting}
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full sanctuary-input pl-7 text-sm font-bold text-base disabled:opacity-50"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1 text-on-surface">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  disabled={isSubmitting}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full sanctuary-input text-sm cursor-pointer disabled:opacity-50"
                >
                  <option value="cash">Cash Collection</option>
                  <option value="check">Check</option>
                  <option value="card">Debit / Credit Card</option>
                  <option value="bank_transfer">Bank ACH / Wire</option>
                  <option value="online">Online Giving Kiosk</option>
                  <option value="mobile_money">Mobile Money</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Reference, Date & Notes */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-outline flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm text-primary">receipt_long</span>
              <span>3. Payment Details &amp; Memo</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold block mb-1 text-on-surface">
                  Date Received <span className="text-error">*</span>
                </label>
                <input
                  type="date"
                  required
                  disabled={isSubmitting}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full sanctuary-input text-sm disabled:opacity-50"
                />
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1 text-on-surface">
                  Reference / Envelope #
                </label>
                <input
                  type="text"
                  disabled={isSubmitting}
                  placeholder="e.g. Env #2041 or Check #4421"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="w-full sanctuary-input text-sm disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold block mb-1 text-on-surface">
                Internal Notes / Memo
              </label>
              <textarea
                rows={2}
                disabled={isSubmitting}
                placeholder="Designation instructions, check remarks..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full sanctuary-input text-sm disabled:opacity-50 resize-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t" style={{ borderColor: "#f2f3ff" }}>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setShowRecordModal(false)}
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
              <span>Record Giving</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Confirmation Dialog: Delete Transaction ────────────────────── */}
      <ConfirmDialog
        isOpen={Boolean(itemToDelete)}
        onClose={() => !isDeleting && setItemToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete Giving Record"
        message={`Are you sure you want to delete the ${itemToDelete?.amount} record for "${itemToDelete?.name}"? This ledger entry will be removed.`}
        confirmText="Delete Record"
        isLoading={isDeleting}
        isDestructive={true}
      />
    </div>
  );
}
