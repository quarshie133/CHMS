"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { eventsApi, membersApi, type Event, type Member } from "@/lib/api";
import { Modal, ConfirmDialog } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";

interface EventItem {
  id: string;
  title: string;
  time: string;
  category: string;
  location: string;
  date: string;
  count?: string;
  bg?: string;
  color?: string;
  sub?: string;
  requiresRsvp?: boolean;
}

const SAMPLE_EVENTS: EventItem[] = [
  {
    id: "sample-1",
    title: "Sunday Miracle & Celebration Service",
    time: "09:30 AM",
    date: "2026-10-04",
    category: "Sunday Services",
    location: "Main Sanctuary (TLPCI Central)",
    count: "240 RSVP",
    bg: "#1d4ed8",
    color: "#ffffff",
    sub: "Worship & Praise Team",
  },
  {
    id: "sample-2",
    title: "Wednesday Midweek Word & Prayer",
    time: "07:00 PM",
    date: "2026-10-07",
    category: "Prayer Meetings",
    location: "Fellowship Hall & Online",
    count: "85 Attending",
    bg: "#2151da",
    color: "#ffffff",
    sub: "Pastor Grace Miller",
  },
  {
    id: "sample-3",
    title: "Youth Fall Harvest Night",
    time: "05:00 PM",
    date: "2026-10-16",
    category: "Youth & Children",
    location: "Youth Hall & Chapel",
    count: "150 Capacity",
    bg: "#ffddb8",
    color: "#2a1700",
    sub: "TELPSAM Youth Committee",
  },
  {
    id: "sample-4",
    title: "Men's Breakfast & Word Fellowship",
    time: "08:30 AM",
    date: "2026-10-10",
    category: "Bible Studies",
    location: "Fellowship Hall",
    count: "28 Men",
    bg: "#855300",
    color: "#ffffff",
    sub: "Deacon Ray Campbell",
  },
];

const EVENT_TYPES = [
  "Sunday Services",
  "Youth & Children",
  "Prayer Meetings",
  "Bible Studies",
  "Outreach & Community",
];

const CHURCH_VENUES = [
  "Main Sanctuary (TLPCI Central)",
  "Fellowship Hall",
  "Youth Hall & Chapel",
  "Children's Church Pavilion",
  "Conference Room A (Admin)",
  "Prayer Garden & Courtyard",
  "Online / Virtual Livestream",
];

export default function EventsPage() {
  const { token } = useAuth();
  const { success, error } = useToast();

  const [view, setView] = useState("Month");
  const [selectedCategory, setSelectedCategory] = useState("All Types");
  const [events, setEvents] = useState<EventItem[]>([]);
  const [membersList, setMembersList] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal / Form state for Create & Edit
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState(EVENT_TYPES[0]);
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formTime, setFormTime] = useState("09:00");
  const [formLocation, setFormLocation] = useState(CHURCH_VENUES[0]);
  const [selectedLocationMode, setSelectedLocationMode] = useState(CHURCH_VENUES[0]);
  const [formLeader, setFormLeader] = useState("Ministry Team");
  const [selectedLeaderMode, setSelectedLeaderMode] = useState("Ministry Team");
  const [formRsvp, setFormRsvp] = useState(false);
  const [formDesc, setFormDesc] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete state
  const [eventToDelete, setEventToDelete] = useState<EventItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchEvents = useCallback(() => {
    if (!token) {
      setEvents(SAMPLE_EVENTS);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Fetch members for Host / Leader selector
    membersApi
      .list(token)
      .then((r) => {
        if (r.results && r.results.length > 0) {
          setMembersList(r.results);
        }
      })
      .catch((e) => console.warn("Members fetch fallback for events", e));

    eventsApi
      .list(token)
      .then((res) => {
        if (res.results && res.results.length > 0) {
          const mapped: EventItem[] = res.results.map((e) => {
            let timeStr = "09:00 AM";
            let dateStr = "2026-10-04";
            if (e.start_datetime) {
              const d = new Date(e.start_datetime);
              if (!isNaN(d.getTime())) {
                timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                dateStr = d.toISOString().split("T")[0];
              }
            }
            return {
              id: e.id,
              title: e.title,
              time: timeStr,
              date: dateStr,
              category: e.category_name || "Sunday Services",
              location: e.location || "TLPCI Central",
              count: e.rsvp_count ? `${e.rsvp_count} RSVP` : "Open Event",
              bg: "#1d4ed8",
              color: "#ffffff",
              sub: e.description || "Church event",
              requiresRsvp: e.requires_rsvp,
            };
          });
          setEvents(mapped);
        } else {
          setEvents(SAMPLE_EVENTS);
        }
      })
      .catch((e) => {
        console.warn("Could not fetch remote events, using sample events", e);
        setEvents(SAMPLE_EVENTS);
      })
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const openCreateModal = () => {
    setEditingEvent(null);
    setFormTitle("");
    setFormCategory(EVENT_TYPES[0]);
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormTime("09:00");
    setFormLocation(CHURCH_VENUES[0]);
    setSelectedLocationMode(CHURCH_VENUES[0]);
    setFormLeader("Ministry Team");
    setSelectedLeaderMode("Ministry Team");
    setFormRsvp(false);
    setFormDesc("");
    setFormError("");
    setShowModal(true);
  };

  const openEditModal = (ev: EventItem) => {
    setEditingEvent(ev);
    setFormTitle(ev.title);
    setFormCategory(ev.category || EVENT_TYPES[0]);
    setFormDate(ev.date || new Date().toISOString().split("T")[0]);
    setFormTime(ev.time.includes(":") ? ev.time.replace(/ AM| PM/, "") : "09:00");

    const loc = ev.location || CHURCH_VENUES[0];
    setFormLocation(loc);
    setSelectedLocationMode(CHURCH_VENUES.includes(loc) ? loc : "custom");

    const leader = ev.sub || "Ministry Team";
    setFormLeader(leader);
    const matched = membersList.some(
      (m) => `${m.first_name} ${m.last_name}`.toLowerCase() === leader.toLowerCase()
    );
    setSelectedLeaderMode(matched ? leader : leader === "Ministry Team" ? "Ministry Team" : "custom");

    setFormRsvp(ev.requiresRsvp ?? false);
    setFormDesc(ev.sub || "");
    setFormError("");
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError("Event title is required.");
      return;
    }

    setFormError("");
    setIsSubmitting(true);

    try {
      const startIso = `${formDate}T${formTime}:00Z`;

      if (editingEvent) {
        // UPDATE
        if (token && !editingEvent.id.startsWith("sample-")) {
          await eventsApi.update(token, editingEvent.id, {
            title: formTitle.trim(),
            location: formLocation.trim(),
            start_datetime: startIso,
            description: formDesc.trim(),
            requires_rsvp: formRsvp,
          });
        }

        setEvents((prev) =>
          prev.map((item) =>
            item.id === editingEvent.id
              ? {
                  ...item,
                  title: formTitle.trim(),
                  category: formCategory,
                  date: formDate,
                  time: formTime,
                  location: formLocation.trim(),
                  sub: formDesc.trim() || formLeader,
                  requiresRsvp: formRsvp,
                }
              : item
          )
        );
        success("Event updated", `"${formTitle.trim()}" has been updated.`);
      } else {
        // CREATE
        let newId = Date.now().toString();
        if (token) {
          try {
            const res = await eventsApi.create(token, {
              title: formTitle.trim(),
              location: formLocation.trim(),
              start_datetime: startIso,
              end_datetime: startIso,
              description: formDesc.trim(),
              requires_rsvp: formRsvp,
            });
            if (res?.id) newId = res.id;
          } catch (apiErr: any) {
            console.warn("Backend event create fallback", apiErr);
          }
        }

        const newEv: EventItem = {
          id: newId,
          title: formTitle.trim(),
          time: formTime,
          date: formDate,
          category: formCategory,
          location: formLocation.trim(),
          count: formRsvp ? "RSVP Open" : "Open Service",
          bg: "#1d4ed8",
          color: "#ffffff",
          sub: formDesc.trim() || formLeader,
          requiresRsvp: formRsvp,
        };

        setEvents((prev) => [newEv, ...prev]);
        success("Event scheduled", `"${formTitle.trim()}" is now published.`);
      }

      setShowModal(false);
    } catch (err: any) {
      setFormError(err?.detail || "Could not save event. Please check required fields.");
      error("Save failed", err?.detail);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!eventToDelete) return;
    setIsDeleting(true);

    try {
      if (token && !eventToDelete.id.startsWith("sample-")) {
        await eventsApi.remove(token, eventToDelete.id);
      }
      setEvents((prev) => prev.filter((ev) => ev.id !== eventToDelete.id));
      success("Event removed", `"${eventToDelete.title}" has been deleted.`);
      setEventToDelete(null);
    } catch (err: any) {
      error("Delete failed", err?.detail || "Could not delete event.");
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredEvents = events.filter((ev) => {
    if (selectedCategory === "All Types") return true;
    return ev.category === selectedCategory;
  });

  return (
    <div className="flex flex-col w-full px-4 sm:px-6 lg:px-8 py-6 gap-6 max-w-[1440px] mx-auto slide-up">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <span style={{ fontSize: 30, fontWeight: 600, color: "#131b2e", letterSpacing: "-0.015em" }}>
              Events &amp; Services
            </span>
            <span
              className="inline-flex items-center px-2.5 py-0.5 rounded-full"
              style={{ background: "#e2e7ff", color: "#0037b0", fontSize: 11 }}
            >
              <span className="w-1.5 h-1.5 rounded-full mr-1.5 animate-pulse" style={{ background: "#0037b0" }} />
              Live Schedule
            </span>
          </div>
          <p style={{ fontSize: 14, color: "#434655" }}>
            Schedule services, ministry meetings, and church community events for TLPCI Central
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={fetchEvents}
            disabled={loading}
            title="Refresh events"
            className="p-2.5 rounded-lg border border-[#e2e7ff] bg-white hover:bg-[#f2f3ff] text-[#434655] transition-colors"
          >
            <span className={`material-symbols-outlined text-sm ${loading ? "animate-spin" : ""}`}>
              refresh
            </span>
          </button>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 rounded-lg shadow-sm transition-all flex items-center gap-1.5 hover:bg-blue-700 active:scale-95"
            style={{ background: "#1d4ed8", color: "#ffffff", fontSize: 13, fontWeight: 600 }}
          >
            <span className="material-symbols-outlined text-lg">add</span>
            <span>Create Event</span>
          </button>
        </div>
      </div>

      {/* Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {["All Types", ...EVENT_TYPES].map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className="px-3.5 py-1.5 rounded-full transition-all shadow-sm flex items-center gap-2 whitespace-nowrap text-xs font-semibold"
            style={{
              background: selectedCategory === cat ? "#1d4ed8" : "#ffffff",
              color: selectedCategory === cat ? "#ffffff" : "#131b2e",
              border: selectedCategory === cat ? "none" : "1px solid #e2e7ff",
            }}
          >
            <span>{cat}</span>
          </button>
        ))}
      </div>

      {/* Main Grid: Events List & Side Quick Schedule Panel */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Events Cards */}
        <div className="xl:col-span-8 flex flex-col gap-4">
          {loading ? (
            <div className="flex items-center justify-center h-48 bg-white rounded-xl" style={{ color: "#747686" }}>
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
              Loading church events...
            </div>
          ) : filteredEvents.length === 0 ? (
            <div
              className="bg-white rounded-xl p-12 text-center text-xs flex flex-col items-center justify-center gap-3 border shadow-sm"
              style={{ borderColor: "#e2e7ff" }}
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ background: "#eaedff", color: "#0037b0" }}
              >
                <span className="material-symbols-outlined text-2xl">event_busy</span>
              </div>
              <div>
                <h4 className="text-sm font-bold" style={{ color: "#131b2e" }}>
                  No scheduled events found
                </h4>
                <p className="text-xs mt-1 max-w-sm" style={{ color: "#747686" }}>
                  {selectedCategory !== "All Types"
                    ? `No events currently match the "${selectedCategory}" category filter.`
                    : "No upcoming events scheduled. Click below to add a service or ministry gathering."}
                </p>
              </div>
              {selectedCategory !== "All Types" ? (
                <button
                  onClick={() => setSelectedCategory("All Types")}
                  className="sanctuary-btn-secondary text-xs mt-1"
                >
                  Show All Types
                </button>
              ) : (
                <button onClick={openCreateModal} className="sanctuary-btn-primary text-xs mt-1">
                  <span className="material-symbols-outlined text-sm">add</span>
                  Create Event
                </button>
              )}
            </div>
          ) : (
            filteredEvents.map((ev) => (
              <div
                key={ev.id}
                className="bg-white rounded-xl p-5 shadow-sm border flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-md transition-shadow group"
                style={{ borderColor: "#e2e7ff" }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-14 h-14 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
                    style={{ background: "#eaedff", color: "#0037b0" }}
                  >
                    <span className="text-[11px] font-bold uppercase">{ev.date ? new Date(ev.date).toLocaleDateString([], { month: "short" }) : "NOV"}</span>
                    <span className="text-lg font-bold leading-tight">{ev.date ? new Date(ev.date).getDate() : "04"}</span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
                        style={{ background: "#eaedff", color: "#0037b0" }}
                      >
                        {ev.category}
                      </span>
                      <span className="text-xs text-[#747686] flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">schedule</span>
                        {ev.time}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-[#131b2e]">{ev.title}</h3>
                    <p className="text-xs text-[#434655] flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs text-gray-400">location_on</span>
                      {ev.location}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pt-3 sm:pt-0 border-t sm:border-0 border-gray-100">
                  <span
                    className="px-3 py-1 rounded-full text-xs font-semibold"
                    style={{ background: "#dcfce7", color: "#15803d" }}
                  >
                    {ev.count}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(ev)}
                      title="Edit event"
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-blue-600 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <button
                      onClick={() => setEventToDelete(ev)}
                      title="Delete event"
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Side Panel: Quick Calendar Highlights */}
        <div
          className="xl:col-span-4 bg-white rounded-xl shadow-sm p-6 flex flex-col gap-4 border"
          style={{ borderColor: "#e2e7ff" }}
        >
          <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: "#e2e7ff" }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#131b2e" }}>Service Schedule Summary</h3>
              <p style={{ fontSize: 12, color: "#434655" }}>Weekly recurring fellowship &amp; services</p>
            </div>
            <span className="material-symbols-outlined text-blue-600">calendar_month</span>
          </div>

          <div className="space-y-3">
            {[
              { day: "Sunday", title: "Miracle & Celebration Service", time: "9:30 AM - 12:00 PM", hall: "Main Sanctuary" },
              { day: "Tuesday", title: "Women's Devotional Roster", time: "6:00 PM - 7:30 PM", hall: "Upper Room" },
              { day: "Wednesday", title: "Midweek Word & Prayer", time: "7:00 PM - 8:30 PM", hall: "Fellowship Hall" },
              { day: "Thursday", title: "Choir Rehearsal", time: "7:00 PM - 9:00 PM", hall: "Main Sanctuary" },
              { day: "Friday", title: "TELPSAM Youth Fellowship", time: "6:30 PM - 8:30 PM", hall: "Youth Hall" },
              { day: "Saturday", title: "Men's Fellowship Breakfast", time: "8:30 AM - 10:00 AM", hall: "Fellowship Hall" },
            ].map((sched) => (
              <div key={sched.title} className="p-3 rounded-xl bg-[#f2f3ff] flex items-start gap-3">
                <div className="w-16 flex-shrink-0">
                  <span className="text-xs font-bold text-blue-700 block">{sched.day}</span>
                  <span className="text-[10px] text-gray-500">{sched.time.split(" - ")[0]}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-bold text-gray-900 block truncate">{sched.title}</span>
                  <span className="text-[11px] text-gray-500">{sched.hall}</span>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={openCreateModal}
            className="w-full sanctuary-btn-primary text-xs justify-center py-2.5 mt-2"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Schedule Special Event
          </button>
        </div>
      </div>

      {/* ── Modal: Create / Edit Event ───────────────────────────────── */}
      <Modal
        isOpen={showModal}
        onClose={() => !isSubmitting && setShowModal(false)}
        title={editingEvent ? "Edit Event" : "Create New Event"}
        subtitle={
          editingEvent
            ? `Update details and venue for "${editingEvent.title}"`
            : "Fill details to schedule and invite congregation to service or meeting"
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
            <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: "#747686" }}>
              Event Title *
            </label>
            <input
              type="text"
              required
              disabled={isSubmitting}
              placeholder="e.g. Youth Fall Harvest Night"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              className="w-full sanctuary-input text-sm disabled:opacity-50"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: "#747686" }}>
                Event Type / Ministry
              </label>
              <select
                value={formCategory}
                disabled={isSubmitting}
                onChange={(e) => setFormCategory(e.target.value)}
                className="w-full sanctuary-input text-sm cursor-pointer disabled:opacity-50"
              >
                {EVENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: "#747686" }}>
                Date *
              </label>
              <input
                type="date"
                required
                disabled={isSubmitting}
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full sanctuary-input text-sm disabled:opacity-50"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: "#747686" }}>
                Start Time *
              </label>
              <input
                type="time"
                required
                disabled={isSubmitting}
                value={formTime}
                onChange={(e) => setFormTime(e.target.value)}
                className="w-full sanctuary-input text-sm disabled:opacity-50"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: "#747686" }}>
                Venue / Location *
              </label>
              <div className="space-y-1.5">
                <select
                  value={selectedLocationMode}
                  disabled={isSubmitting}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedLocationMode(val);
                    if (val !== "custom") {
                      setFormLocation(val);
                    } else {
                      setFormLocation("");
                    }
                  }}
                  className="w-full sanctuary-input text-sm cursor-pointer disabled:opacity-50"
                >
                  {CHURCH_VENUES.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                  <option value="custom">+ Other / Custom Location</option>
                </select>

                {(selectedLocationMode === "custom" ||
                  (!CHURCH_VENUES.includes(formLocation) && formLocation)) && (
                  <input
                    type="text"
                    required
                    disabled={isSubmitting}
                    placeholder="Enter specific facility or address..."
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    className="w-full sanctuary-input text-sm disabled:opacity-50"
                  />
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: "#747686" }}>
              Leader / Host
            </label>
            <div className="space-y-1.5">
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
                <option value="Ministry Team">Ministry Team / Pastoral Staff</option>
                {membersList.map((m) => {
                  const fullName = `${m.first_name} ${m.last_name}`;
                  return (
                    <option key={m.id} value={fullName}>
                      {fullName} {m.life_stage ? `(${m.life_stage})` : ""}
                    </option>
                  );
                })}
                <option value="custom">+ Other / Enter Custom Host</option>
              </select>

              {(selectedLeaderMode === "custom" ||
                (selectedLeaderMode !== "Ministry Team" &&
                  !membersList.some(
                    (m) =>
                      `${m.first_name} ${m.last_name}`.toLowerCase() === formLeader.toLowerCase()
                  ) &&
                  formLeader)) && (
                <input
                  type="text"
                  disabled={isSubmitting}
                  placeholder="e.g. Pastor Grace Miller, Visiting Evangelist"
                  value={formLeader}
                  onChange={(e) => setFormLeader(e.target.value)}
                  className="w-full sanctuary-input text-sm disabled:opacity-50"
                />
              )}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: "#747686" }}>
              Event Description &amp; Details
            </label>
            <textarea
              rows={3}
              disabled={isSubmitting}
              placeholder="Agenda, special guest ministers, guidelines..."
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              className="w-full sanctuary-input text-sm disabled:opacity-50 leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <div>
              <span className="text-xs font-bold block" style={{ color: "#131b2e" }}>
                Require RSVP Registration
              </span>
              <span className="text-[11px]" style={{ color: "#747686" }}>
                Track headcounts for catering and seating
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formRsvp}
                disabled={isSubmitting}
                onChange={(e) => setFormRsvp(e.target.checked)}
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
              <span>{editingEvent ? "Save Changes" : "Publish Event"}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Confirmation Dialog: Delete Event ────────────────────────── */}
      <ConfirmDialog
        isOpen={Boolean(eventToDelete)}
        onClose={() => !isDeleting && setEventToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete Event"
        message={`Are you sure you want to delete "${eventToDelete?.title}"? All scheduled reminders and registration rosters will be cancelled.`}
        confirmText="Delete Event"
        isLoading={isDeleting}
        isDestructive={true}
      />
    </div>
  );
}
