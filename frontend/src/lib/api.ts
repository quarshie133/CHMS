/**
 * ChurchMS API client — wraps fetch with auth token management.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export interface ApiError {
  status: number;
  detail: string;
  fieldErrors?: Record<string, string[] | string>;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string
): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) ?? {}),
  };

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    let detail = body?.detail;
    if (!detail && typeof body === "object" && body !== null) {
      const messages = Object.entries(body)
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
        .join("; ");
      if (messages) detail = messages;
    }
    throw {
      status: res.status,
      detail: detail || res.statusText || "Request failed",
      fieldErrors: typeof body === "object" ? body : undefined,
    } as ApiError;
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// ─── Auth ──────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    request<{ access: string; refresh: string }>("/auth/token/", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  refresh: (refresh: string) =>
    request<{ access: string }>("/auth/token/refresh/", {
      method: "POST",
      body: JSON.stringify({ refresh }),
    }),
  me: (token: string) =>
    request<User>("/auth/me/", {}, token),
  updateProfile: (token: string, data: Partial<User>) =>
    request<User>("/auth/me/", { method: "PATCH", body: JSON.stringify(data) }, token),
  changePassword: (token: string, data: { old_password: string; new_password: string }) =>
    request("/auth/change-password/", { method: "POST", body: JSON.stringify(data) }, token),
};

// ─── Types ──────────────────────────────────────────────────────────────────
export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: string;
  phone: string;
  avatar: string | null;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface Member {
  id: string;
  full_name: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_mobile: string;
  status: string;
  life_stage: string;
  photo: string | null;
  age: number | null;
  family_name: string | null;
  membership_date: string | null;
  created_at: string;
}

export interface Contribution {
  id: string;
  member: string | null;
  member_name: string | null;
  fund: string;
  fund_name: string;
  contribution_type: string;
  amount: string;
  currency: string;
  payment_method: string;
  date: string;
  notes: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  category: string | null;
  category_name: string | null;
  location: string;
  start_datetime: string;
  end_datetime: string;
  is_all_day: boolean;
  requires_rsvp: boolean;
  rsvp_count: number;
  cover_image: string | null;
}

export interface Sermon {
  id: string;
  title: string;
  speaker: string;
  scripture_reference: string;
  date: string;
  series_title: string | null;
  thumbnail: string | null;
  video_url: string;
  audio_url: string;
  is_published: boolean;
  views_count: number;
  tags: string[];
}

export interface Group {
  id: string;
  name: string;
  category_name: string | null;
  leader_name: string | null;
  member_count: number;
  is_active: boolean;
  is_open: boolean;
  cover_image: string | null;
  description: string;
}

// ─── Resource factories ──────────────────────────────────────────────────────
function resource<T>(base: string) {
  return {
    list: (token: string, params = "") =>
      request<PaginatedResponse<T>>(`${base}?${params}`, {}, token),
    get: (token: string, id: string) =>
      request<T>(`${base}${id}/`, {}, token),
    create: (token: string, data: Partial<T>) =>
      request<T>(base, { method: "POST", body: JSON.stringify(data) }, token),
    update: (token: string, id: string, data: Partial<T>) =>
      request<T>(`${base}${id}/`, { method: "PATCH", body: JSON.stringify(data) }, token),
    remove: (token: string, id: string) =>
      request<void>(`${base}${id}/`, { method: "DELETE" }, token),
  };
}

export interface Fund {
  id: string;
  name: string;
  description: string;
  goal_amount: string | null;
  total_received?: string;
  is_active: boolean;
}

export const membersApi = resource<Member>("/members/");
export const eventsApi = resource<Event>("/events/");
export const sermonsApi = resource<Sermon>("/sermons/");
export const groupsApi = resource<Group>("/groups/");
export const fundsApi = resource<Fund>("/finance/funds/");
export const contributionsApi = resource<Contribution>("/finance/contributions/");

export const financeApi = {
  ...resource<Contribution>("/finance/contributions/"),
  summary: (token: string) =>
    request<{
      this_month: string;
      this_year: string;
      all_time: string;
      by_type: Array<{ contribution_type: string; total: string; count: number }>;
    }>("/finance/contributions/summary/", {}, token),
};

export interface ServiceRecord {
  id: string;
  date: string;
  actual_count: number;
  service_type?: string;
  service_type__name?: string;
  notes?: string;
}

export const attendanceApi = {
  ...resource<ServiceRecord>("/attendance/"),
  trends: (token: string) =>
    request<Array<{ date: string; count: number; service_type__name: string }>>(
      "/attendance/trends/", {}, token
    ),
};

export const memberStatsApi = (token: string) =>
  request<{
    total: number;
    active: number;
    visitors: number;
    inactive: number;
    by_life_stage: Array<{ life_stage: string; count: number }>;
    by_gender: Array<{ gender: string; count: number }>;
  }>("/members/stats/", {}, token);

export interface Campaign {
  id: string;
  name: string;
  channel: string;
  status: string;
  recipient_count: number;
  sent_count: number;
  subject?: string;
  body_text?: string;
  scheduled_at?: string;
  created_at: string;
}

export const communicationsApi = {
  ...resource<Campaign>("/communications/campaigns/"),
};
