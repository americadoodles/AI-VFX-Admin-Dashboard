# AI VFX Admin Dashboard

A comprehensive staff-facing administration dashboard for the AI VFX Storyboard Platform. Built with **Next.js** (frontend) and **FastAPI** (backend).

## Architecture

```
AI-VFX-Admin-Dashboard/
├── frontend/          # Next.js 16 + TypeScript + Tailwind CSS v4
│   └── src/
│       ├── app/       # App Router pages
│       │   ├── admin/ # All admin pages (protected)
│       │   └── login/ # Staff authentication
│       ├── components/
│       │   ├── ui/    # Shared UI component library
│       │   └── users/ # User-specific components
│       └── lib/       # API client, types, auth context
├── backend/           # FastAPI + SQLAlchemy + SQLite
│   ├── app/
│   │   ├── models/    # SQLAlchemy database models
│   │   ├── schemas/   # Pydantic request/response schemas
│   │   ├── routes/    # API route handlers
│   │   ├── middleware/ # Auth, RBAC middleware
│   │   └── services/  # Business logic (audit logging)
│   └── main.py        # Application entry point
└── README.md
```

## Features

### Dashboard Home
- KPI cards: DAU, generations, failure rate, tokens consumed
- 30-day usage trend charts
- Recent incidents & error list
- Job queue health monitoring

### User Management
- Searchable, filterable, paginated user list
- User detail pages with tabbed views (Overview, Tokens, Activity, Security)
- Account actions: suspend/unsuspend, MFA reset, session revocation
- User impersonation for support troubleshooting
- Data export and deletion workflows

### Token & Billing
- Token economy dashboard with KPIs and trend charts
- Full transaction ledger with search and filters
- Manual token grants with step-up authentication
- Purchase history tracking

### Activity & Logs
- Product event explorer with full-text search
- Immutable audit log viewer with before/after JSON diffs
- Generation job list and detailed debug views
- Error dashboard with frequency analysis

### Content & Storage
- Media asset browser with moderation flagging
- Storage usage analytics by user and project

### System & Operations
- AI model configuration (pricing, limits, enable/disable)
- Feature flag management with rollout percentages
- Incident banner and maintenance mode controls
- Generation job retry and cancellation

### Roles & Access
- Staff account management (create, edit, deactivate)
- RBAC with 6 roles: Viewer, Support, Ops, Billing, Admin, Owner
- API key lifecycle management (create, rotate, revoke)

## Tech Stack

### Frontend
- **Next.js 16** with App Router
- **TypeScript** for type safety
- **Tailwind CSS v4** with custom dark theme
- **Radix UI** primitives (Dialog, Tabs, Select, etc.)
- **Recharts** for data visualization
- **Lucide React** for icons

### Backend
- **FastAPI** with async support
- **SQLAlchemy 2.0** ORM with SQLite (dev) / PostgreSQL (prod)
- **Pydantic v2** for data validation
- **python-jose** for JWT authentication
- **passlib** with bcrypt for password hashing

## Getting Started

### Prerequisites
- **Node.js** 18+ and npm
- **Python** 3.11+
- **pip** (Python package manager)

### Backend Setup

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Start the server (auto-creates database and seeds sample data)
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The backend will:
- Create an SQLite database (`admin.db`) automatically
- Seed the database with sample data on first run:
  - 6 RBAC roles
  - 1 admin staff account
  - 50 sample users
  - 200+ token transactions
  - 100+ generation jobs
  - 50+ event logs
  - 30+ media assets
  - 5 AI model configurations
  - 5 feature flags

**Default admin credentials:**
- Email: `admin@admin.com`
- Password: `admin123`

**API Documentation:** http://localhost:8000/docs (Swagger UI)

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open http://localhost:3000 in your browser. You'll be redirected to the login page.

### Environment Variables

#### Backend (`backend/.env`)
```env
DATABASE_URL=sqlite:///./admin.db
SECRET_KEY=your-secret-key-change-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

#### Frontend
The API base URL is configured in `frontend/src/lib/api.ts` (default: `http://localhost:8000`).

## API Endpoints

All admin endpoints are prefixed with `/admin` and require JWT authentication.

| Domain | Endpoints |
|--------|-----------|
| Auth | `POST /admin/auth/login`, `POST /admin/auth/logout`, `GET /admin/auth/me` |
| Dashboard | `GET /admin/dashboard/kpis`, `/trends`, `/incidents`, `/queue-health` |
| Users | `GET /admin/users`, `GET /admin/users/:id`, `POST .../suspend`, `.../unsuspend`, `.../reset-mfa`, `.../revoke-sessions`, `.../impersonate` |
| Tokens | `GET /admin/tokens/dashboard`, `/ledger`, `GET/POST /admin/users/:id/tokens` |
| Activity | `GET /admin/events`, `/audit-logs`, `/generation-jobs`, `/generation-jobs/:id`, `/errors/dashboard` |
| Content | `GET /admin/assets`, `/storage/usage`, `POST /admin/assets/:id/flag` |
| System | `GET/PUT /admin/models`, `/feature-flags`, `PUT /admin/system/incident-banner`, `/maintenance-mode` |
| Roles | `GET/POST /admin/staff`, `PUT/DELETE /admin/staff/:id`, `GET/POST/DELETE /admin/api-keys` |

## RBAC Matrix

| Action | Viewer | Support | Ops | Billing | Admin | Owner |
|--------|--------|---------|-----|---------|-------|-------|
| View dashboards & logs | Yes | Yes | Yes | Yes | Yes | Yes |
| Suspend/unsuspend users | - | Yes | - | - | Yes | Yes |
| Reset MFA / Revoke sessions | - | Yes | - | - | Yes | Yes |
| Impersonate users | - | Yes | - | - | Yes | Yes |
| Grant/adjust tokens | - | - | - | Yes | Yes | Yes |
| Configure models | - | - | Yes | - | Yes | Yes |
| Manage feature flags | - | - | Yes | - | Yes | Yes |
| Manage staff accounts | - | - | - | - | Yes | Yes |
| Delete user data | - | - | - | - | - | Yes |

## Development

### Reset Database
Delete `backend/admin.db` and restart the server. The seed script will recreate all sample data.

### Frontend Build
```bash
cd frontend
npm run build
npm start
```

## License

Proprietary - All rights reserved.
