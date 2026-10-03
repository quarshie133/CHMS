"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { membersApi } from "@/lib/api";

import { useToast } from "@/components/ui/toast";

export default function AddPersonPage() {
  const router = useRouter();
  const { token } = useAuth();
  const { success, error: toastError } = useToast();

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [draftTime, setDraftTime] = useState("");

  // Photo state
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Form states
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [preferredName, setPreferredName] = useState("");
  const [gender, setGender] = useState("male");
  const [dob, setDob] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("single");

  const [phone, setPhone] = useState("");
  const [phoneType, setPhoneType] = useState("Mobile");
  const [email, setEmail] = useState("");
  const [sendInvite, setSendInvite] = useState(false);

  const [streetAddress, setStreetAddress] = useState("");
  const [unit, setUnit] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");

  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");

  const [churchRole, setchurchRole] = useState("member");
  const [lifeStage, setLifeStage] = useState("adult");
  const [membershipStatus, setMembershipStatus] = useState("active");
  const [membershipDate, setMembershipDate] = useState(new Date().toISOString().split("T")[0]);
  const [baptismDate, setBaptismDate] = useState("");
  const [baptizedAtCentral, setBaptizedAtCentral] = useState(false);

  const [familySearch, setFamilySearch] = useState("");
  const [hasFamilyChip, setHasFamilyChip] = useState(false);
  const [familyRole, setFamilyRole] = useState("head");

  const [activeMinistries, setActiveMinistries] = useState<string[]>([]);

  const allMinistries = [
    "Worship Team",
    "Men's Fellowship",
    "Ushering & Welcome",
    "Hospitality",
    "Media & Tech",
    "Sunday School Volunteer",
  ];

  const [notes, setNotes] = useState("");

  useEffect(() => {
    const now = new Date();
    setDraftTime(now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
  }, []);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        setPhotoPreview(evt.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleMinistry = (min: string) => {
    setActiveMinistries((prev) =>
      prev.includes(min) ? prev.filter((m) => m !== min) : [...prev, min]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      setFormError("First name and last name are required.");
      toastError("Validation Error", "Please provide both first name and last name.");
      return;
    }

    setFormError("");
    setSaving(true);

    try {
      if (token) {
        await membersApi.create(token, {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim() || undefined,
          phone_mobile: phone.trim() || undefined,
          status: membershipStatus,
          life_stage: lifeStage,
          family_name: hasFamilyChip ? familySearch : undefined,
          membership_date: membershipDate || undefined,
        });
      }
      success("Profile created", `"${firstName.trim()} ${lastName.trim()}" has been saved to the directory.`);
      router.push("/dashboard/members");
    } catch (err: any) {
      console.warn("API member creation error", err);
      const msg = err?.detail || "Could not save member profile. Please check required fields.";
      setFormError(msg);
      toastError("Creation Failed", msg);
      setSaving(false);
    }
  };

  return (
    <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6 pb-32">
      {formError && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
          <span className="material-symbols-outlined text-base">error</span>
          <span>{formError}</span>
        </div>
      )}
      {/* ── Breadcrumb & Header Title Area ── */}
      <div className="flex flex-col gap-1">
        <nav className="flex items-center gap-1.5 text-on-surface-variant text-xs font-semibold">
          <Link href="/dashboard" className="hover:text-primary transition-colors">
            Home
          </Link>
          <span className="material-symbols-outlined text-[14px] text-outline">chevron_right</span>
          <Link href="/dashboard/members" className="hover:text-primary transition-colors">
            People
          </Link>
          <span className="material-symbols-outlined text-[14px] text-outline">chevron_right</span>
          <span className="text-primary font-semibold">Add New Person</span>
        </nav>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-on-surface tracking-tight">Add New Person</h1>
            <p className="text-sm text-on-surface-variant mt-0.5">
              Register a new member, visitor, or staff attendee into the TLPCI directory.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed text-xs font-semibold shadow-sm">
              <span className="w-2 h-2 rounded-full bg-secondary-container animate-pulse"></span>
              Draft Auto-Saved at <span className="font-bold">{draftTime || "10:42 AM"}</span>
            </span>
            <button
              className="px-3.5 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-sm font-semibold transition-colors shadow-sm flex items-center gap-1"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">history</span>
              <span>Load Template</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Two-Column Layout Form ── */}
      <form id="add-person-form" onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ================= LEFT COLUMN (lg:col-span-7) ================= */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* CARD 1: Basic Information */}
          <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[20px]">badge</span>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-on-surface">Basic Information</h2>
                  <p className="text-xs text-on-surface-variant">Core identity, gender, and vital background demographics</p>
                </div>
              </div>
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-surface-container text-outline uppercase tracking-wider">
                Required *
              </span>
            </div>

            {/* Photo Upload Zone */}
            <div className="flex flex-col sm:flex-row items-center gap-5 p-4 bg-surface-container-low rounded-xl">
              <div className="relative w-24 h-24 rounded-full overflow-hidden bg-surface-container-high flex-shrink-0 flex items-center justify-center group shadow-inner">
                {photoPreview ? (
                  <img src={photoPreview} alt="Uploaded headshot" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center justify-center text-outline group-hover:text-primary transition-colors">
                    <span className="material-symbols-outlined text-[36px]">account_circle</span>
                    <span className="text-[11px] mt-0.5">Empty</span>
                  </div>
                )}
                <label
                  htmlFor="photo-file"
                  className="absolute inset-0 bg-on-background/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">photo_camera</span>
                </label>
              </div>

              <div className="flex-1 flex flex-col items-center sm:items-start text-center sm:text-left gap-1">
                <label
                  htmlFor="photo-file"
                  className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-surface-container-lowest text-primary hover:bg-surface-container text-sm font-semibold rounded-xl shadow-sm transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">add_photo_alternate</span>
                  <span>Upload Photo</span>
                  <input
                    id="photo-file"
                    type="file"
                    accept="image/png, image/jpeg"
                    className="sr-only"
                    onChange={handlePhotoUpload}
                  />
                </label>
                <p className="text-xs text-on-surface-variant mt-1">Drag and drop or select JPG, PNG up to 5MB.</p>
                <span className="text-[11px] text-outline">High-resolution headshots recommended for membership badges.</span>
              </div>
            </div>

            {/* Names Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-on-surface">
                  First Name <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Jonathan"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-on-surface text-sm placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 shadow-sm"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-on-surface">
                  Last Name <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g. Sterling"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-on-surface text-sm placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 shadow-sm"
                />
              </div>
            </div>

            {/* Preferred Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-on-surface">Preferred Name / Nickname</label>
              <input
                type="text"
                value={preferredName}
                onChange={(e) => setPreferredName(e.target.value)}
                placeholder="e.g. Nate, Jon"
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-on-surface text-sm placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 shadow-sm"
              />
            </div>

            {/* Gender Segmented Control */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-on-surface">Gender</label>
              <div className="grid grid-cols-3 gap-2 p-1.5 bg-surface-container-low rounded-xl">
                {[
                  { val: "male", label: "Male", icon: "male" },
                  { val: "female", label: "Female", icon: "female" },
                  { val: "unspecified", label: "Prefer not to say", icon: "visibility_off" },
                ].map((g) => (
                  <button
                    key={g.val}
                    type="button"
                    onClick={() => setGender(g.val)}
                    className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-center text-xs font-semibold transition-all ${
                      gender === g.val
                        ? "bg-surface-container-lowest text-primary shadow-sm"
                        : "text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">{g.icon}</span>
                    <span>{g.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* DOB & Marital Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-on-surface">Date of Birth</label>
                <div className="relative">
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-on-surface text-sm focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 shadow-sm"
                  />
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-[20px]">
                    calendar_month
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-on-surface">Marital Status</label>
                <div className="relative">
                  <select
                    value={maritalStatus}
                    onChange={(e) => setMaritalStatus(e.target.value)}
                    className="w-full appearance-none px-3.5 py-2.5 rounded-xl bg-surface-container-low text-on-surface text-sm focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 shadow-sm pr-9"
                  >
                    <option value="single">Single</option>
                    <option value="married">Married</option>
                    <option value="divorced">Divorced</option>
                    <option value="widowed">Widowed</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-[20px]">
                    expand_more
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* CARD 2: Contact Details */}
          <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary-fixed flex items-center justify-center text-secondary">
                <span className="material-symbols-outlined text-[20px]">alternate_email</span>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-on-surface">Contact Details</h2>
                <p className="text-xs text-on-surface-variant">Phone numbers, email routing, physical address, and emergency ties</p>
              </div>
            </div>

            {/* Phone Group */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-on-surface">
                Primary Phone Number <span className="text-error">*</span>
              </label>
              <div className="flex rounded-xl shadow-sm bg-surface-container-low overflow-hidden">
                <span className="inline-flex items-center px-3.5 bg-surface-container-high/60 text-on-surface-variant text-xs font-semibold">
                  +1 (US)
                </span>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 234-8901"
                  className="flex-1 px-3.5 py-2.5 bg-transparent text-on-surface text-sm placeholder:text-outline focus:outline-none"
                />
                <select
                  value={phoneType}
                  onChange={(e) => setPhoneType(e.target.value)}
                  className="bg-surface-container-high/60 text-on-surface text-xs font-semibold px-3 py-2.5 focus:outline-none border-0"
                >
                  <option>Mobile</option>
                  <option>Home</option>
                  <option>Work</option>
                </select>
              </div>
            </div>

            {/* Email Address & Portal Invite Toggle */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-on-surface">
                Email Address <span className="text-error">*</span>
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">
                  mail
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jonathan.sterling@example.org"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-surface-container-low text-on-surface text-sm placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 shadow-sm"
                />
              </div>

              {/* Portal toggle pill */}
              <label className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors cursor-pointer mt-1">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-[20px]">mark_email_read</span>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-on-surface">Send invite to member portal</span>
                    <span className="text-[11px] text-outline">Sends an activation link with sign-in instructions immediately</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={sendInvite}
                  onChange={(e) => setSendInvite(e.target.checked)}
                  className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary cursor-pointer"
                />
              </label>
            </div>

            {/* Residential Address */}
            <div className="flex flex-col gap-3 pt-2">
              <span className="text-sm font-semibold text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-outline">home_pin</span>
                Residential Address
              </span>
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 flex flex-col gap-1">
                    <label className="text-[11px] text-outline font-medium">Street Address</label>
                    <input
                      type="text"
                      value={streetAddress}
                      onChange={(e) => setStreetAddress(e.target.value)}
                      placeholder="742 Evergreen Terrace"
                      className="w-full px-3.5 py-2 rounded-xl bg-surface-container-low text-on-surface text-sm placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 shadow-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-outline font-medium">Apt / Suite / Unit</label>
                    <input
                      type="text"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      placeholder="Suite 4B"
                      className="w-full px-3.5 py-2 rounded-xl bg-surface-container-low text-on-surface text-sm placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 shadow-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-outline font-medium">City</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Springfield"
                      className="w-full px-3.5 py-2 rounded-xl bg-surface-container-low text-on-surface text-sm placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 shadow-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] text-outline font-medium">State / Province</label>
                    <input
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="Oregon"
                      className="w-full px-3.5 py-2 rounded-xl bg-surface-container-low text-on-surface text-sm placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 shadow-sm"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1 flex flex-col gap-1">
                    <label className="text-[11px] text-outline font-medium">Postal Code</label>
                    <input
                      type="text"
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder="97477"
                      className="w-full px-3.5 py-2 rounded-xl bg-surface-container-low text-on-surface text-sm placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 shadow-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Emergency Contact Section */}
            <div className="flex flex-col gap-3 pt-2">
              <span className="text-sm font-semibold text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-error">emergency</span>
                Emergency Contact
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-surface-container-low rounded-xl">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-on-surface font-semibold">Contact Name</label>
                  <input
                    type="text"
                    value={emergencyName}
                    onChange={(e) => setEmergencyName(e.target.value)}
                    placeholder="Sarah Sterling (Wife)"
                    className="w-full px-3.5 py-2 rounded-xl bg-surface-container-lowest text-on-surface text-sm placeholder:text-outline focus:outline-none shadow-sm"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] text-on-surface font-semibold">Emergency Phone</label>
                  <input
                    type="tel"
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    placeholder="(555) 987-6543"
                    className="w-full px-3.5 py-2 rounded-xl bg-surface-container-lowest text-on-surface text-sm placeholder:text-outline focus:outline-none shadow-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================= RIGHT COLUMN (lg:col-span-5) ================= */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* CARD 3: Church & Ministry Details */}
          <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-tertiary-fixed flex items-center justify-center text-tertiary">
                <span className="material-symbols-outlined text-[20px]">church</span>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-on-surface">Church &amp; Ministry Details</h2>
                <p className="text-xs text-on-surface-variant">Church roles, baptism milestones, and church assignment</p>
              </div>
            </div>

            {/* congregation / Campus Badge Pre-selected */}
            <div className="p-3 bg-surface-container-low rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-[20px]">domain</span>
                <div>
                  <span className="text-[11px] text-outline block">Assigned Campus</span>
                  <span className="text-sm font-semibold text-on-surface">TLPCI Central</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed-variant text-xs font-semibold">
                Primary Campus
              </span>
            </div>

            {/* Church Role & Life Stage */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-on-surface">Church Role</label>
                <div className="relative">
                  <select
                    value={churchRole}
                    onChange={(e) => setchurchRole(e.target.value)}
                    className="w-full appearance-none px-3.5 py-2.5 rounded-xl bg-surface-container-low text-on-surface text-sm focus:outline-none shadow-sm pr-9"
                  >
                    <option value="member">Member</option>
                    <option value="staff">Staff Attendee</option>
                    <option value="volunteer">Volunteer</option>
                    <option value="ministry_leader">Ministry Leader</option>
                    <option value="elder_deacon">Elder / Deacon</option>
                    <option value="visitor">First-time Visitor</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-[20px]">
                    expand_more
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-on-surface">Life Stage</label>
                <div className="relative">
                  <select
                    value={lifeStage}
                    onChange={(e) => setLifeStage(e.target.value)}
                    className="w-full appearance-none px-3.5 py-2.5 rounded-xl bg-surface-container-low text-on-surface text-sm focus:outline-none shadow-sm pr-9"
                  >
                    <option value="adult">Adult</option>
                    <option value="young_adult">Young Adult</option>
                    <option value="youth">Youth</option>
                    <option value="child">Child / Sunday School</option>
                    <option value="senior">Senior</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-[20px]">
                    expand_more
                  </span>
                </div>
              </div>
            </div>

            {/* Membership Status Radio Pills */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-on-surface">Membership Status</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { val: "active", label: "Active Member", dotBg: "bg-tertiary-fixed" },
                  { val: "regular", label: "Regular Attendee", dotBg: "bg-secondary-fixed" },
                  { val: "inactive", label: "Inactive", dotBg: "bg-outline" },
                  { val: "transferred", label: "Transferred", dotBg: "bg-primary-fixed-dim" },
                ].map((s) => (
                  <button
                    key={s.val}
                    type="button"
                    onClick={() => setMembershipStatus(s.val)}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all shadow-sm ${
                      membershipStatus === s.val
                        ? "bg-primary-container text-on-primary"
                        : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${s.dotBg}`} />
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Membership & Baptism Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-on-surface">Membership Date</label>
                <input
                  type="date"
                  value={membershipDate}
                  onChange={(e) => setMembershipDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-on-surface text-sm focus:outline-none shadow-sm"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-on-surface">Baptism Date</label>
                <input
                  type="date"
                  value={baptismDate}
                  onChange={(e) => setBaptismDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-on-surface text-sm focus:outline-none shadow-sm"
                />
              </div>
            </div>

            {/* Baptized Checkbox */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={baptizedAtCentral}
                onChange={(e) => setBaptizedAtCentral(e.target.checked)}
                className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary cursor-pointer"
              />
              <span className="text-xs font-medium text-on-surface">Baptized at TLPCI Central</span>
            </label>
          </div>

          {/* CARD 4: Family Connection */}
          <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-fixed-dim flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[20px]">diversity_1</span>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-on-surface">Family Connection</h2>
                <p className="text-xs text-on-surface-variant">Attach to an existing household or form a new unit</p>
              </div>
            </div>

            {/* Family Selection Toggle */}
            <div className="flex flex-col gap-3">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">
                  search
                </span>
                <input
                  type="text"
                  value={familySearch}
                  onChange={(e) => setFamilySearch(e.target.value)}
                  placeholder="Search by family surname..."
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-surface-container-low text-on-surface text-sm placeholder:text-outline focus:outline-none shadow-sm"
                />
              </div>

              {/* Existing Linked Family Preview Chip */}
              {hasFamilyChip && (
                <div className="p-3 rounded-xl bg-surface-container-low flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary-container text-on-primary flex items-center justify-center font-bold text-xs">
                      ST
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-on-surface">{familySearch || "Sterling Family"}</span>
                        <span className="px-2 py-0.5 rounded-full bg-surface-container-highest text-on-surface text-[11px] font-medium">
                          4 Members
                        </span>
                      </div>
                      <span className="text-xs text-outline">Household Head: Marcus Sterling</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setHasFamilyChip(false)}
                    className="p-1 rounded-lg text-outline hover:text-error hover:bg-surface-container transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </div>
              )}

              {/* Role in Family */}
              <div className="flex flex-col gap-1.5 pt-1">
                <label className="text-xs font-semibold text-on-surface">Role in Household</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  {[
                    { val: "head", label: "Head" },
                    { val: "spouse", label: "Spouse" },
                    { val: "child", label: "Child" },
                    { val: "dependent", label: "Dependent" },
                  ].map((r) => (
                    <button
                      key={r.val}
                      type="button"
                      onClick={() => setFamilyRole(r.val)}
                      className={`py-2 px-1 rounded-xl text-xs font-semibold transition-all ${
                        familyRole === r.val
                          ? "bg-primary-container text-on-primary shadow-sm"
                          : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* CARD 5: Groups & Ministries */}
          <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary-fixed-dim/30 flex items-center justify-center text-secondary">
                  <span className="material-symbols-outlined text-[20px]">groups_3</span>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-on-surface">Groups &amp; Ministries</h2>
                  <p className="text-xs text-on-surface-variant">Assign volunteer rotations &amp; small groups</p>
                </div>
              </div>
              <span className="text-[11px] text-outline font-medium">Select all active</span>
            </div>

            {/* Multi-Select Ministry Tags */}
            <div className="flex flex-wrap gap-2">
              {allMinistries.map((m) => {
                const isSelected = activeMinistries.includes(m);
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => toggleMinistry(m)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
                      isSelected
                        ? "bg-primary-container text-on-primary"
                        : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {isSelected ? "check" : "add"}
                    </span>
                    <span>{m}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* CARD 6: Notes & Custom Attributes */}
          <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface">
                <span className="material-symbols-outlined text-[20px]">edit_note</span>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-on-surface">Notes &amp; Pastoral Insights</h2>
                <p className="text-xs text-on-surface-variant">Confidential spiritual background or visit logs</p>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Confidential background, spiritual milestones, pastoral visit notes, or special care requirements..."
                rows={4}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-on-surface text-sm placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/20 shadow-sm resize-none"
              />
              <div className="flex items-center justify-between text-outline text-[11px] px-1 font-medium">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] text-tertiary">lock</span>
                  Visible only to Pastors &amp; Super Admins
                </span>
                <span>Max 1,000 characters</span>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* ── Sticky Bottom Confirmation Bar ── */}
      <aside className="fixed bottom-0 left-0 lg:left-[260px] right-0 z-40 bg-surface-container-lowest/95 backdrop-blur-md px-6 sm:px-8 py-3.5 shadow-lg border-t border-surface-container">
        <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-on-surface-variant text-xs">
            <span className="material-symbols-outlined text-tertiary text-[18px]">cloud_done</span>
            <span>Unsaved changes are automatically cached in local draft</span>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              onClick={() => router.back()}
              className="px-5 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-sm font-semibold transition-all shadow-sm"
              type="button"
            >
              Cancel
            </button>
            <button
              form="add-person-form"
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary text-sm font-semibold flex items-center justify-center gap-2 shadow-md transition-all disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[20px]">person_add</span>
              <span>{saving ? "Saving..." : "Save Person & Create Profile"}</span>
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
