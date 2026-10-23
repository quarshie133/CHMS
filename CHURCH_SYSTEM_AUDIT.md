# TLPCI Church Management System — Production Readiness Audit

**Audit date:** 2026-10-21  
**Commit audited:** `34f45ed` ("refactored"), working tree clean  
**Scope:** Next.js frontend, Django/DRF backend, data model, auth & roles, CRUD, events, SMS/email, reports, file storage, background jobs, Docker, deployment configuration, tests.  
**Target stack:** Django · Neon PostgreSQL · AWS · Docker · S3 · Celery + scheduler · Arkesel SMS · CloudWatch · GitHub Actions.

> **Bottom line:** The application is **not ready for production**. The UI and core record-keeping (people, events, giving) work against the real API. Several issues must be fixed before real member data goes live:
>
> - a **privilege-escalation vulnerability** that lets any logged-in user make themselves Super Admin
> - an **unauthenticated church-registration endpoint that creates Django superusers**
> - a **database connection setting that causes random 500 errors and duplicate records**
>
> SMS sending is **broken** (and not yet Arkesel). Event reminders and reports are **missing**. There are **no automated tests, no CI/CD, no logging or monitoring, and no production Docker setup**.

---

## 1. How this audit was performed

Everything below is based on evidence gathered in this session or the immediately preceding UI-refinement session. No code was modified during the audit.

| Method | What was run | Writes? |
|---|---|---|
| Code inspection | All Django apps, settings, URLs, serializers, permissions, Celery tasks, Dockerfiles, compose file, requirements, frontend pages and API client | No |
| Django checks | `manage.py check`, `check --deploy`, `makemigrations --check --dry-run` | No |
| Introspection | Serializer field writability, settings values, permission classes (Python shell, unsaved objects only) | No |
| Schema inspection | `information_schema` queries and migration recorder on `public` and `cathedral` schemas | No (read-only SQL) |
| API smoke tests | `curl` against the running dev backend: auth, throttling, password reset, docs/admin exposure, CORS | No data changes (one password-reset request; it crashed before sending any email) |
| Frontend checks | `tsc --noEmit`, `eslint`, `next build` at this commit | No |
| Browser E2E (previous session) | Playwright/Chrome against the dev servers at 1440/1280/768/390 px; create→edit→delete flows | Test records only; all removed afterwards |

**Not run / not verifiable here:** real SMS or email sending (would message real people), Celery worker execution, S3 uploads, AWS deployment, CloudWatch, Neon backups/PITR, GitHub Actions. Each is marked **Unverified** or **Blocked** below.

### Status legend

| Status | Meaning |
|---|---|
| ✅ **Complete & verified** | Exercised end-to-end through the real UI/API with evidence |
| 🟦 **Implemented, unverified** | Code exists and looks correct, but the workflow was not exercised |
| 🟨 **Partially complete** | Some parts work; meaningful parts are missing |
| ⬜ **Missing** | No implementation |
| 🟥 **Broken** | Implemented but fails, or is unsafe as built |
| ⛔ **Blocked** | Cannot be completed/verified until another issue or external dependency is resolved |

---

## 2. Feature status

### 2.1 Authentication, accounts and roles

| Feature | Status | Evidence |
|---|---|---|
| Login (JWT access/refresh) | ✅ | `POST /auth/token/` → 200 for valid, 401 for invalid credentials (curl). Browser login verified. |
| Token refresh & session expiry | 🟦 | `frontend/src/lib/api.ts` retries once after refresh on 401. Not exercised past token expiry. |
| Logout | 🟨 | Frontend clears tokens but never calls `/auth/token/blacklist/`, so a stolen refresh token stays valid for 7 days. |
| Own profile edit | 🟥 | **Privilege escalation**, see §4 finding S1. |
| Change password | 🟦 | `ChangePasswordView` + UI modal present. Not exercised. |
| Password reset | 🟥 | `POST /auth/password-reset/` returns **500 for a registered email** and **200 for an unknown email** (curl). Cause: `settings.FRONTEND_URL` is never defined (`config/settings.py`), though it is set in `.env`. The status difference also lets attackers enumerate accounts. There is no `/reset-password` page in the frontend. |
| User/role management (Roles & Access page) | 🟦 | `/auth/users/` list loads in the UI. Create, edit and deactivate were not exercised. `church_admin` can create `super_admin` accounts (no role hierarchy). |
| Role-based access control | 🟨 | All church data uses `IsStaffOrAbove`; pastoral notes use `IsPastorOrAbove`; user admin uses `IsAdminOrAbove` (`apps/accounts/permissions.py`). `volunteer` and `member` roles can access nothing. Every staff member sees all finance data. |
| Login brute-force protection | ⬜ | 10 rapid failed logins all returned 401, never 429. No `DEFAULT_THROTTLE_CLASSES`. |
| Member self-service portal | ⬜ | Described in `README.md`; does not exist. |

### 2.2 Multi-tenancy (django-tenants)

| Feature | Status | Evidence |
|---|---|---|
| Schema-per-church isolation of church data | 🟦 | Tenant apps live in the `cathedral` schema (`information_schema`). Migrations are fully applied on `public` and `cathedral` (69 each, none pending). |
| User accounts per church | 🟥 | `apps.accounts` is only in `SHARED_APPS`, so the single `accounts_user` table is in `public` (verified). Users are **global**: a JWT from one church works on every church's domain, and roles are not per church. |
| Church registration | 🟥 | `POST /api/v1/tenants/register/` is `AllowAny` and unthrottled, and creates the admin via `create_superuser` (`is_superuser=True`, `is_staff=True`), i.e. full Django-admin superuser. Code-confirmed. Not reachable under the current local domain setup (404); reachable once a public domain is configured. |
| Church settings (`/tenants/me/`) | 🟥 | `ChurchDetailView` allows GET/PUT/PATCH to **any authenticated user** (`IsAuthenticated`). No UI. |
| Public-schema URLconf | 🟥 | `config/urls_public.py` mounts every tenant API (members, finance, …) on the public schema, where those tables don't exist. |
| Church currency/timezone | 🟨 | `Church.currency` defaults to `USD`, `timezone` to `America/New_York`, `PHONENUMBER_DEFAULT_REGION = "US"`. The UI assumes USD. There is no way to change these from the app. |

### 2.3 Church modules

| Module / workflow | Status | Evidence |
|---|---|---|
| Dashboard | ✅ | Renders real metrics, events, attendance trend, recent people and birthdays (browser, 4 viewports). |
| People: list, search, filter, paginate | ✅ | Browser E2E: search, status filter, pagination. |
| People: create / edit / delete | ✅ | Browser E2E: validation, quick add, edit, delete-with-confirm all passed. |
| People: full profile form | 🟦 | `members/new` saves all backend fields. Not run end-to-end. |
| Families / households | 🟨 | API complete. UI can only create inline and select. No family list, edit or delete screen. |
| Pastoral notes | 🟦 | `GET/POST /members/{id}/notes/` with pastor+ gate, and UI tab. Not exercised. No edit or delete. |
| Member photos | ⬜ | `Member.photo` ImageField exists; no upload flow (the API client is JSON-only). |
| Groups: CRUD | ⛔ | UI built. E2E create failed with backend 500s (Neon pooler, §4 S3). |
| Groups: roster (add/remove members) | ⛔ | Same blocker. Re-adding a removed member fails on `unique_together` (removal is a soft delete). |
| Attendance: services, check-in, trends | 🟦 | UI and API built. Pages render; check-in not exercised. Only per-person check-in is supported (no bulk headcount). |
| Events: CRUD | ✅ | Browser E2E: end-before-start validation, create, delete. |
| Events: RSVPs | 🟨 | RSVP list is shown read-only in the event drawer; no UI to add or manage RSVPs. |
| Events: recurrence | ⬜ | `Event.recurrence` field exists but nothing expands occurrences. Not exposed in the UI (deliberately). |
| **Event reminders** | ⬜ | No model fields, tasks, schedules or templates anywhere (`grep reminder` → none). |
| Sermons: CRUD, series | 🟦 | UI and API built; empty state verified. Create/edit not exercised. |
| Sermon media upload | ⬜ | Model has `video_file`, `audio_file`, `notes_file`, `thumbnail`; UI supports URL links only. |
| Finance: contributions | 🟦 | Ledger, filters, KPIs and monthly trend render real data. Record/edit/delete not exercised. |
| Finance: funds | ⛔ | E2E create failed with backend 500s (S3 below); a duplicate fund was created and later cleaned up. |
| Finance: pledges | 🟦 | UI and API built; not exercised. `paid_amount` is entered by hand, not linked to contributions. |
| Giving statements | ⬜ | `generate_giving_statements` task in `apps/communications/tasks.py` only logs totals (`# TODO: Render PDF and email`). Not scheduled. |
| **Reports / exports** | ⬜ | No CSV, PDF or Excel export anywhere. The only reporting is `members/stats`, `finance/.../summary`, `monthly_trend` and `attendance/trends`. |
| In-app notifications | ⬜ | None (the old header bell was a decoration and was removed). |
| Message templates | 🟨 | `/communications/templates/` API exists; no UI. |

### 2.4 SMS and email broadcasts

| Item | Status | Evidence |
|---|---|---|
| Compose, audience, recipient count, segment counter, save draft | ✅ | Browser E2E: draft saved and deleted; counter verified. |
| Send broadcast (Celery task) | 🟥 | `send_campaign` (`apps/communications/tasks.py`) is **not tenant-aware**. A Celery worker runs on the `public` schema, and querying `Campaign` there raises `ProgrammingError: relation "communications_campaign" does not exist` (reproduced). Every send would fail and retry 3 times. Not run end-to-end (no real sends). |
| SMS provider | ⬜ | Only **Twilio** is implemented (`_send_sms`). **No Arkesel integration.** |
| Delivery truthfulness | 🟥 | If Twilio isn't configured, `_send_sms` logs a warning and **returns success**, so recipients are recorded as `sent`. |
| Delivery status / callbacks | ⬜ | No provider status webhook; "sent" means only "handed to provider". |
| Phone number format | 🟥 | `phone_mobile` is free text (seed data like `(555) 234-8901`); no E.164 normalization. Region default is `US`. Arkesel needs Ghana `233…` numbers. |
| Audience filter safety | 🟨 | `recipients_filter` is client-supplied JSON passed to `Member.objects.filter(**filters)`. A malformed key crashes the task; arbitrary relation lookups are allowed. Needs a server-side allow-list. |
| Broker failure handling | 🟥 | The `send` action sets status `scheduled` **before** `.delay()`. If Redis is unavailable the request 500s and the campaign stays stuck as "Queued". |
| Email campaigns | 🟥 | Same tenant bug. `EMAIL_BACKEND` defaults to console; no production email provider is configured (`sendgrid` is installed but unused). |

### 2.5 Frontend

| Item | Status | Evidence |
|---|---|---|
| Type-check / lint / build | ✅ | `tsc` 0 errors, `eslint` 0 problems, `next build` succeeds (16 routes) at this commit. |
| Responsive layout | ✅ | No horizontal overflow on any page at 1440/1280/768/390 px (previous session). |
| Error / empty / loading states | ✅ | Backend 500s render as "Couldn't load this data · Try again"; no fake data anywhere. |
| Auth guard | ✅ | Signed-out users are redirected to `/login`. |
| Token storage | 🟨 | JWTs in `localStorage` (XSS-exposed). Acceptable short-term given React escaping; httpOnly cookies are preferable. |
| Demo login shortcuts | 🟨 | Hidden in production builds (`NODE_ENV`). The seeded demo accounts themselves still exist in the database with a shared known password. |

---

## 3. Production readiness

| Area | Status | Findings |
|---|---|---|
| **Settings & secrets** | 🟥 | `SECRET_KEY` falls back to `"change-me-in-production"` and `DEBUG` defaults to `True` (`config/settings.py:18-19`). `check --deploy`: W004 (HSTS), W008 (SSL redirect), W009 (weak key), W012/W016 (cookies not secure), W018 (DEBUG). No `SECURE_PROXY_SSL_HEADER` or `CSRF_TRUSTED_ORIGINS`. The real `.env` is correctly git-ignored. |
| **Database (Neon)** | 🟥 | `DATABASE_URL` uses Neon's **pooler** (PgBouncer, transaction mode). django-tenants sets a session `search_path`, so under concurrent requests queries hit `public`, giving intermittent 500s (`relation "members_member" does not exist`). It was reproduced with concurrent curl, ~1 in 10 requests. Writes can **succeed and still return 500**, which causes **duplicate records** on retry (observed). `CONN_MAX_AGE` is unset (0), so every request opens a new TLS connection (~4 s/request locally). |
| **Migrations** | ✅ | No model drift (`makemigrations --check`); all migrations applied on both schemas. Production deploy must run `migrate_schemas` (shared **and** tenant). Compose runs `--shared` only. |
| **Background jobs** | 🟥 | Celery app configured with Redis broker and a DB beat scheduler. Tasks are **not tenant-aware**, there are **no periodic tasks defined**, and Celery has never been exercised. Redis answers locally (`PONG`). |
| **File storage (S3)** | 🟨 | `django-storages` configured behind `USE_S3`, but via the legacy `DEFAULT_FILE_STORAGE` setting (deprecated; removed in Django 5.1). Uploads aren't namespaced per tenant. No upload UI. Untested. |
| **SMS gateway** | 🟥 | Twilio only; Arkesel missing (see §2.4). |
| **Email** | ⬜ | Console backend by default; no provider configured. Password reset and email campaigns depend on it. |
| **Docker** | 🟥 | Backend `Dockerfile`: no `CMD`, runs as root, and `COPY . /app/` with **no committed `.dockerignore`** (`.dockerignore` is itself in `.gitignore`). The image would include `venv/`, `pgdata/` and `.env` secrets. Frontend `Dockerfile` runs `npm run dev`. `docker-compose.yml` is dev-only: bind mounts, `.env.example` env file, MinIO default credentials, no tenant migrations. |
| **AWS deployment** | ⬜ | No infrastructure-as-code, task definitions, load balancer or health check endpoint. |
| **CI/CD** | ⬜ | No `.github/workflows/`. |
| **Automated tests** | ⬜ | **Zero tests** in backend or frontend (`pytest-django`, `factory-boy` and `coverage` are installed but unused). |
| **Logging** | ⬜ | No `LOGGING` config; nothing structured for CloudWatch. |
| **Monitoring / errors** | ⬜ | `sentry-sdk` installed but never initialised. No CloudWatch metrics or alarms, no `/health` endpoint. |
| **Backups** | ❔ Unverified | Neon provides point-in-time restore depending on plan; retention and restore were not verifiable. No documented backup or restore runbook. No S3 versioning config. |
| **API surface** | 🟨 | `/api/docs/` and `/api/schema/` are public (200), and so is `/admin/`. Fine for dev; restrict in production. |
| **Data hygiene** | 🟨 | The database currently holds seed or demo members and accounts (`seed_tlpci.py`). It must not be promoted to production as-is. |
| **Documentation** | 🟨 | `README.md` is out of date: says Next.js 14; references `celery_app/`, `store/`, `types/` and `docker/` folders that don't exist; claims features that are missing. |
| **Dependencies** | 🟨 | Dev/test packages (`Faker`, `pytest-django`, `coverage`) are in `base.txt`; `django-extensions`, `sendgrid`, `sentry-sdk` and `phonenumber_field` are unused. Django 5.0 is past end of support (April 2025); plan an upgrade to 5.2 LTS. |

---

## 4. Security and critical findings (detail)

### S1 — Any logged-in user can make themselves Super Admin (Critical)
- **Where:** `apps/accounts/views.py` `MeView` + `apps/accounts/serializers.py` `UserSerializer`.
- **Evidence:** `UserSerializer` writable fields are `email, first_name, last_name, role, phone, avatar, is_active`. Validating `{"role": "super_admin"}` against a `member` user passes (`is_valid() == True`).
- **Impact:** A volunteer or member account can `PATCH /api/v1/auth/me/` and gain full access to every record and to user management.
- **Fix:** A separate self-profile serializer with `role` and `is_active` read-only. Enforce a role hierarchy in `UserDetailView`/`UserListCreateView`, so admins can't grant roles above their own or modify their own role.

### S2 — Public registration creates Django superusers (Critical once a public domain exists)
- **Where:** `apps/tenants/views.py` `ChurchRegistrationView` (`AllowAny`, no throttle) → `User.objects.create_superuser(...)`.
- **Impact:** Anyone can create a church and receive an `is_superuser` account with Django-admin access to all data. Because users are global (S4), that account's JWT also works on TLPCI's domain as `church_admin`.
- **Fix:** Disable public registration for the TLPCI deployment, or protect it (invite or admin only), and create the church admin with `create_user` (not superuser).

### S3 — Neon pooler breaks schema isolation and corrupts writes (Critical)
- **Where:** `backend/.env` `DATABASE_URL` (pooler host) + `config/settings.py` database block.
- **Evidence:** Mixed concurrent requests intermittently return 500 with "relation … does not exist". A group and a fund were created even though the API returned 500, so retrying produced duplicates.
- **Fix:** Use Neon's **direct** (non-pooler) endpoint for the Django app; set `CONN_MAX_AGE` (e.g. 60) and `CONN_HEALTH_CHECKS = True`. Re-test with concurrent load.

### S4 — User accounts are shared across all churches (High)
- **Where:** `config/settings.py` `SHARED_APPS` vs `TENANT_APPS`; `apps/accounts/models.py` (no tenant link).
- **Impact:** No per-church user scoping; a role in one church applies everywhere.
- **Decision needed:** If this deployment is **TLPCI-only**, the simplest safe path is to disable tenant registration and treat the system as single-tenant. If multi-church SaaS is intended, add a user↔church membership model with per-church roles, and validate the tenant in authentication.

### S5 — Any user can edit church settings (High)
`ChurchDetailView` (`apps/tenants/views.py`) is `RetrieveUpdateAPIView` with `IsAuthenticated`. Restrict updates to admins and limit editable fields (not `is_active` or `subscription_plan`).

### S6 — Insecure production defaults (High)
`DEBUG=True` and a placeholder `SECRET_KEY` by default; no HTTPS/HSTS/secure-cookie settings; no throttling on login, password reset or registration; API docs and admin public.

### S7 — Password reset broken and leaks account existence (High)
500 for known emails vs 200 for unknown (curl). Define `FRONTEND_URL` in settings, return the same response either way, encode the uid (`urlsafe_base64_encode`), and build the `/reset-password` page.

### S8 — Broadcast audience filter is unvalidated (Medium)
`recipients_filter` → `Member.objects.filter(**filters)` with client JSON. Allow-list the supported audience keys server-side.

### S9 — Docker images would contain secrets (High for deployment)
No committed `.dockerignore`; `COPY . /app/` includes `.env`, `venv/` and `pgdata/`.

### S10 — Refresh tokens not revoked on logout (Low)
Call the existing blacklist endpoint on sign-out.

---

## 5. Production risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Account takeover / privilege escalation (S1, S2) | High once deployed | Full data exposure | Phase 1 fixes before any public URL |
| Intermittent failures & duplicate giving/member records (S3) | Certain with current URL | Data integrity, staff trust | Direct Neon endpoint + connection settings |
| Broadcasts silently fail or report false delivery | Certain today | Missed communication; misleading reports | Tenant-aware tasks, Arkesel, honest status |
| Data loss without tested restore | Unknown | Severe | Confirm Neon PITR window, document and rehearse a restore |
| Regressions with no test safety net | High | Broken releases | Test suite + CI gate |
| No visibility into production errors | High | Slow incident response | Logging, Sentry/CloudWatch, alarms, health check |
| Leaking secrets via Docker images | High if built as-is | Credential compromise | `.dockerignore`, multi-stage images, secrets from AWS Secrets Manager |
| Demo data/accounts in production DB | Medium | Confusion, known-password accounts | Fresh production database; remove seeds |

---

## 6. Recommended implementation order

1. **Lock down accounts:** fix S1 (self-escalation) and add role-hierarchy checks.
2. **Close the registration and tenant holes:** disable or protect registration and stop creating superusers (S2); restrict church settings (S5); remove tenant routes from `urls_public.py`; decide single-tenant vs multi-tenant (S4).
3. **Fix the database connection:** direct Neon endpoint, `CONN_MAX_AGE`, health checks (S3). Re-run the Groups and Funds E2E flows.
4. **Harden settings:** production `DEBUG`/`SECRET_KEY` handling, HTTPS/HSTS/cookies, throttling, `FRONTEND_URL`, password reset fix (S6, S7).
5. **Add a test suite foundation and a CI pipeline,** starting with regression tests for items 1–4.
6. Then Phase 2:
   - make Celery tasks tenant-aware;
   - implement Arkesel with honest status reporting;
   - phone normalisation;
   - event reminders;
   - reports and exports;
   - uploads to S3.
7. Then Phase 3: production Docker images, AWS deployment, logging and monitoring, backups.
8. Then Phase 4: UAT, load test, security review, launch.

The full prioritised checklist with effort, dependencies and acceptance criteria is in [`REMAINING_TASKS.md`](REMAINING_TASKS.md).

---

## 7. Open questions for the church / product owner

1. **Single church or multi-church?** If TLPCI is the only church, multi-tenancy can be simplified and registration removed. This changes the scope of tasks P1-2 and P1-4.
2. **Who may see finance data?** Currently every staff account. Should it be limited to a finance role?
3. **Arkesel account details:** sender ID approval, API key and whether delivery-report webhooks are enabled on your plan.
4. **Reminder rules:** which events get reminders, how far in advance, and through which channel (SMS and/or email)?
5. **Required reports:** for example monthly giving by fund, annual giving statements, attendance by service, membership growth.
6. **Currency and locale:** confirm GHS (₵), Africa/Accra timezone and Ghana phone formats.
