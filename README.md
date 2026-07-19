# 🌊 Anahata CRM

> Appointment & client management system for [Anahata Water Therapy Center](https://ana-hata.co.il) — built in Hebrew (RTL).

A full-stack CRM tailored for a boutique water therapy practice. It handles online booking for both treatment clients and pool-rental therapists, an admin approval workflow, client records, a shared calendar, and automated confirmation emails — all behind Supabase Row-Level Security.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 App Router (TypeScript) |
| Database & Auth | Supabase (Postgres + RLS + Storage) |
| Email | Resend |
| UI | Tailwind CSS v3 + shadcn/ui (Radix) |
| Deployment | Vercel |

---

## Features

- **Public booking pages** — `/book` for treatment appointments, `/rent` for therapist pool rentals
- **Admin approval workflow** — pending requests with SLA urgency indicators (green / yellow / red)
- **Shared calendar** — week view with color-coded appointment types
- **Client records** — searchable table with tags, notes, and appointment history
- **Signed booking links** — customers receive a JWT-secured link (`/b/[token]`) to manage or cancel their booking
- **Role-based access** — `admin` sees everything; `therapist` sees only their own masked calendar
- **Pool capacity logic** — configurable concurrent slots; treatments are always single-therapist

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [Resend](https://resend.com) account (optional in dev — emails are skipped if key is absent)

### Setup

```bash
git clone https://github.com/uriel-sofer/Ana-Hata.git
cd Ana-Hata
npm install
cp .env.example .env.local   # fill in your keys
npm run dev                  # http://localhost:3000
```

### Environment variables

See `.env.example` for all required keys. The minimum to boot locally:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
BOOKING_JWT_SECRET=          # any random string ≥ 32 chars
```

`RESEND_API_KEY` is optional — email sending is skipped gracefully when absent.

---

## Project Structure

```
src/
├── app/
│   ├── (admin)/          # Admin-only pages (calendar, approvals, clients, settings)
│   ├── (therapist)/      # Therapist pages — masked calendar
│   ├── (customer)/       # Public booking pages (/book, /rent)
│   ├── /b/[token]/       # Signed booking management link
│   └── /auth/            # Login, magic-link, callback
├── components/
├── lib/
│   ├── slots.ts          # Slot availability engine (Israel timezone-aware)
│   ├── booking-token.ts  # JWT signing/verification for booking links
│   └── resend/           # Email templates
└── types/
```

---

## Database

Migrations live in `supabase/migrations/`. To apply:

```bash
SUPABASE_ACCESS_TOKEN=<token> supabase db push
```

Row-Level Security is enforced at the database level for all data isolation. Never rely solely on application-level guards.

---

## User Roles

| Role | Access |
|------|--------|
| `admin` | Full CRM — calendar, approvals, clients, settings |
| `therapist` | Masked calendar — own bookings only, no client PII |
| *(public)* | `/book` treatment booking · `/rent` pool rental |

---

## Scripts

```bash
npm run dev      # Development server
npm run build    # Production build
npm run lint     # ESLint
```
