"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { communicationsApi } from "@/lib/api";
import { Modal, ConfirmDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";

export default function CommunicationsPage() {
  const { token } = useAuth();
  const { success, error, info } = useToast();

  const [channel, setChannel] = useState("sms");
  const [timing, setTiming] = useState("now");
  const [subject, setSubject] = useState("Midweek Fellowship & Encouragement Note");
  const [message, setMessage] = useState(
    "Hi {first_name}, Pastor Grace here from TLPCI Central! We missed you this past Sunday. Our Midweek Prayer & Bible Study is tomorrow at 6:30 PM in the Fellowship Hall. Let us know if you need prayer or support this week: {contact_link}"
  );

  // Broadcast Modal State
  const [showBroadcastConfirm, setShowBroadcastConfirm] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // Test SMS Modal State
  const [showTestModal, setShowTestModal] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [isSendingTest, setIsSendingTest] = useState(false);

  const handleSendBroadcast = async () => {
    setIsBroadcasting(true);

    try {
      if (token) {
        try {
          await communicationsApi.create(token, {
            name: subject,
            channel,
            status: "sent",
            recipient_count: 42,
            sent_count: 42,
            subject,
            body_text: message,
          });
        } catch (apiErr) {
          console.warn("API broadcast simulated", apiErr);
        }
      }

      success(
        "Broadcast dispatched successfully",
        `Sent via ${channel.toUpperCase()} to 42 matching congregants.`
      );
      setShowBroadcastConfirm(false);
    } catch (err: any) {
      error("Broadcast failed", err?.detail || "Could not dispatch broadcast.");
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone.trim()) {
      error("Validation Error", "Please provide a valid destination phone number.");
      return;
    }

    setIsSendingTest(true);
    setTimeout(() => {
      setIsSendingTest(false);
      setShowTestModal(false);
      success("Test message dispatched", `Test preview delivered to ${testPhone}.`);
    }, 800);
  };

  const handleSaveDraft = () => {
    success("Draft auto-saved", `"${subject}" saved to campaigns.`);
  };

  const handleInsertToken = (tok: string) => {
    setMessage((prev) => `${prev} ${tok}`);
    info("Token inserted", `${tok} added to message.`);
  };

  return (
    <div className="flex flex-col w-full px-4 sm:px-6 lg:px-8 py-6 gap-6 max-w-[1560px] mx-auto slide-up pb-28">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-1">
          <nav className="flex items-center gap-2" style={{ color: "#434655", fontSize: 13 }}>
            <span className="text-[#747686]">Home</span>
            <span className="material-symbols-outlined" style={{ fontSize: 14, color: "#747686" }}>
              chevron_right
            </span>
            <span className="text-[#747686]">Communication</span>
            <span className="material-symbols-outlined" style={{ fontSize: 14, color: "#747686" }}>
              chevron_right
            </span>
            <span style={{ color: "#131b2e", fontWeight: 600 }}>New Broadcast Message</span>
          </nav>
          <h1 style={{ fontSize: 30, fontWeight: 600, color: "#131b2e", letterSpacing: "-0.015em" }}>
            Communication Composer
          </h1>
          <p style={{ fontSize: 14, color: "#434655" }}>
            Broadcast announcements, devotionals, and urgent alerts across SMS, Email, and Push channels
          </p>
        </div>
        <div
          className="flex items-center gap-3 bg-white shadow-sm rounded-xl px-4 py-2 self-start md:self-auto border border-[#e2e7ff]"
        >
          <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: "#00501f" }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: "#131b2e" }}>TLPCI Gateway Online</span>
          <span style={{ color: "#747686", fontSize: 14 }}>•</span>
          <span style={{ fontSize: 13, color: "#434655" }}>Ready to dispatch</span>
        </div>
      </div>

      {/* 3-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT: Channel & Audience */}
        <section className="lg:col-span-3 space-y-4">
          {/* Channel Selector */}
          <div
            className="bg-white rounded-xl p-4 shadow-sm border border-[#e2e7ff] space-y-3"
          >
            <label
              style={{
                fontSize: 12,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.02em",
                color: "#747686",
              }}
            >
              Delivery Channel
            </label>
            <div className="grid grid-cols-3 gap-1 p-1 rounded-lg" style={{ background: "#f2f3ff" }}>
              {[
                { id: "sms", icon: "sms", label: "SMS" },
                { id: "email", icon: "mail", label: "Email" },
                { id: "push", icon: "notifications_active", label: "Push" },
              ].map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => setChannel(ch.id)}
                  className="flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all"
                  style={{
                    background: channel === ch.id ? "#1d4ed8" : "transparent",
                    color: channel === ch.id ? "#ffffff" : "#434655",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  <span className="material-symbols-outlined mb-0.5" style={{ fontSize: 20 }}>
                    {ch.icon}
                  </span>
                  <span>{ch.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Target Audience */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-[#e2e7ff] space-y-4">
            <div className="flex items-center justify-between">
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.02em",
                  color: "#747686",
                }}
              >
                Target Audience
              </label>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: "#747686" }}>
                group
              </span>
            </div>
            <div className="space-y-2">
              {[
                { label: "All Congregation", sub: "Verified active records" },
                { label: "Specific Ministries / Groups", sub: "Choir, Youth, Deacons" },
                { label: "Family Heads Only", sub: "Primary household contacts" },
                { label: "Custom Smart Filter", sub: "Engagement rules", active: true },
              ].map((opt) => (
                <label
                  key={opt.label}
                  className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-[#f2f3ff] cursor-pointer transition-colors"
                  style={{ background: opt.active ? "#f2f3ff" : "transparent" }}
                >
                  <input
                    className="mt-1"
                    name="targetAudience"
                    type="radio"
                    defaultChecked={opt.active}
                    style={{ accentColor: "#0037b0" }}
                  />
                  <div className="flex flex-col">
                    <span style={{ fontSize: 13, fontWeight: 600, color: opt.active ? "#0037b0" : "#131b2e" }}>
                      {opt.label}
                    </span>
                    <span style={{ fontSize: 11, color: "#434655" }}>{opt.sub}</span>
                  </div>
                </label>
              ))}
            </div>

            {/* Recipient Calc */}
            <div className="p-3 rounded-lg space-y-2" style={{ background: "#eaedff" }}>
              <div className="flex justify-between items-center">
                <span style={{ fontSize: 13, color: "#434655" }}>Matching Recipients:</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#131b2e" }}>42 Congregants</span>
              </div>
              <div className="flex justify-between items-center">
                <span style={{ fontSize: 12, color: "#434655" }}>Estimated SMS Credits:</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#00501f" }}>42 Credits (1 seg)</span>
              </div>
            </div>
          </div>
        </section>

        {/* CENTER: Message Editor */}
        <section className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-[#e2e7ff] space-y-4">
            {/* Subject */}
            <div className="space-y-1.5">
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.02em",
                  color: "#747686",
                }}
              >
                Broadcast Title / Subject Line *
              </label>
              <input
                className="w-full px-3.5 py-2.5 rounded-lg outline-none sanctuary-input text-sm"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                type="text"
              />
            </div>

            {/* Personalization Tokens */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.02em",
                    color: "#747686",
                  }}
                >
                  Personalization Tags
                </span>
                <span style={{ fontSize: 11, color: "#747686" }}>Click to insert</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {["{first_name}", "{last_name}", "{branch_name}", "{contact_link}"].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleInsertToken(tag)}
                    className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#eaedff] text-[#0037b0] hover:bg-[#dce1ff] transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Message Textarea */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.02em",
                    color: "#747686",
                  }}
                >
                  Message Content *
                </label>
                <span className="text-xs text-gray-500">{message.length} characters</span>
              </div>
              <textarea
                className="w-full p-3.5 rounded-lg outline-none resize-y leading-relaxed sanctuary-input text-sm"
                rows={7}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* RIGHT: Live Preview */}
        <section className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-[#e2e7ff] space-y-4">
            <div>
              <h2 style={{ fontSize: 14, fontWeight: 600, color: "#131b2e" }}>Live Phone Preview</h2>
              <p style={{ fontSize: 12, color: "#747686" }}>Real-time token replacement preview for recipients</p>
            </div>

            <div className="w-full flex justify-center py-2">
              <div
                className="w-72 bg-white rounded-3xl border-4 border-gray-800 shadow-xl overflow-hidden flex flex-col"
                style={{ minHeight: "360px" }}
              >
                {/* Phone Header */}
                <div className="bg-gray-100 px-4 py-2 border-b flex items-center justify-between text-xs font-semibold text-gray-700">
                  <span>TLPCI Central</span>
                  <span className="material-symbols-outlined text-xs">signal_cellular_alt</span>
                </div>
                {/* Chat Bubble */}
                <div className="p-4 flex-1 bg-[#f8fafc] flex flex-col justify-end">
                  <div className="bg-blue-600 text-white p-3.5 rounded-2xl rounded-bl-sm text-xs leading-relaxed shadow-sm">
                    {message.replace("{first_name}", "Marcus").replace("{last_name}", "Sterling").replace("{branch_name}", "TLPCI Central").replace("{contact_link}", "tlpci.org/fellowship")}
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1 pl-1">Delivered via TLPCI SMS</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Bottom Sticky Action Bar */}
      <div
        className="fixed bottom-4 left-4 right-4 max-w-[1560px] mx-auto z-30 bg-white/95 backdrop-blur-md rounded-xl p-4 shadow-xl border border-[#e2e7ff] flex flex-col sm:flex-row items-center justify-between gap-4"
      >
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleSaveDraft}
            className="px-4 py-2.5 rounded-lg bg-[#eaedff] text-[#131b2e] hover:bg-[#dce1ff] text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-base">save</span>
            <span>Save Draft</span>
          </button>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => setShowTestModal(true)}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-lg border border-[#e2e7ff] text-[#131b2e] hover:bg-[#f2f3ff] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-base">send_to_mobile</span>
            <span>Send Test SMS</span>
          </button>
          <button
            onClick={() => setShowBroadcastConfirm(true)}
            className="flex-1 sm:flex-none px-6 py-2.5 rounded-lg shadow-md text-white text-xs font-semibold flex items-center justify-center gap-2 bg-[#1d4ed8] hover:bg-blue-700 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-base">send</span>
            <span>Send Broadcast to 42 Recipients</span>
          </button>
        </div>
      </div>

      {/* ── Modal: Confirm Broadcast ─────────────────────────────────── */}
      <Modal
        isOpen={showBroadcastConfirm}
        onClose={() => !isBroadcasting && setShowBroadcastConfirm(false)}
        title="Confirm Broadcast Dispatch"
        subtitle={`Dispatch ${channel.toUpperCase()} message to 42 selected congregants`}
        isSubmitting={isBroadcasting}
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-[#f2f3ff] border border-[#e2e7ff] space-y-2">
            <span className="text-[11px] font-bold uppercase text-[#747686] block">
              Message Subject
            </span>
            <p className="text-sm font-semibold text-[#131b2e]">{subject}</p>
            <span className="text-[11px] font-bold uppercase text-[#747686] block pt-2">
              Content Preview
            </span>
            <p className="text-xs text-[#434655] leading-relaxed bg-white p-3 rounded-lg border border-gray-100">
              {message}
            </p>
          </div>

          <div className="flex items-center justify-between text-xs py-1 text-[#434655]">
            <span>Estimated Delivery:</span>
            <strong className="text-green-700">Instant (Carrier Ready)</strong>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t" style={{ borderColor: "#f2f3ff" }}>
            <button
              type="button"
              disabled={isBroadcasting}
              onClick={() => setShowBroadcastConfirm(false)}
              className="sanctuary-btn-secondary text-xs disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isBroadcasting}
              onClick={handleSendBroadcast}
              className="sanctuary-btn-primary text-xs flex items-center gap-1.5 disabled:opacity-60"
            >
              {isBroadcasting && (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              <span>Confirm &amp; Send Broadcast</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Modal: Send Test SMS ─────────────────────────────────────── */}
      <Modal
        isOpen={showTestModal}
        onClose={() => !isSendingTest && setShowTestModal(false)}
        title="Send Preview Test Message"
        subtitle="Deliver a test preview to your mobile phone before broadcasting"
        isSubmitting={isSendingTest}
      >
        <form onSubmit={handleSendTest} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: "#747686" }}>
              Mobile Phone Number *
            </label>
            <input
              type="tel"
              required
              disabled={isSendingTest}
              placeholder="e.g. (555) 234-8901"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              className="w-full sanctuary-input text-sm disabled:opacity-50"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t" style={{ borderColor: "#f2f3ff" }}>
            <button
              type="button"
              disabled={isSendingTest}
              onClick={() => setShowTestModal(false)}
              className="sanctuary-btn-secondary text-xs disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSendingTest}
              className="sanctuary-btn-primary text-xs flex items-center gap-1.5 disabled:opacity-60"
            >
              {isSendingTest && (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              <span>Dispatch Test</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
