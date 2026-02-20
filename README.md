# AI VFX Admin Dashboard

A comprehensive staff-facing administration dashboard for the AI VFX Storyboard Platform. Built with **Next.js** (frontend) and **FastAPI** (backend), connected to a **shared PostgreSQL database** on Google Cloud SQL.

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
├── backend/           # FastAPI + SQLAlchemy + PostgreSQL (Google Cloud SQL)
│   ├── app/
│   │   ├── models/    # SQLAlchemy models (shared + admin tables)
│   │   ├── schemas/   # Pydantic request/response schemas
│   │   ├── routes/    # API route handlers
│   │   ├── middleware/ # Auth, RBAC middleware
│   │   └── services/  # Business logic (audit logging)
│   ├── db/            # SQL schema & migration files
│   │   ├── schema.sql                  # Base schema (users, oauth_accounts)
│   │   ├── schema_image_generation.sql # Image generation tables
│   │   ├── migrations/                 # Incremental migrations (001–009)
│   │   ├── DATABASE_DESIGN.md
│   │   └── SCHEMA_SUMMARY.md
│   └── main.py        # Application entry point
└── README.md
```

## Database Architecture

The admin dashboard connects to a **shared PostgreSQL database** hosted on Google Cloud SQL. The database contains two categories of tables:

### Shared Tables (owned by video-gen backend)
These tables are populated by real user activity from the video generation app:
- `users` — User accounts (email/password + OAuth)
- `oauth_accounts` — Linked OAuth providers
- `sessions` — Generation workspace sessions
- `projects` — User projects with pre-production data
- `generation_jobs` — Image generation requests & metadata
- `generated_images` — Output images from generations
- `reference_images` — User-uploaded reference images
- `project_characters`, `project_environments`, `project_references`, `project_shots` — Pre-production data

### Admin Tables (owned by this dashboard)
These tables are created and managed by the admin dashboard:
- `staff_accounts`, `roles`, `staff_roles` — Staff authentication & RBAC
- `admin_user_overrides` — Admin-specific user status (suspension, plan, notes)
- `token_wallets`, `token_transactions` — Token economy management
- `audit_logs`, `event_logs` — Admin action tracking
- `model_configs`, `feature_flags` — System configuration
- `api_keys` — API key management

## Features

### Dashboard Home
- KPI cards: DAU, generations, failure rate, tokens consumed
- 30-day usage trend charts
- Recent incidents & error list
- Job queue health monitoring

### User Management
- Searchable, filterable, paginated user list (from real production data)
- User detail pages with project counts, generation stats
- Account actions: suspend/unsuspend (via admin overlay)
- User impersonation for support troubleshooting
- Data export workflows

### Token & Billing
- Token economy dashboard with KPIs and trend charts
- Full transaction ledger with search and filters
- Manual token grants with step-up authentication

### Activity & Logs
- Product event explorer with full-text search
- Immutable audit log viewer with before/after JSON diffs
- Generation job list with detailed views (settings, prompts, images)
- Error dashboard with frequency analysis by model

### Content & Storage
- Unified image browser (reference + generated images from GCP)
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
- **SQLAlchemy 2.0** ORM with **PostgreSQL** (Google Cloud SQL)
- **psycopg2** PostgreSQL adapter
- **Pydantic v2** for data validation
- **python-jose** for JWT authentication
- **passlib** with bcrypt for password hashing

## Getting Started

### Prerequisites
- **Node.js** 18+ and npm
- **Python** 3.11+
- **pip** (Python package manager)
- **PostgreSQL** database (Google Cloud SQL or local)

### Database Setup

The shared database tables must be created first using the SQL schema files:

```bash
# 1. Run the base schema
psql -h <CLOUD_SQL_IP> -U postgres -d ai_vfx -f backend/db/schema.sql

# 2. Run the image generation schema
psql -h <CLOUD_SQL_IP> -U postgres -d ai_vfx -f backend/db/schema_image_generation.sql

# 3. Run migrations in order
for f in backend/db/migrations/*.sql; do
  psql -h <CLOUD_SQL_IP> -U postgres -d ai_vfx -f "$f"
done
```

> **Note:** Admin-specific tables (staff_accounts, roles, etc.) are created automatically when the backend starts.

### Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment (copy and edit)
cp .env.example .env
# Edit .env with your PostgreSQL connection string

# Start the server
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The backend will:
- Create admin-only tables in the PostgreSQL database
- Seed admin tables on first run:
  - 6 RBAC roles
  - 1 admin staff account
  - 5 AI model configurations
  - 5 feature flags
  - 2 API keys

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
# PostgreSQL connection (Google Cloud SQL)
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/ai_vfx

# JWT signing secret
SECRET_KEY=your-secret-key-change-in-production

# Token expiration
ACCESS_TOKEN_EXPIRE_MINUTES=60

# Connection pool
DB_POOL_SIZE=5
DB_MAX_OVERFLOW=10
DB_POOL_TIMEOUT=30

# Cloud SQL Auth Proxy (optional)
CLOUD_SQL_CONNECTION_NAME=project:region:instance
```

#### Frontend
The API base URL is configured in `frontend/src/lib/api.ts` (default: `http://localhost:8000`).

### Google Cloud SQL Auth Proxy (Recommended for local dev)

```bash
# Start the Cloud SQL Auth Proxy
cloud-sql-proxy PROJECT_ID:REGION:INSTANCE_NAME --port=5432

# Then use localhost in DATABASE_URL
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/ai_vfx
```

## API Endpoints

All admin endpoints are prefixed with `/admin` and require JWT authentication.

| Domain | Endpoints |
|--------|-----------|
| Auth | `POST /admin/auth/login`, `POST /admin/auth/logout`, `GET /admin/auth/me` |
| Dashboard | `GET /admin/dashboard/kpis`, `/trends`, `/incidents`, `/queue-health` |
| Users | `GET /admin/users`, `GET /admin/users/:id`, `POST .../suspend`, `.../unsuspend`, `.../impersonate` |
| Tokens | `GET /admin/tokens/dashboard`, `/ledger`, `GET/POST /admin/users/:id/tokens` |
| Activity | `GET /admin/events`, `/audit-logs`, `/generation-jobs`, `/generation-jobs/:id`, `/errors/dashboard` |
| Content | `GET /admin/assets`, `/storage/usage` |
| System | `GET/PUT /admin/models`, `/feature-flags`, `PUT /admin/system/incident-banner`, `/maintenance-mode` |
| Roles | `GET/POST /admin/staff`, `PUT/DELETE /admin/staff/:id`, `GET/POST/DELETE /admin/api-keys` |

## RBAC Matrix

| Action | Viewer | Support | Ops | Billing | Admin | Owner |
|--------|--------|---------|-----|---------|-------|-------|
| View dashboards & logs | Yes | Yes | Yes | Yes | Yes | Yes |
| Suspend/unsuspend users | - | Yes | - | - | Yes | Yes |
| Impersonate users | - | Yes | - | - | Yes | Yes |
| Grant/adjust tokens | - | - | - | Yes | Yes | Yes |
| Configure models | - | - | Yes | - | Yes | Yes |
| Manage feature flags | - | - | Yes | - | Yes | Yes |
| Manage staff accounts | - | - | - | - | Yes | Yes |

## Development

### Local PostgreSQL (Alternative to Cloud SQL)
```bash
# Create a local database for development
createdb ai_vfx
psql -d ai_vfx -f backend/db/schema.sql
psql -d ai_vfx -f backend/db/schema_image_generation.sql
for f in backend/db/migrations/*.sql; do psql -d ai_vfx -f "$f"; done
```

### Frontend Build
```bash
cd frontend
npm run build
npm start
```

## License

Proprietary - All rights reserved.
