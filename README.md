# Anahata CRM

מערכת ניהול תורים ולקוחות עבור מרכז אנהאטה לטיפול במים (ana-hata.co.il).

## Stack

- **Next.js 14** App Router (TypeScript)
- **Supabase** — Postgres, RLS, Auth, Storage
- **Resend** — transactional email
- **Tailwind CSS v3** + shadcn/ui

## Development

```bash
npm install
npm run dev       # localhost:3000
npm run build
npm run lint
```

Copy `.env.example` to `.env.local` and fill in the required keys.

## Roles

| Role | Access |
|------|--------|
| `admin` | Full CRM — calendar, approvals, clients, settings |
| `therapist` | Masked calendar — own bookings only |
| *(public)* | `/book` treatment booking, `/rent` pool rental |

## Booking flow

1. Customer submits a booking request via `/book` or `/rent`
2. Admin approves/declines from `/approvals`
3. Signed management link (`/b/[token]`, 90-day JWT) is emailed to the customer for cancellation

## Migrations

```bash
SUPABASE_ACCESS_TOKEN=<token> supabase db push
```
