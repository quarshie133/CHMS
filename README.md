# ⛪ ChurchMS — Church Management System

A production-grade, multi-tenant Church Management System built with:

- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS
- **Backend**: Django 5 + Django REST Framework
- **Database**: PostgreSQL (schema-per-tenant multi-tenancy via `django-tenants`)
- **Background Jobs**: Redis + Celery + Celery Beat
- **Storage**: S3-compatible (AWS S3 / MinIO)
- **Auth**: JWT (simplejwt) with RBAC

## Architecture

```
CHMS/
├── backend/           # Django + DRF API
│   ├── config/        # Django settings, URLs, WSGI/ASGI
│   ├── apps/
│   │   ├── tenants/   # Multi-tenant (church) management
│   │   ├── accounts/  # Users, roles, auth
│   │   ├── members/   # Members & families
│   │   ├── attendance/# Attendance tracking
│   │   ├── finance/   # Tithes, offerings, pledges
│   │   ├── events/    # Events & calendar
│   │   ├── groups/    # Groups & ministries
│   │   ├── sermons/   # Sermons & media
│   │   └── communications/ # SMS/Email
│   ├── celery_app/    # Celery config & tasks
│   └── requirements/  # Pinned dependencies
├── frontend/          # Next.js 14 + TypeScript
│   ├── src/
│   │   ├── app/       # App router pages
│   │   ├── components/# Reusable UI components
│   │   ├── lib/       # API clients, hooks, utilities
│   │   ├── store/     # Zustand state management
│   │   └── types/     # TypeScript definitions
└── docker/            # Docker Compose + Dockerfile
```

## Quick Start

### Using Docker Compose (recommended)
```bash
docker-compose up --build
```

## Modules

| Module | Description |
|--------|-------------|
| **Members** | Full member profiles, family units, lifecycle tracking |
| **Attendance** | Service attendance, visitor tracking, trends |
| **Finance** | Tithes, offerings, pledges, giving statements |
| **Events** | Calendar, RSVPs, recurring events |
| **Groups** | Life groups, ministries, leadership |
| **Sermons** | Media library, series, video/audio upload to S3 |
| **Communications** | Bulk SMS, email campaigns, templates |

## RBAC Roles

- `super_admin` — Platform administrator
- `church_admin` — Church owner/admin
- `pastor` — Full access to all church data
- `staff` — Operational access
- `volunteer` — Limited access
- `member` — Self-service portal only
