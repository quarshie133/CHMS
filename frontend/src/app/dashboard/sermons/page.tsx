"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { sermonsApi, type Sermon } from "@/lib/api";

const SAMPLE_SERMONS: Sermon[] = [
  {
    id: "1",
    title: "Walking in Divine Purpose",
    speaker: "Pastor Grace Miller",
    scripture_reference: "Jeremiah 29:11-14",
    date: "2026-09-27",
    series_title: "Faith for the Future",
    thumbnail: null,
    video_url: "https://youtube.com",
    audio_url: "https://audio.churchms.org",
    is_published: true,
    views_count: 482,
    tags: ["Faith", "Purpose", "Hope"],
  },
  {
    id: "2",
    title: "The Architecture of Unceasing Prayer",
    speaker: "Pastor Grace Miller",
    scripture_reference: "1 Thessalonians 5:16-18",
    date: "2026-09-20",
    series_title: "Faith for the Future",
    thumbnail: null,
    video_url: "https://youtube.com",
    audio_url: "https://audio.churchms.org",
    is_published: true,
    views_count: 615,
    tags: ["Prayer", "Spiritual Disciplines"],
  },
  {
    id: "3",
    title: "Generosity That Moves Mountains",
    speaker: "Guest Evangelist Samuel King",
    scripture_reference: "2 Corinthians 9:6-11",
    date: "2026-09-13",
    series_title: "Kingdom Stewardship",
    thumbnail: null,
    video_url: "https://youtube.com",
    audio_url: "https://audio.churchms.org",
    is_published: true,
    views_count: 530,
    tags: ["Giving", "Faith"],
  },
  {
    id: "4",
    title: "Rooted: Overcoming Seasons of Anxiety",
    speaker: "Pastor Grace Miller",
    scripture_reference: "Philippians 4:4-9",
    date: "2026-09-06",
    series_title: "Rooted & Established",
    thumbnail: null,
    video_url: "https://youtube.com",
    audio_url: "https://audio.churchms.org",
    is_published: true,
    views_count: 890,
    tags: ["Peace", "Mental Health", "Comfort"],
  },
];

export default function SermonsPage() {
  const { token } = useAuth();
  const [sermons, setSermons] = useState<Sermon[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Form states
  const [newTitle, setNewTitle] = useState("");
  const [newSpeaker, setNewSpeaker] = useState("Pastor Grace Miller");
  const [newScripture, setNewScripture] = useState("");
  const [newSeries, setNewSeries] = useState("Faith for the Future");

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    sermonsApi
      .list(token, params.toString())
      .then((r) => {
        if (r.results && r.results.length > 0) {
          setSermons(r.results);
        } else {
          setSermons(SAMPLE_SERMONS);
        }
      })
      .catch((e) => {
        console.warn("Could not fetch remote sermons, using Sanctuary sample sermons", e);
        setSermons(SAMPLE_SERMONS);
      })
      .finally(() => setLoading(false));
  }, [token, search]);

  const filtered = sermons.filter(
    (s) =>
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.speaker.toLowerCase().includes(search.toLowerCase()) ||
      s.scripture_reference.toLowerCase().includes(search.toLowerCase())
  );

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const added: Sermon = {
      id: Date.now().toString(),
      title: newTitle,
      speaker: newSpeaker,
      scripture_reference: newScripture,
      date: new Date().toISOString().split("T")[0],
      series_title: newSeries,
      thumbnail: null,
      video_url: "",
      audio_url: "",
      is_published: true,
      views_count: 1,
      tags: ["Sunday Sermon"],
    };
    setSermons([added, ...sermons]);
    setShowUploadModal(false);
    setNewTitle("");
    setNewScripture("");
  };

  return (
    <div className="flex flex-col gap-6 slide-up">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <nav className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "#747686" }}>
            <span>Home</span>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span style={{ color: "#0037b0" }}>Sermons &amp; Media</span>
          </nav>
          <h1 className="text-2xl font-bold" style={{ color: "#131b2e", letterSpacing: "-0.015em" }}>
            Sermon Archive &amp; Media
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "#434655" }}>
            Manage Sunday pulpit recordings, series artwork, study notes, and podcasts
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowUploadModal(true)}
            className="sanctuary-btn-primary text-xs"
          >
            <span className="material-symbols-outlined text-sm">cloud_upload</span>
            Upload Sermon
          </button>
        </div>
      </div>

      {/* ── Search Bar ──────────────────────────────────────────────── */}
      <div className="relative max-w-md">
        <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-sm" style={{ color: "#747686" }}>
          search
        </span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by sermon title, preacher, or scripture..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl sanctuary-input text-xs"
        />
      </div>

      {/* ── Sermon Cards Grid ────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center h-48" style={{ color: "#747686" }}>
          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
          Loading sermon library...
        </div>
      ) : filtered.length === 0 ? (
        <div className="sanctuary-card p-12 text-center text-xs" style={{ color: "#747686" }}>
          No sermons matching your search query.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((s) => (
            <div
              key={s.id}
              className="sanctuary-card overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow group"
            >
              <div>
                {/* Banner Header */}
                <div
                  className="h-36 relative flex items-center justify-center p-4"
                  style={{
                    background: "linear-gradient(135deg, #1d4ed8 0%, #002171 100%)",
                    color: "#ffffff",
                  }}
                >
                  <div className="absolute top-3 left-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-white/20 backdrop-blur-md">
                      {s.series_title || "Sunday Sermon"}
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center group-hover:scale-110 transition-transform cursor-pointer">
                    <span className="material-symbols-outlined text-2xl text-white">play_arrow</span>
                  </div>
                  <div className="absolute bottom-3 right-3 text-[11px] font-medium bg-black/40 px-2 py-0.5 rounded-md">
                    {s.views_count} views
                  </div>
                </div>

                {/* Body */}
                <div className="p-5 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "#855300" }}>
                    <span className="material-symbols-outlined text-sm">menu_book</span>
                    <span>{s.scripture_reference}</span>
                  </div>

                  <h3 className="text-base font-bold line-clamp-1" style={{ color: "#131b2e" }}>
                    {s.title}
                  </h3>

                  <div className="flex items-center gap-2 pt-1 text-xs" style={{ color: "#434655" }}>
                    <span className="material-symbols-outlined text-sm" style={{ color: "#0037b0" }}>person</span>
                    <span className="font-semibold">{s.speaker}</span>
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="px-5 py-3 border-t flex items-center justify-between text-xs" style={{ borderColor: "#e2e7ff", background: "#f2f3ff" }}>
                <span style={{ color: "#747686" }}>
                  {new Date(s.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
                <div className="flex items-center gap-2">
                  <button className="text-[#0037b0] hover:underline font-bold text-[11px] flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-xs">headphones</span> Listen
                  </button>
                  <button className="text-[#0037b0] hover:underline font-bold text-[11px] flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-xs">download</span> Notes
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal: Upload Sermon ─────────────────────────────────────── */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="sanctuary-card w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: "#e2e7ff" }}>
              <h3 className="text-base font-bold" style={{ color: "#131b2e" }}>Upload Sermon Recording</h3>
              <button onClick={() => setShowUploadModal(false)} className="text-gray-400 hover:text-gray-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: "#747686" }}>
                  Sermon Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Walking in Divine Purpose"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full sanctuary-input text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: "#747686" }}>
                  Preacher / Speaker
                </label>
                <input
                  type="text"
                  required
                  value={newSpeaker}
                  onChange={(e) => setNewSpeaker(e.target.value)}
                  className="w-full sanctuary-input text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: "#747686" }}>
                  Scripture Reference
                </label>
                <input
                  type="text"
                  placeholder="e.g. Romans 8:28-39"
                  value={newScripture}
                  onChange={(e) => setNewScripture(e.target.value)}
                  className="w-full sanctuary-input text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: "#747686" }}>
                  Sermon Series
                </label>
                <input
                  type="text"
                  value={newSeries}
                  onChange={(e) => setNewSeries(e.target.value)}
                  className="w-full sanctuary-input text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="sanctuary-btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="sanctuary-btn-primary text-xs">
                  Save Sermon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
