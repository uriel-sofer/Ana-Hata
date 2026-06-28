# Anahata CRM

Hebrew RTL CRM for Anahata Water Therapy Center (ana-hata.co.il).

## Stack
- Next.js 14 App Router (TypeScript)
- Supabase (Postgres + RLS + Auth + Storage)
- Resend for transactional email
- Tailwind CSS v3 + shadcn/ui (Radix-based Button with asChild support)

## Dev commands
```bash
npm run dev        # dev server on :3000
npm run build      # production build
npm run lint       # ESLint
```

## Supabase
```bash
SUPABASE_ACCESS_TOKEN=<token> supabase db push   # push migrations
```

## Key conventions
- All user-facing text is Hebrew (RTL). `<html dir="rtl" lang="he">` is set in root layout.
- RLS enforces all data isolation — never rely solely on app-level guards.
- Client identity (name, phone, email) is never exposed to therapist-role queries.
- `createClient()` from `@/lib/supabase/client` → browser client.
- `createClient()` from `@/lib/supabase/server` → server client (uses cookies).
- `createServiceClient()` → bypasses RLS (service role). Use ONLY in API routes, never in pages.
- Slot availability is computed in `src/lib/slots.ts` using working hours + buffer from settings table.
- `/b/<token>` booking-links are signed JWTs (90-day expiry), verified in `src/lib/booking-token.ts`.
- Emails are sent via Resend. Skip sending if `RESEND_API_KEY` is not set (dev safety).

## Route structure
- `(admin)/` — admin-only pages (auth guard in layout)
- `(therapist)/` — therapist pages, masked calendar
- `(customer)/book` — public booking page (no auth)
- `/b/[token]` — signed booking management link (no auth)
- `/auth/` — login, magic-link, callback

## Env vars
See `.env.example` for all required keys.
