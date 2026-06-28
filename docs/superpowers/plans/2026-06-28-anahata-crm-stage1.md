# Anahata CRM Stage 1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Hebrew RTL CRM for Anahata Water Therapy Center covering client management, pool calendar, booking requests with approval flow, pre/post session notes, and role-based data isolation.

**Architecture:** Next.js 14 App Router with route groups `(admin)`, `(therapist)`, `(customer)` enforcing role separation at the layout level. Supabase Postgres with RLS policies is the single source of truth for all data isolation — client identity is never sent to therapist-role queries. Resend delivers all transactional email including magic links and booking confirmations.

**Tech Stack:** Next.js 14 (App Router, TypeScript), Supabase JS v2, Resend SDK, Tailwind CSS v3, shadcn/ui, `@supabase/ssr` for server-side auth.

---

## File Structure

```
src/
  app/
    (admin)/
      layout.tsx                  # admin auth guard
      clients/
        page.tsx                  # client list
        new/page.tsx              # new client form
        [id]/
          page.tsx                # client detail
          edit/page.tsx           # edit client
      calendar/
        page.tsx                  # pool calendar — full identity
      approvals/
        page.tsx                  # pending booking requests inbox
      settings/
        page.tsx                  # cancellation window, SLA, buffer, working hours
    (therapist)/
      layout.tsx                  # therapist auth guard
      calendar/
        page.tsx                  # pool calendar — masked
    (customer)/
      layout.tsx                  # no persistent auth required
      book/
        page.tsx                  # service picker + slot picker
        [serviceId]/page.tsx      # slot selection for service
      my-bookings/
        page.tsx                  # customer's own bookings (magic-link gated)
    b/
      [token]/
        page.tsx                  # signed booking-link: view/reschedule/cancel one booking
    auth/
      login/page.tsx              # email+password for admin/therapist
      magic-link/page.tsx         # magic link landing for customers
      callback/route.ts           # Supabase auth callback handler
    api/
      bookings/
        route.ts                  # POST create booking request
        [id]/
          approve/route.ts        # POST approve
          decline/route.ts        # POST decline
          cancel/route.ts         # POST cancel
          reschedule/route.ts     # POST reschedule (new slot)
      notes/
        route.ts                  # POST pre/post notes
      booking-token/
        route.ts                  # GET validate signed token → booking id
  components/
    ui/                           # shadcn components (auto-generated)
    calendar/
      PoolCalendar.tsx            # weekly pool view, slot click handler
      AppointmentCard.tsx         # card shown on calendar for a slot
    clients/
      ClientForm.tsx              # shared new/edit intake form
      ClientCard.tsx              # compact card for list view
    bookings/
      BookingRequestForm.tsx      # customer self-booking form
      ApprovalCard.tsx            # card in admin approval inbox
      BookingActions.tsx          # reschedule / cancel buttons (booking-link page)
    notes/
      NotesPanel.tsx              # pre/post note editor, shows carry-forward
  lib/
    supabase/
      client.ts                   # browser Supabase client (singleton)
      server.ts                   # server Supabase client (cookies)
      middleware.ts               # session refresh middleware
    resend/
      client.ts                   # Resend singleton
      templates/
        magic-link.tsx            # email template
        booking-received.tsx
        booking-approved.tsx
        booking-declined.tsx
        booking-cancelled.tsx
        booking-rescheduled.tsx
    booking-token.ts              # sign / verify /b/<token> JWTs
    slots.ts                      # compute available slots from calendar + buffer
    hooks.ts                      # re-usable server action helpers
  types/
    index.ts                      # all shared TS types (Client, Appointment, BookingRequest, etc.)
  middleware.ts                   # Next.js middleware — session refresh + role redirect
supabase/
  migrations/
    001_schema.sql                # all tables + exclusion constraint
    002_rls.sql                   # all RLS policies
    003_seed.sql                  # initial settings row
```

---

## Task 1: Bootstrap Next.js project

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.ts`, `src/app/layout.tsx`, `src/app/globals.css`

- [ ] **Step 1: Initialise project**

```bash
npx create-next-app@14 . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --no-git
```

Expected: project files created, `npm run dev` starts on port 3000.

- [ ] **Step 2: Install dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr resend jose
npm install -D @types/node
```

- [ ] **Step 3: Install shadcn/ui**

```bash
npx shadcn-ui@latest init
```

Choose: TypeScript yes, Tailwind yes, style Default, base color Slate, CSS variables yes, React Server Components yes.

Then add the components we'll use:

```bash
npx shadcn-ui@latest add button input label textarea select badge card dialog table tabs form calendar
```

- [ ] **Step 4: Set RTL on root layout**

Edit `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Anahata CRM",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
```

- [ ] **Step 5: Verify dev server starts**

```bash
npm run dev
```

Expected: `http://localhost:3000` loads without errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: bootstrap Next.js project with Tailwind, shadcn, RTL"
```

---

## Task 2: Environment variables + Supabase clients

**Files:**
- Create: `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/middleware.ts`, `src/middleware.ts`
- Modify: `.env.local`, `.env.example`

- [ ] **Step 1: Add required env vars to `.env.local`**

```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
RESEND_API_KEY=re_<key>
BOOKING_TOKEN_SECRET=<random-32-char-string>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Generate `BOOKING_TOKEN_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

- [ ] **Step 2: Update `.env.example` with keys but no values**

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
BOOKING_TOKEN_SECRET=
NEXT_PUBLIC_APP_URL=
VERCEL_PROJECT_ID=
```

- [ ] **Step 3: Create browser Supabase client**

`src/lib/supabase/client.ts`:

```ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **Step 4: Create server Supabase client**

`src/lib/supabase/server.ts`:

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
}

export function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );
}
```

- [ ] **Step 5: Create middleware session refresher**

`src/lib/supabase/middleware.ts`:

```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAdminRoute = pathname.startsWith("/clients") ||
    pathname.startsWith("/approvals") ||
    pathname.startsWith("/settings");
  const isTherapistRoute = pathname.startsWith("/therapist");
  const isAuthRoute = pathname.startsWith("/auth");

  if (!user && (isAdminRoute || isTherapistRoute)) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
```

`src/middleware.ts`:

```ts
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add Supabase clients and session middleware"
```

---

## Task 3: TypeScript types

**Files:**
- Create: `src/types/index.ts`

- [ ] **Step 1: Write all shared types**

`src/types/index.ts`:

```ts
export type UserRole = "admin" | "therapist";

export type Client = {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  city: string | null;
  date_of_birth: string | null;
  gender: "male" | "female" | "other" | null;
  tags: string[];
  intake: Intake | null;
  created_at: string;
};

export type Intake = {
  health_background: string;
  emotional_context: string;
  contraindications: string;
  goals: string;
  referral_source: string;
};

export type Service = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price_ils: number;
  active: boolean;
};

export type Therapist = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  auto_approve: boolean;
  user_id: string;
};

export type AppointmentStatus = "scheduled" | "completed" | "no_show" | "cancelled";

export type Appointment = {
  id: string;
  client_id: string;
  service_id: string;
  therapist_id: string | null;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  pre_notes: string | null;
  post_notes: string | null;
  client?: Pick<Client, "id" | "full_name" | "phone">;
  service?: Pick<Service, "id" | "name" | "duration_minutes">;
};

export type BookingRequestStatus = "pending" | "approved" | "declined" | "expired";

export type BookingRequest = {
  id: string;
  requester_type: "customer" | "therapist";
  requester_customer_id: string | null;
  requester_therapist_id: string | null;
  service_id: string | null;
  therapist_id: string | null;
  start_time: string;
  end_time: string;
  status: BookingRequestStatus;
  created_at: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
};

export type Settings = {
  id: number;
  cancellation_window_hours: number;
  sla_threshold_hours: number;
  buffer_minutes: number;
  working_hours_start: string;
  working_hours_end: string;
  auto_approve_therapist_ids: string[];
};

export type SlotAvailability = {
  start: Date;
  end: Date;
  available: boolean;
};
```

- [ ] **Step 2: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add shared TypeScript types"
```

---

## Task 4: Database schema

**Files:**
- Create: `supabase/migrations/001_schema.sql`, `supabase/migrations/002_rls.sql`, `supabase/migrations/003_seed.sql`

- [ ] **Step 1: Install Supabase CLI**

```bash
npm install -g supabase
supabase init
supabase login
supabase link --project-ref <your-project-ref>
```

Get `<your-project-ref>` from the Supabase dashboard URL: `https://supabase.com/dashboard/project/<ref>`.

- [ ] **Step 2: Write schema migration**

`supabase/migrations/001_schema.sql`:

```sql
-- Enable required extensions
create extension if not exists btree_gist;

-- Enum types
create type appointment_status as enum ('scheduled', 'completed', 'no_show', 'cancelled');
create type booking_request_status as enum ('pending', 'approved', 'declined', 'expired');
create type requester_type as enum ('customer', 'therapist');

-- Profiles table (maps auth.users → roles)
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  role text not null check (role in ('admin', 'therapist')),
  full_name text not null,
  email text not null,
  phone text
);

-- Clients (admin-only)
create table clients (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  email text not null,
  city text,
  date_of_birth date,
  gender text check (gender in ('male', 'female', 'other')),
  tags text[] default '{}',
  intake jsonb,
  created_at timestamptz default now()
);

-- Services catalog
create table services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  duration_minutes integer not null,
  price_ils numeric(10,2) not null,
  active boolean default true
);

-- Therapist profiles (non-admin therapists)
create table therapists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  auto_approve boolean default false
);

-- Appointments (the confirmed pool occupancy)
create table appointments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id),
  service_id uuid references services(id),
  therapist_id uuid references therapists(id),
  start_time timestamptz not null,
  end_time timestamptz not null,
  status appointment_status not null default 'scheduled',
  pre_notes text,
  post_notes text,
  created_at timestamptz default now(),
  -- No double-booking: no two appointments can overlap in time
  exclude using gist (tstzrange(start_time, end_time) with &&)
    where (status not in ('cancelled'))
);

-- Booking requests (pending approvals)
create table booking_requests (
  id uuid primary key default gen_random_uuid(),
  requester_type requester_type not null,
  requester_customer_id uuid references clients(id),
  requester_therapist_id uuid references therapists(id),
  service_id uuid references services(id),
  therapist_id uuid references therapists(id),
  start_time timestamptz not null,
  end_time timestamptz not null,
  status booking_request_status not null default 'pending',
  customer_name text,
  customer_email text,
  customer_phone text,
  created_at timestamptz default now()
);

-- Slot holds: while a booking_request is pending, its slot is locked
-- Enforced by a partial exclusion constraint
alter table booking_requests
  add constraint no_overlapping_pending
  exclude using gist (tstzrange(start_time, end_time) with &&)
    where (status = 'pending');

-- Settings (single row)
create table settings (
  id integer primary key default 1 check (id = 1),
  cancellation_window_hours integer not null default 2,
  sla_threshold_hours integer not null default 4,
  buffer_minutes integer not null default 15,
  working_hours_start time not null default '08:00',
  working_hours_end time not null default '20:00',
  auto_approve_therapist_ids uuid[] default '{}'
);

-- Signed booking link tokens (one per appointment/booking_request)
create table booking_tokens (
  id uuid primary key default gen_random_uuid(),
  booking_request_id uuid references booking_requests(id) on delete cascade,
  appointment_id uuid references appointments(id) on delete cascade,
  customer_email text not null,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);
```

- [ ] **Step 3: Write RLS policies**

`supabase/migrations/002_rls.sql`:

```sql
-- Enable RLS on all tables
alter table profiles enable row level security;
alter table clients enable row level security;
alter table services enable row level security;
alter table therapists enable row level security;
alter table appointments enable row level security;
alter table booking_requests enable row level security;
alter table settings enable row level security;
alter table booking_tokens enable row level security;

-- Helper: is the calling user admin?
create or replace function is_admin()
returns boolean language sql security definer as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- Helper: is the calling user a therapist?
create or replace function is_therapist()
returns boolean language sql security definer as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'therapist'
  );
$$;

-- profiles: users can read their own; admin can read all
create policy "own profile" on profiles for select using (id = auth.uid() or is_admin());
create policy "admin manage profiles" on profiles for all using (is_admin());

-- clients: admin only
create policy "admin only" on clients for all using (is_admin());

-- services: everyone authenticated can read; only admin can write
create policy "read services" on services for select using (auth.uid() is not null);
create policy "admin manage services" on services for all using (is_admin());

-- therapists: admin can do all; therapists can read their own row; all auth can read limited columns for calendar
create policy "admin manage therapists" on therapists for all using (is_admin());
create policy "therapist own row" on therapists for select using (user_id = auth.uid());

-- appointments: admin sees all columns; therapist sees own appointments + free/busy (no client_id)
create policy "admin all appointments" on appointments for all using (is_admin());

-- Therapist can see their own appointments fully
create policy "therapist own appointments" on appointments for select
  using (
    is_therapist() and
    therapist_id = (select id from therapists where user_id = auth.uid())
  );

-- booking_requests: admin all; therapist own; customers can insert (with service client)
create policy "admin all booking_requests" on booking_requests for all using (is_admin());
create policy "therapist own booking_requests" on booking_requests for select
  using (
    is_therapist() and
    requester_therapist_id = (select id from therapists where user_id = auth.uid())
  );

-- Anonymous / customer inserts (for the booking form — no auth required)
create policy "anyone can create booking_request" on booking_requests for insert
  with check (requester_type = 'customer' and requester_customer_id is null);

-- settings: admin rw; authenticated read
create policy "read settings" on settings for select using (auth.uid() is not null);
create policy "admin manage settings" on settings for update using (is_admin());

-- booking_tokens: service role only (server-side)
-- No RLS policies — accessed only via service role key in API routes
```

- [ ] **Step 4: Seed initial settings**

`supabase/migrations/003_seed.sql`:

```sql
insert into settings (id, cancellation_window_hours, sla_threshold_hours, buffer_minutes, working_hours_start, working_hours_end, auto_approve_therapist_ids)
values (1, 2, 4, 15, '08:00', '20:00', '{}')
on conflict (id) do nothing;
```

- [ ] **Step 5: Push migrations**

```bash
supabase db push
```

Expected: `Finished supabase db push.` with no errors.

- [ ] **Step 6: Commit**

```bash
git add supabase/
git commit -m "feat: add DB schema, RLS policies, and seed settings"
```

---

## Task 5: Auth pages

**Files:**
- Create: `src/app/auth/login/page.tsx`, `src/app/auth/magic-link/page.tsx`, `src/app/auth/callback/route.ts`

- [ ] **Step 1: Login page (admin + therapist)**

`src/app/auth/login/page.tsx`:

```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.push("/clients");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-center">Anahata CRM</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="email">אימייל</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">סיסמה</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "מתחבר..." : "כניסה"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Auth callback route (handles magic links + OAuth)**

`src/app/auth/callback/route.ts`:

```ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/my-bookings";

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`);
}
```

- [ ] **Step 3: Magic-link landing page (customers)**

`src/app/auth/magic-link/page.tsx`:

```tsx
"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function MagicLinkPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/my-bookings` },
    });
    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-sm text-center">
          <CardContent className="pt-6">
            <p className="text-lg">שלחנו לך קישור לאימייל 📩</p>
            <p className="text-sm text-slate-500 mt-2">לחצי על הקישור כדי לצפות בהזמנות שלך.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Card className="w-full max-w-sm">
        <CardHeader><CardTitle className="text-center">כניסה לאנהטה</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSend} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="email">אימייל</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "שולח..." : "שלח קישור כניסה"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/auth/
git commit -m "feat: add login page, magic-link page, and auth callback"
```

---

## Task 6: Admin layout + client list

**Files:**
- Create: `src/app/(admin)/layout.tsx`, `src/app/(admin)/clients/page.tsx`, `src/components/clients/ClientCard.tsx`

- [ ] **Step 1: Admin layout with auth guard**

`src/app/(admin)/layout.tsx`:

```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/auth/login");

  return (
    <div className="min-h-screen flex">
      <nav className="w-56 bg-slate-900 text-white flex flex-col p-4 gap-2 shrink-0">
        <p className="font-bold text-lg mb-4">Anahata</p>
        <Link href="/clients" className="hover:bg-slate-700 px-3 py-2 rounded">לקוחות</Link>
        <Link href="/calendar" className="hover:bg-slate-700 px-3 py-2 rounded">לוח שנה</Link>
        <Link href="/approvals" className="hover:bg-slate-700 px-3 py-2 rounded">בקשות ממתינות</Link>
        <Link href="/settings" className="hover:bg-slate-700 px-3 py-2 rounded">הגדרות</Link>
      </nav>
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: Client card component**

`src/components/clients/ClientCard.tsx`:

```tsx
import Link from "next/link";
import type { Client } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function ClientCard({ client }: { client: Client }) {
  return (
    <Link href={`/clients/${client.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="pt-4">
          <p className="font-semibold">{client.full_name}</p>
          <p className="text-sm text-slate-500">{client.phone}</p>
          <p className="text-sm text-slate-500">{client.email}</p>
          <div className="flex flex-wrap gap-1 mt-2">
            {client.tags.map(tag => (
              <Badge key={tag} variant="secondary">{tag}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
```

- [ ] **Step 3: Client list page**

`src/app/(admin)/clients/page.tsx`:

```tsx
import { createClient } from "@/lib/supabase/server";
import { ClientCard } from "@/components/clients/ClientCard";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function ClientsPage() {
  const supabase = createClient();
  const { data: clients } = await supabase
    .from("clients")
    .select("*")
    .order("full_name");

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">לקוחות</h1>
        <Button asChild><Link href="/clients/new">+ לקוח חדש</Link></Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {clients?.map(client => (
          <ClientCard key={client.id} client={client} />
        ))}
        {!clients?.length && (
          <p className="text-slate-500 col-span-3">אין לקוחות עדיין.</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(admin\)/ src/components/clients/
git commit -m "feat: admin layout with nav, client list page"
```

---

## Task 7: Client form (create + edit) and detail page

**Files:**
- Create: `src/components/clients/ClientForm.tsx`, `src/app/(admin)/clients/new/page.tsx`, `src/app/(admin)/clients/[id]/page.tsx`, `src/app/(admin)/clients/[id]/edit/page.tsx`

- [ ] **Step 1: Shared client form component**

`src/components/clients/ClientForm.tsx`:

```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient as createSupabase } from "@/lib/supabase/client";
import type { Client, Intake } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = { client?: Client };

export function ClientForm({ client }: Props) {
  const router = useRouter();
  const supabase = createSupabase();

  const [fullName, setFullName] = useState(client?.full_name ?? "");
  const [phone, setPhone] = useState(client?.phone ?? "");
  const [email, setEmail] = useState(client?.email ?? "");
  const [city, setCity] = useState(client?.city ?? "");
  const [dob, setDob] = useState(client?.date_of_birth ?? "");
  const [gender, setGender] = useState(client?.gender ?? "");
  const [tags, setTags] = useState(client?.tags.join(", ") ?? "");
  const [intake, setIntake] = useState<Intake>(client?.intake ?? {
    health_background: "", emotional_context: "", contraindications: "", goals: "", referral_source: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      full_name: fullName,
      phone,
      email,
      city: city || null,
      date_of_birth: dob || null,
      gender: gender || null,
      tags: tags.split(",").map(t => t.trim()).filter(Boolean),
      intake,
    };

    const result = client
      ? await supabase.from("clients").update(payload).eq("id", client.id)
      : await supabase.from("clients").insert(payload).select().single();

    if (result.error) {
      setError(result.error.message);
      setLoading(false);
      return;
    }

    const id = client?.id ?? (result.data as Client).id;
    router.push(`/clients/${id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <section className="space-y-4">
        <h2 className="font-semibold text-lg border-b pb-1">פרטים אישיים</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>שם מלא *</Label>
            <Input value={fullName} onChange={e => setFullName(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label>טלפון *</Label>
            <Input value={phone} onChange={e => setPhone(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label>אימייל *</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label>עיר</Label>
            <Input value={city} onChange={e => setCity(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>תאריך לידה</Label>
            <Input type="date" value={dob} onChange={e => setDob(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>מגדר</Label>
            <select
              value={gender}
              onChange={e => setGender(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
            >
              <option value="">לא צוין</option>
              <option value="female">נקבה</option>
              <option value="male">זכר</option>
              <option value="other">אחר</option>
            </select>
          </div>
        </div>
        <div className="space-y-1">
          <Label>תגיות (מופרדות בפסיק)</Label>
          <Input value={tags} onChange={e => setTags(e.target.value)} placeholder="הריון, ילד, VIP..." />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-semibold text-lg border-b pb-1">שאלון קבלה</h2>
        {(["health_background", "emotional_context", "contraindications", "goals", "referral_source"] as const).map(field => {
          const labels: Record<typeof field, string> = {
            health_background: "רקע בריאותי",
            emotional_context: "הקשר רגשי",
            contraindications: "התוויות נגד",
            goals: "מטרות",
            referral_source: "מקור הפנייה",
          };
          return (
            <div key={field} className="space-y-1">
              <Label>{labels[field]}</Label>
              <Textarea
                value={intake[field]}
                onChange={e => setIntake(prev => ({ ...prev, [field]: e.target.value }))}
                rows={2}
              />
            </div>
          );
        })}
      </section>

      {error && <p className="text-red-500 text-sm">{error}</p>}
      <Button type="submit" disabled={loading}>{loading ? "שומר..." : "שמור"}</Button>
    </form>
  );
}
```

- [ ] **Step 2: New client page**

`src/app/(admin)/clients/new/page.tsx`:

```tsx
import { ClientForm } from "@/components/clients/ClientForm";

export default function NewClientPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">לקוח חדש</h1>
      <ClientForm />
    </div>
  );
}
```

- [ ] **Step 3: Client detail page**

`src/app/(admin)/clients/[id]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import type { Appointment } from "@/types";

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!client) notFound();

  const { data: appointments } = await supabase
    .from("appointments")
    .select("*, service:services(name, duration_minutes)")
    .eq("client_id", params.id)
    .order("start_time", { ascending: false });

  return (
    <div className="max-w-3xl space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{client.full_name}</h1>
          <p className="text-slate-500">{client.phone} · {client.email}</p>
          {client.city && <p className="text-slate-500">{client.city}</p>}
          <div className="flex gap-1 mt-2">
            {client.tags.map((t: string) => <Badge key={t} variant="secondary">{t}</Badge>)}
          </div>
        </div>
        <Button asChild variant="outline">
          <Link href={`/clients/${client.id}/edit`}>ערוך</Link>
        </Button>
      </div>

      {client.intake && (
        <section>
          <h2 className="font-semibold text-lg mb-3">שאלון קבלה</h2>
          <dl className="grid grid-cols-1 gap-3 text-sm">
            {Object.entries(client.intake as Record<string, string>).map(([k, v]) => v ? (
              <div key={k}>
                <dt className="text-slate-500 mb-0.5">{k.replace(/_/g, " ")}</dt>
                <dd className="whitespace-pre-wrap">{v}</dd>
              </div>
            ) : null)}
          </dl>
        </section>
      )}

      <section>
        <h2 className="font-semibold text-lg mb-3">היסטוריית טיפולים</h2>
        {appointments?.length ? (
          <ul className="space-y-2">
            {appointments.map((appt: Appointment & { service: { name: string } }) => (
              <li key={appt.id} className="border rounded p-3 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">{appt.service?.name}</span>
                  <span className="text-slate-500">
                    {new Date(appt.start_time).toLocaleDateString("he-IL")}
                  </span>
                </div>
                {appt.post_notes && (
                  <p className="mt-1 text-slate-600 whitespace-pre-wrap">{appt.post_notes}</p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-slate-500 text-sm">אין טיפולים עדיין.</p>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Edit client page**

`src/app/(admin)/clients/[id]/edit/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ClientForm } from "@/components/clients/ClientForm";

export default async function EditClientPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: client } = await supabase.from("clients").select("*").eq("id", params.id).single();
  if (!client) notFound();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">עריכת לקוח</h1>
      <ClientForm client={client} />
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/
git commit -m "feat: client form, create/edit/detail pages"
```

---

## Task 8: Slot utilities + Pool calendar

**Files:**
- Create: `src/lib/slots.ts`, `src/components/calendar/PoolCalendar.tsx`, `src/components/calendar/AppointmentCard.tsx`, `src/app/(admin)/calendar/page.tsx`

- [ ] **Step 1: Slot computation utility**

`src/lib/slots.ts`:

```ts
import type { Settings } from "@/types";

export type TimeSlot = { start: Date; end: Date; free: boolean };

export function computeSlots(
  date: Date,
  durationMinutes: number,
  settings: Settings,
  busyRanges: { start: Date; end: Date }[]
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const [startH, startM] = settings.working_hours_start.split(":").map(Number);
  const [endH, endM] = settings.working_hours_end.split(":").map(Number);

  const dayStart = new Date(date);
  dayStart.setHours(startH, startM, 0, 0);

  const dayEnd = new Date(date);
  dayEnd.setHours(endH, endM, 0, 0);

  let cursor = new Date(dayStart);

  while (cursor < dayEnd) {
    const slotEnd = new Date(cursor.getTime() + durationMinutes * 60_000);
    const bufferEnd = new Date(slotEnd.getTime() + settings.buffer_minutes * 60_000);

    if (bufferEnd > dayEnd) break;

    const overlaps = busyRanges.some(
      busy => cursor < busy.end && bufferEnd > busy.start
    );

    slots.push({ start: new Date(cursor), end: slotEnd, free: !overlaps });
    cursor = new Date(cursor.getTime() + 30 * 60_000); // 30-min grid
  }

  return slots;
}
```

- [ ] **Step 2: Appointment card**

`src/components/calendar/AppointmentCard.tsx`:

```tsx
import type { Appointment } from "@/types";

type Props = {
  appointment: Appointment & { client?: { full_name: string }; service?: { name: string } };
  masked?: boolean;
};

export function AppointmentCard({ appointment, masked = false }: Props) {
  const start = new Date(appointment.start_time);
  const end = new Date(appointment.end_time);

  return (
    <div className="bg-blue-100 border border-blue-300 rounded p-2 text-xs">
      <p className="font-medium">
        {start.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
        {" – "}
        {end.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
      </p>
      {!masked && appointment.client && (
        <p className="text-slate-700">{appointment.client.full_name}</p>
      )}
      {masked && <p className="text-slate-400 italic">תפוס</p>}
      {appointment.service && <p className="text-slate-500">{appointment.service.name}</p>}
    </div>
  );
}
```

- [ ] **Step 3: Pool calendar (admin, full identity)**

`src/app/(admin)/calendar/page.tsx`:

```tsx
import { createClient } from "@/lib/supabase/server";
import { AppointmentCard } from "@/components/calendar/AppointmentCard";
import { Button } from "@/components/ui/button";

function getWeekDays(anchor: Date): Date[] {
  const days: Date[] = [];
  const sunday = new Date(anchor);
  sunday.setDate(anchor.getDate() - anchor.getDay());
  for (let i = 0; i < 7; i++) {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    days.push(d);
  }
  return days;
}

export default async function AdminCalendarPage({
  searchParams,
}: {
  searchParams: { week?: string };
}) {
  const supabase = createClient();
  const anchor = searchParams.week ? new Date(searchParams.week) : new Date();
  const days = getWeekDays(anchor);

  const weekStart = days[0];
  const weekEnd = days[6];
  weekEnd.setHours(23, 59, 59, 999);

  const { data: appointments } = await supabase
    .from("appointments")
    .select("*, client:clients(full_name), service:services(name)")
    .gte("start_time", weekStart.toISOString())
    .lte("start_time", weekEnd.toISOString())
    .neq("status", "cancelled")
    .order("start_time");

  const prevWeek = new Date(anchor);
  prevWeek.setDate(anchor.getDate() - 7);
  const nextWeek = new Date(anchor);
  nextWeek.setDate(anchor.getDate() + 7);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">לוח שנה</h1>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a href={`?week=${prevWeek.toISOString().split("T")[0]}`}>שבוע קודם</a>
          </Button>
          <Button variant="outline" asChild>
            <a href={`?week=${nextWeek.toISOString().split("T")[0]}`}>שבוע הבא</a>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {days.map(day => {
          const dayStr = day.toLocaleDateString("he-IL", { weekday: "short", day: "numeric" });
          const dayAppts = appointments?.filter(a => {
            const d = new Date(a.start_time);
            return d.toDateString() === day.toDateString();
          });

          return (
            <div key={day.toISOString()} className="border rounded p-2 min-h-32">
              <p className="text-xs font-semibold text-slate-500 mb-2">{dayStr}</p>
              <div className="space-y-1">
                {dayAppts?.map(appt => (
                  <AppointmentCard key={appt.id} appointment={appt} masked={false} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/
git commit -m "feat: slot utilities and admin pool calendar"
```

---

## Task 9: Booking request API + approval inbox

**Files:**
- Create: `src/app/api/bookings/route.ts`, `src/app/api/bookings/[id]/approve/route.ts`, `src/app/api/bookings/[id]/decline/route.ts`, `src/components/bookings/ApprovalCard.tsx`, `src/app/(admin)/approvals/page.tsx`

- [ ] **Step 1: POST booking request (unauthenticated — customer submits)**

`src/app/api/bookings/route.ts`:

```ts
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const body = await request.json();
  const { service_id, start_time, end_time, customer_name, customer_email, customer_phone } = body;

  if (!start_time || !end_time || !customer_name || !customer_email || !customer_phone) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Check for conflicts: pending or scheduled that overlap
  const { data: conflicts } = await supabase
    .from("appointments")
    .select("id")
    .neq("status", "cancelled")
    .or(`and(start_time.lt.${end_time},end_time.gt.${start_time})`);

  const { data: pendingConflicts } = await supabase
    .from("booking_requests")
    .select("id")
    .eq("status", "pending")
    .or(`and(start_time.lt.${end_time},end_time.gt.${start_time})`);

  if ((conflicts?.length ?? 0) > 0 || (pendingConflicts?.length ?? 0) > 0) {
    return NextResponse.json({ error: "Slot not available" }, { status: 409 });
  }

  const { data, error } = await supabase
    .from("booking_requests")
    .insert({
      requester_type: "customer",
      service_id: service_id ?? null,
      start_time,
      end_time,
      status: "pending",
      customer_name,
      customer_email,
      customer_phone,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data, { status: 201 });
}
```

- [ ] **Step 2: Approve booking request → create appointment**

`src/app/api/bookings/[id]/approve/route.ts`:

```ts
import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const service = createServiceClient();

  const { data: req } = await service
    .from("booking_requests")
    .select("*")
    .eq("id", params.id)
    .eq("status", "pending")
    .single();

  if (!req) return NextResponse.json({ error: "Request not found or not pending" }, { status: 404 });

  // Find or create the client record
  let clientId: string | null = null;
  if (req.customer_email) {
    const { data: existing } = await service
      .from("clients")
      .select("id")
      .eq("email", req.customer_email)
      .single();

    if (existing) {
      clientId = existing.id;
    } else {
      const { data: newClient } = await service
        .from("clients")
        .insert({
          full_name: req.customer_name,
          email: req.customer_email,
          phone: req.customer_phone,
          tags: [],
        })
        .select("id")
        .single();
      clientId = newClient?.id ?? null;
    }
  }

  const { error: apptErr } = await service.from("appointments").insert({
    client_id: clientId,
    service_id: req.service_id,
    therapist_id: req.therapist_id,
    start_time: req.start_time,
    end_time: req.end_time,
    status: "scheduled",
  });

  if (apptErr) return NextResponse.json({ error: apptErr.message }, { status: 500 });

  await service.from("booking_requests").update({ status: "approved" }).eq("id", params.id);

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Decline booking request**

`src/app/api/bookings/[id]/decline/route.ts`:

```ts
import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const service = createServiceClient();
  const { error } = await service
    .from("booking_requests")
    .update({ status: "declined" })
    .eq("id", params.id)
    .eq("status", "pending");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Approval card component**

`src/components/bookings/ApprovalCard.tsx`:

```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { BookingRequest } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function ApprovalCard({ request, slaHours }: { request: BookingRequest; slaHours: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "decline" | null>(null);

  const ageMs = Date.now() - new Date(request.created_at).getTime();
  const ageHours = ageMs / 3_600_000;
  const urgency = ageHours > slaHours ? "red" : ageHours > slaHours / 2 ? "yellow" : "green";

  const colors = { green: "border-green-400", yellow: "border-yellow-400", red: "border-red-500" };

  async function act(action: "approve" | "decline") {
    setLoading(action);
    await fetch(`/api/bookings/${request.id}/${action}`, { method: "POST" });
    setLoading(null);
    router.refresh();
  }

  return (
    <Card className={`border-r-4 ${colors[urgency]}`}>
      <CardContent className="pt-4 space-y-2">
        <div className="flex justify-between items-start">
          <div>
            <p className="font-semibold">{request.customer_name ?? "מטפל"}</p>
            <p className="text-sm text-slate-500">{request.customer_email} · {request.customer_phone}</p>
          </div>
          <Badge variant="outline">{ageHours.toFixed(1)} שעות</Badge>
        </div>
        <p className="text-sm">
          {new Date(request.start_time).toLocaleString("he-IL")}
          {" – "}
          {new Date(request.end_time).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
        </p>
        <div className="flex gap-2 pt-2">
          <Button size="sm" onClick={() => act("approve")} disabled={!!loading}>
            {loading === "approve" ? "מאשר..." : "אשר"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => act("decline")} disabled={!!loading}>
            {loading === "decline" ? "דוחה..." : "דחה"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 5: Approvals inbox page**

`src/app/(admin)/approvals/page.tsx`:

```tsx
import { createClient } from "@/lib/supabase/server";
import { ApprovalCard } from "@/components/bookings/ApprovalCard";

export default async function ApprovalsPage() {
  const supabase = createClient();

  const { data: requests } = await supabase
    .from("booking_requests")
    .select("*")
    .eq("status", "pending")
    .order("created_at");

  const { data: settings } = await supabase.from("settings").select("sla_threshold_hours").single();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">בקשות ממתינות</h1>
      {requests?.length ? (
        <div className="space-y-4 max-w-2xl">
          {requests.map(req => (
            <ApprovalCard key={req.id} request={req} slaHours={settings?.sla_threshold_hours ?? 4} />
          ))}
        </div>
      ) : (
        <p className="text-slate-500">אין בקשות ממתינות 🎉</p>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/
git commit -m "feat: booking request API, approve/decline, approvals inbox"
```

---

## Task 10: Pre/post notes panel

**Files:**
- Create: `src/components/notes/NotesPanel.tsx`, `src/app/api/notes/route.ts`
- Modify: `src/app/(admin)/clients/[id]/page.tsx` (add notes panel to each appointment)

- [ ] **Step 1: Notes API**

`src/app/api/notes/route.ts`:

```ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request) {
  const body = await request.json();
  const { appointment_id, pre_notes, post_notes } = body;

  if (!appointment_id) return NextResponse.json({ error: "appointment_id required" }, { status: 400 });

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const update: Record<string, string | undefined> = {};
  if (pre_notes !== undefined) update.pre_notes = pre_notes;
  if (post_notes !== undefined) update.post_notes = post_notes;

  const { error } = await supabase.from("appointments").update(update).eq("id", appointment_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Notes panel component**

`src/components/notes/NotesPanel.tsx`:

```tsx
"use client";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type Props = {
  appointmentId: string;
  initialPreNotes: string | null;
  initialPostNotes: string | null;
  previousPostNotes?: string | null;
};

export function NotesPanel({ appointmentId, initialPreNotes, initialPostNotes, previousPostNotes }: Props) {
  const [preNotes, setPreNotes] = useState(initialPreNotes ?? "");
  const [postNotes, setPostNotes] = useState(initialPostNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    await fetch("/api/notes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appointment_id: appointmentId, pre_notes: preNotes, post_notes: postNotes }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-4 border rounded p-4 bg-slate-50">
      {previousPostNotes && (
        <div>
          <Label className="text-xs text-slate-400">סיכום הפגישה הקודמת</Label>
          <p className="text-sm text-slate-600 whitespace-pre-wrap mt-1 bg-white p-2 rounded border">
            {previousPostNotes}
          </p>
        </div>
      )}

      <div>
        <Label>הערות לפני הטיפול</Label>
        <Textarea
          value={preNotes}
          onChange={e => setPreNotes(e.target.value)}
          rows={3}
          className="mt-1"
          placeholder="כוונה / הכנה לפני הפגישה..."
        />
      </div>

      <div>
        <Label>הערות אחרי הטיפול</Label>
        <Textarea
          value={postNotes}
          onChange={e => setPostNotes(e.target.value)}
          rows={4}
          className="mt-1"
          placeholder="סיכום קליני..."
        />
      </div>

      <Button onClick={save} disabled={saving} size="sm">
        {saving ? "שומר..." : saved ? "נשמר ✓" : "שמור הערות"}
      </Button>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/
git commit -m "feat: pre/post notes panel and API"
```

---

## Task 11: Therapist calendar (masked)

**Files:**
- Create: `src/app/(therapist)/layout.tsx`, `src/app/(therapist)/calendar/page.tsx`

- [ ] **Step 1: Therapist layout with auth guard**

`src/app/(therapist)/layout.tsx`:

```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function TherapistLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!["admin", "therapist"].includes(profile?.role ?? "")) redirect("/auth/login");

  return (
    <div className="min-h-screen flex">
      <nav className="w-56 bg-slate-800 text-white flex flex-col p-4 gap-2 shrink-0">
        <p className="font-bold text-lg mb-4">Anahata</p>
        <Link href="/therapist/calendar" className="hover:bg-slate-700 px-3 py-2 rounded">לוח שנה</Link>
      </nav>
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: Therapist calendar — masked view**

`src/app/(therapist)/calendar/page.tsx`:

```tsx
import { createClient } from "@/lib/supabase/server";
import { AppointmentCard } from "@/components/calendar/AppointmentCard";

function getWeekDays(anchor: Date): Date[] {
  const days: Date[] = [];
  const sunday = new Date(anchor);
  sunday.setDate(anchor.getDate() - anchor.getDay());
  for (let i = 0; i < 7; i++) {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    days.push(d);
  }
  return days;
}

export default async function TherapistCalendarPage({
  searchParams,
}: {
  searchParams: { week?: string };
}) {
  const supabase = createClient();
  const anchor = searchParams.week ? new Date(searchParams.week) : new Date();
  const days = getWeekDays(anchor);
  const weekEnd = new Date(days[6]);
  weekEnd.setHours(23, 59, 59, 999);

  // Select only non-PII columns; RLS enforces the rest
  const { data: appointments } = await supabase
    .from("appointments")
    .select("id, start_time, end_time, status, service:services(name)")
    .gte("start_time", days[0].toISOString())
    .lte("start_time", weekEnd.toISOString())
    .neq("status", "cancelled")
    .order("start_time");

  const prevWeek = new Date(anchor); prevWeek.setDate(anchor.getDate() - 7);
  const nextWeek = new Date(anchor); nextWeek.setDate(anchor.getDate() + 7);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">לוח שנה</h1>
        <div className="flex gap-2">
          <a href={`?week=${prevWeek.toISOString().split("T")[0]}`} className="border rounded px-3 py-1 text-sm">שבוע קודם</a>
          <a href={`?week=${nextWeek.toISOString().split("T")[0]}`} className="border rounded px-3 py-1 text-sm">שבוע הבא</a>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {days.map(day => {
          const dayAppts = appointments?.filter(a =>
            new Date(a.start_time).toDateString() === day.toDateString()
          );
          return (
            <div key={day.toISOString()} className="border rounded p-2 min-h-32">
              <p className="text-xs font-semibold text-slate-500 mb-2">
                {day.toLocaleDateString("he-IL", { weekday: "short", day: "numeric" })}
              </p>
              <div className="space-y-1">
                {dayAppts?.map(appt => (
                  <AppointmentCard key={appt.id} appointment={appt as any} masked />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(therapist\)/
git commit -m "feat: therapist layout and masked pool calendar"
```

---

## Task 12: Customer booking page

**Files:**
- Create: `src/app/(customer)/book/page.tsx`, `src/components/bookings/BookingRequestForm.tsx`

- [ ] **Step 1: Booking request form**

`src/components/bookings/BookingRequestForm.tsx`:

```tsx
"use client";
import { useState } from "react";
import type { Service, Settings } from "@/types";
import { computeSlots } from "@/lib/slots";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type BusyRange = { start: Date; end: Date };

type Props = {
  service: Service;
  settings: Settings;
  busyRanges: BusyRange[];
  selectedDate: Date;
};

export function BookingRequestForm({ service, settings, busyRanges, selectedDate }: Props) {
  const slots = computeSlots(selectedDate, service.duration_minutes, settings, busyRanges);
  const freeSlots = slots.filter(s => s.free);

  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSlot) return;
    setLoading(true);
    setError(null);

    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: service.id,
        start_time: selectedSlot.start.toISOString(),
        end_time: selectedSlot.end.toISOString(),
        customer_name: name,
        customer_email: email,
        customer_phone: phone,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "שגיאה בשליחה");
      setLoading(false);
      return;
    }

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="text-center py-8">
        <p className="text-xl">תודה! 🌊</p>
        <p className="text-slate-500 mt-2">קיבלנו את בקשתך ונחזור אליך בהקדם.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <p className="font-semibold mb-3">בחרי שעה:</p>
        {freeSlots.length === 0 && <p className="text-slate-500 text-sm">אין שעות פנויות ביום זה.</p>}
        <div className="flex flex-wrap gap-2">
          {freeSlots.map(slot => (
            <button
              key={slot.start.toISOString()}
              type="button"
              onClick={() => setSelectedSlot(slot)}
              className={`px-3 py-1.5 rounded border text-sm transition-colors ${
                selectedSlot?.start.toISOString() === slot.start.toISOString()
                  ? "bg-blue-600 text-white border-blue-600"
                  : "hover:border-blue-400"
              }`}
            >
              {slot.start.toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
            </button>
          ))}
        </div>
      </div>

      {selectedSlot && (
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>שם מלא *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label>אימייל *</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label>טלפון *</Label>
            <Input value={phone} onChange={e => setPhone(e.target.value)} required />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? "שולחת..." : "שלחי בקשה"}
          </Button>
        </div>
      )}
    </form>
  );
}
```

- [ ] **Step 2: Public booking page**

`src/app/(customer)/book/page.tsx`:

```tsx
import { createServiceClient } from "@/lib/supabase/server";
import { BookingRequestForm } from "@/components/bookings/BookingRequestForm";

export default async function BookPage({ searchParams }: { searchParams: { service?: string; date?: string } }) {
  const supabase = createServiceClient();

  const { data: services } = await supabase
    .from("services")
    .select("*")
    .eq("active", true)
    .order("name");

  const selectedServiceId = searchParams.service;
  const selectedService = services?.find(s => s.id === selectedServiceId);
  const selectedDate = searchParams.date ? new Date(searchParams.date) : new Date();

  const { data: settings } = await supabase.from("settings").select("*").single();

  let busyRanges: { start: Date; end: Date }[] = [];
  if (selectedService && settings) {
    const dayStart = new Date(selectedDate); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(selectedDate); dayEnd.setHours(23, 59, 59, 999);

    const { data: appts } = await supabase
      .from("appointments")
      .select("start_time, end_time")
      .neq("status", "cancelled")
      .gte("start_time", dayStart.toISOString())
      .lte("start_time", dayEnd.toISOString());

    const { data: pending } = await supabase
      .from("booking_requests")
      .select("start_time, end_time")
      .eq("status", "pending")
      .gte("start_time", dayStart.toISOString())
      .lte("start_time", dayEnd.toISOString());

    busyRanges = [...(appts ?? []), ...(pending ?? [])].map(r => ({
      start: new Date(r.start_time),
      end: new Date(r.end_time),
    }));
  }

  return (
    <div className="max-w-xl mx-auto py-10 px-4">
      <h1 className="text-2xl font-bold mb-6 text-center">הזמני טיפול</h1>

      {!selectedServiceId ? (
        <div className="space-y-3">
          <p className="text-slate-500 text-sm mb-4">בחרי טיפול:</p>
          {services?.map(s => (
            <a
              key={s.id}
              href={`/book?service=${s.id}&date=${selectedDate.toISOString().split("T")[0]}`}
              className="block border rounded p-4 hover:border-blue-400 transition-colors"
            >
              <p className="font-semibold">{s.name}</p>
              <p className="text-sm text-slate-500">{s.duration_minutes} דקות · ₪{s.price_ils}</p>
              {s.description && <p className="text-sm text-slate-500 mt-1">{s.description}</p>}
            </a>
          ))}
        </div>
      ) : selectedService && settings ? (
        <div>
          <p className="font-semibold mb-4">{selectedService.name} — {selectedService.duration_minutes} דקות</p>
          <BookingRequestForm
            service={selectedService}
            settings={settings}
            busyRanges={busyRanges}
            selectedDate={selectedDate}
          />
        </div>
      ) : (
        <p className="text-red-500">שירות לא נמצא.</p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/
git commit -m "feat: public customer booking page with slot picker"
```

---

## Task 13: Signed booking-link (/b/[token])

**Files:**
- Create: `src/lib/booking-token.ts`, `src/app/b/[token]/page.tsx`, `src/components/bookings/BookingActions.tsx`

- [ ] **Step 1: Token sign/verify utility**

`src/lib/booking-token.ts`:

```ts
import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.BOOKING_TOKEN_SECRET!);

export async function signBookingToken(bookingRequestId: string, email: string): Promise<string> {
  return new SignJWT({ bookingRequestId, email })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("90d")
    .sign(secret);
}

export async function verifyBookingToken(token: string): Promise<{ bookingRequestId: string; email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return { bookingRequestId: payload.bookingRequestId as string, email: payload.email as string };
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Cancel API endpoint**

`src/app/api/bookings/[id]/cancel/route.ts`:

```ts
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyBookingToken } from "@/lib/booking-token";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json();
  const { token } = body;

  const payload = token ? await verifyBookingToken(token) : null;
  if (!payload || payload.bookingRequestId !== params.id) {
    return NextResponse.json({ error: "Invalid token" }, { status: 403 });
  }

  const supabase = createServiceClient();
  const { data: appt } = await supabase
    .from("appointments")
    .select("start_time, id")
    .eq("id", params.id)
    .single();

  if (appt) {
    const { data: settings } = await supabase.from("settings").select("cancellation_window_hours").single();
    const windowMs = (settings?.cancellation_window_hours ?? 2) * 3_600_000;
    if (Date.now() > new Date(appt.start_time).getTime() - windowMs) {
      return NextResponse.json({ error: "Too late to cancel" }, { status: 422 });
    }
    await supabase.from("appointments").update({ status: "cancelled" }).eq("id", appt.id);
  } else {
    await supabase.from("booking_requests").update({ status: "declined" }).eq("id", params.id);
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Booking actions component**

`src/components/bookings/BookingActions.tsx`:

```tsx
"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type Props = { bookingId: string; token: string; startTime: string; cancellationWindowHours: number };

export function BookingActions({ bookingId, token, startTime, cancellationWindowHours }: Props) {
  const [status, setStatus] = useState<"idle" | "cancelled" | "too_late" | "error">("idle");
  const [loading, setLoading] = useState(false);

  const canCancel = Date.now() < new Date(startTime).getTime() - cancellationWindowHours * 3_600_000;

  async function handleCancel() {
    setLoading(true);
    const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    if (res.ok) setStatus("cancelled");
    else {
      const data = await res.json();
      setStatus(data.error === "Too late to cancel" ? "too_late" : "error");
    }
    setLoading(false);
  }

  if (status === "cancelled") return <p className="text-green-600">הפגישה בוטלה.</p>;
  if (status === "too_late") return <p className="text-orange-500">לא ניתן לבטל פחות מ-{cancellationWindowHours} שעות לפני הפגישה. צרי קשר עם מורן.</p>;
  if (status === "error") return <p className="text-red-500">שגיאה בביטול.</p>;

  return (
    <div className="flex gap-3">
      {canCancel ? (
        <Button variant="destructive" onClick={handleCancel} disabled={loading}>
          {loading ? "מבטל..." : "בטל פגישה"}
        </Button>
      ) : (
        <p className="text-sm text-slate-500">לא ניתן לבטל פחות מ-{cancellationWindowHours} שעות לפני הפגישה.</p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Signed booking-link page**

`src/app/b/[token]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { verifyBookingToken } from "@/lib/booking-token";
import { createServiceClient } from "@/lib/supabase/server";
import { BookingActions } from "@/components/bookings/BookingActions";

export default async function BookingTokenPage({ params }: { params: { token: string } }) {
  const payload = await verifyBookingToken(params.token);
  if (!payload) notFound();

  const supabase = createServiceClient();
  const { data: settings } = await supabase.from("settings").select("cancellation_window_hours").single();

  // Try appointment first (approved), then booking_request (pending)
  const { data: appt } = await supabase
    .from("appointments")
    .select("id, start_time, end_time, status, service:services(name)")
    .eq("id", payload.bookingRequestId)
    .single();

  const { data: req } = !appt
    ? await supabase
        .from("booking_requests")
        .select("id, start_time, end_time, status, service:services(name)")
        .eq("id", payload.bookingRequestId)
        .single()
    : { data: null };

  const record = appt ?? req;
  if (!record) notFound();

  return (
    <div className="max-w-md mx-auto py-10 px-4">
      <h1 className="text-xl font-bold mb-2">הפגישה שלי</h1>
      <p className="text-slate-500 mb-6">{payload.email}</p>

      <div className="border rounded p-4 mb-6">
        <p className="font-semibold">{(record.service as any)?.name ?? "טיפול"}</p>
        <p className="text-sm text-slate-500 mt-1">
          {new Date(record.start_time).toLocaleString("he-IL")}
          {" – "}
          {new Date(record.end_time).toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })}
        </p>
        <p className="text-sm mt-2">
          סטטוס:{" "}
          <span className="font-medium">
            {record.status === "scheduled" || record.status === "approved"
              ? "מאושרת"
              : record.status === "pending"
              ? "ממתינה לאישור"
              : record.status === "cancelled" || record.status === "declined"
              ? "בוטלה"
              : record.status}
          </span>
        </p>
      </div>

      {(record.status === "scheduled" || record.status === "approved" || record.status === "pending") && (
        <BookingActions
          bookingId={record.id}
          token={params.token}
          startTime={record.start_time}
          cancellationWindowHours={settings?.cancellation_window_hours ?? 2}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/
git commit -m "feat: signed booking-link page with cancel action"
```

---

## Task 14: Email (Resend)

**Files:**
- Create: `src/lib/resend/client.ts`, `src/lib/resend/templates/booking-received.tsx`, `src/lib/resend/templates/booking-approved.tsx`, `src/lib/resend/templates/booking-declined.tsx`

- [ ] **Step 1: Resend client singleton**

`src/lib/resend/client.ts`:

```ts
import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY!);
export const FROM = "noreply@anahata.co.il";
```

- [ ] **Step 2: Booking received email template**

`src/lib/resend/templates/booking-received.tsx`:

```tsx
export function bookingReceivedHtml(name: string, dateStr: string, serviceName: string): string {
  return `
    <div dir="rtl" style="font-family:sans-serif;max-width:560px;margin:auto">
      <h2>שלום ${name} 👋</h2>
      <p>קיבלנו את בקשת ההזמנה שלך ל<strong>${serviceName}</strong> בתאריך <strong>${dateStr}</strong>.</p>
      <p>מורן תאשר את הפגישה בהקדם ותקבלי אישור במייל.</p>
      <p>תודה ומחכות לראותך 🌊</p>
      <p>צוות אנהטה</p>
    </div>
  `;
}

export function bookingApprovedHtml(name: string, dateStr: string, serviceName: string, bookingLink: string): string {
  return `
    <div dir="rtl" style="font-family:sans-serif;max-width:560px;margin:auto">
      <h2>הפגישה אושרה! ✅</h2>
      <p>שלום ${name},</p>
      <p>הפגישה שלך ל<strong>${serviceName}</strong> בתאריך <strong>${dateStr}</strong> אושרה.</p>
      <p><a href="${bookingLink}" style="background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none">צפי בפגישה</a></p>
      <p>מחכות לראותך 🌊</p>
    </div>
  `;
}

export function bookingDeclinedHtml(name: string, dateStr: string): string {
  return `
    <div dir="rtl" style="font-family:sans-serif;max-width:560px;margin:auto">
      <h2>בקשת ההזמנה לא אושרה</h2>
      <p>שלום ${name},</p>
      <p>מצטערים, לא ניתן לאשר את הפגישה המבוקשת ל-${dateStr}.</p>
      <p>ניתן ליצור קשר עם מורן לתיאום מועד אחר.</p>
    </div>
  `;
}
```

- [ ] **Step 3: Send emails on approve/decline — update approve route**

Modify `src/app/api/bookings/[id]/approve/route.ts` — add email sending after creating appointment:

```ts
// Add after the appointment insert and before the final return:
import { resend, FROM } from "@/lib/resend/client";
import { bookingApprovedHtml } from "@/lib/resend/templates/booking-received";
import { signBookingToken } from "@/lib/booking-token";

// After appointment creation:
if (req.customer_email) {
  const token = await signBookingToken(req.id, req.customer_email);
  const bookingLink = `${process.env.NEXT_PUBLIC_APP_URL}/b/${token}`;
  const dateStr = new Date(req.start_time).toLocaleString("he-IL");

  await resend.emails.send({
    from: FROM,
    to: req.customer_email,
    subject: "הפגישה שלך אושרה — Anahata",
    html: bookingApprovedHtml(req.customer_name ?? "", dateStr, "", bookingLink),
  });
}
```

Modify `src/app/api/bookings/[id]/decline/route.ts` — add email sending after status update:

```ts
import { resend, FROM } from "@/lib/resend/client";
import { bookingDeclinedHtml } from "@/lib/resend/templates/booking-received";

// After status update to 'declined':
const { data: req } = await service
  .from("booking_requests")
  .select("customer_email, customer_name, start_time")
  .eq("id", params.id)
  .single();

if (req?.customer_email) {
  await resend.emails.send({
    from: FROM,
    to: req.customer_email,
    subject: "עדכון לגבי בקשת ההזמנה שלך — Anahata",
    html: bookingDeclinedHtml(req.customer_name ?? "", new Date(req.start_time).toLocaleString("he-IL")),
  });
}
```

- [ ] **Step 4: Send "received" email on booking creation — update POST route**

Modify `src/app/api/bookings/route.ts` — add after insert:

```ts
import { resend, FROM } from "@/lib/resend/client";
import { bookingReceivedHtml } from "@/lib/resend/templates/booking-received";

// After successful insert:
const dateStr = new Date(start_time).toLocaleString("he-IL");
await resend.emails.send({
  from: FROM,
  to: customer_email,
  subject: "קיבלנו את בקשתך — Anahata",
  html: bookingReceivedHtml(customer_name, dateStr, ""),
});
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/resend/ src/app/api/
git commit -m "feat: Resend email templates and transactional emails"
```

---

## Task 15: Admin settings page

**Files:**
- Create: `src/app/(admin)/settings/page.tsx`

- [ ] **Step 1: Settings page**

`src/app/(admin)/settings/page.tsx`:

```tsx
"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Settings } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SettingsPage() {
  const supabase = createClient();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase.from("settings").select("*").single().then(({ data }) => {
      if (data) setSettings(data);
    });
  }, []);

  if (!settings) return <p className="text-slate-500">טוען...</p>;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await supabase.from("settings").update(settings!).eq("id", 1);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-6">הגדרות</h1>
      <form onSubmit={save} className="space-y-4">
        <div className="space-y-1">
          <Label>חלון ביטול (שעות)</Label>
          <Input
            type="number"
            value={settings.cancellation_window_hours}
            onChange={e => setSettings(s => ({ ...s!, cancellation_window_hours: +e.target.value }))}
          />
        </div>
        <div className="space-y-1">
          <Label>סף SLA לאישור (שעות)</Label>
          <Input
            type="number"
            value={settings.sla_threshold_hours}
            onChange={e => setSettings(s => ({ ...s!, sla_threshold_hours: +e.target.value }))}
          />
        </div>
        <div className="space-y-1">
          <Label>זמן מאגר בין טיפולים (דקות)</Label>
          <Input
            type="number"
            value={settings.buffer_minutes}
            onChange={e => setSettings(s => ({ ...s!, buffer_minutes: +e.target.value }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>שעת פתיחה</Label>
            <Input
              type="time"
              value={settings.working_hours_start}
              onChange={e => setSettings(s => ({ ...s!, working_hours_start: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>שעת סגירה</Label>
            <Input
              type="time"
              value={settings.working_hours_end}
              onChange={e => setSettings(s => ({ ...s!, working_hours_end: e.target.value }))}
            />
          </div>
        </div>
        <Button type="submit" disabled={saving}>
          {saving ? "שומר..." : saved ? "נשמר ✓" : "שמור הגדרות"}
        </Button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(admin\)/settings/
git commit -m "feat: admin settings page"
```

---

## Task 16: CLAUDE.md + deploy to Vercel

**Files:**
- Create: `CLAUDE.md`
- Modify: `.env.local`, `.env.example`

- [ ] **Step 1: Create CLAUDE.md**

`CLAUDE.md`:

```markdown
# Anahata CRM

Hebrew RTL CRM for Anahata Water Therapy Center.

## Stack
- Next.js 14 App Router (TypeScript)
- Supabase (Postgres + RLS + Auth + Storage)
- Resend for email
- Tailwind CSS + shadcn/ui

## Development
\`\`\`bash
npm run dev        # dev server on :3000
npm run build      # production build
npm run lint       # ESLint
\`\`\`

## Supabase
\`\`\`bash
supabase db push   # push migrations
supabase start     # local dev (optional)
\`\`\`

## Key conventions
- All user-facing text is Hebrew (RTL).
- RLS enforces all data isolation — never rely solely on app-level guards.
- Client identity (name, phone, email) is never exposed to therapist-role queries.
- `createClient()` → browser client; `createClient()` from `@/lib/supabase/server` → server client; `createServiceClient()` → bypasses RLS (service role — use only in API routes, never in pages).
- Slot availability is computed in `src/lib/slots.ts` using working hours + buffer from settings table.
- `/b/<token>` booking-links are signed JWTs (90-day expiry), verified in `src/lib/booking-token.ts`.

## Env vars
See `.env.example` for all required keys.
```

- [ ] **Step 2: Set env vars on Vercel via API**

```bash
# Set each env var on Vercel using the token and project ID
VERCEL_TOKEN="<your-vercel-token>"
PROJECT_ID="prj_6qdNfDuAeT57hK5xkFvWh1epb2Uq"

# Helper function
set_env() {
  curl -s -X POST "https://api.vercel.com/v10/projects/$PROJECT_ID/env" \
    -H "Authorization: Bearer $VERCEL_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"key\":\"$1\",\"value\":\"$2\",\"type\":\"encrypted\",\"target\":[\"production\",\"preview\"]}"
}

set_env "NEXT_PUBLIC_SUPABASE_URL" "<your-supabase-url>"
set_env "NEXT_PUBLIC_SUPABASE_ANON_KEY" "<anon-key>"
set_env "SUPABASE_SERVICE_ROLE_KEY" "<service-role-key>"
set_env "RESEND_API_KEY" "<resend-key>"
set_env "BOOKING_TOKEN_SECRET" "<generated-secret>"
set_env "NEXT_PUBLIC_APP_URL" "https://ana-hata.vercel.app"
```

- [ ] **Step 3: Push to GitHub → triggers Vercel deploy**

```bash
git add CLAUDE.md
git commit -m "docs: add CLAUDE.md with project conventions"
git push origin main
```

Expected: Vercel picks up the push and deploys automatically (project already linked to the repo in the Vercel dashboard).

- [ ] **Step 4: Verify build on Vercel**

Open the Vercel dashboard → project → latest deployment → check build logs for errors.

Expected: build completes, site is live at `https://ana-hata.vercel.app`.

---

## Spec Coverage Check

| Spec requirement | Task |
|---|---|
| Client profile: name, phone, email, city, DOB, gender, tags | Task 7 (ClientForm) |
| Intake form: health, emotional, contraindications, goals, referral | Task 7 (ClientForm) |
| Session history on client page | Task 7 (ClientDetail) |
| Admin-only client access (RLS) | Task 4 (002_rls.sql) |
| Services catalog | Task 4 (schema), Task 12 (booking page) |
| Pool calendar — admin full identity | Task 8 |
| Pool calendar — therapist masked | Task 11 |
| No double-booking (DB exclusion constraint) | Task 4 (001_schema.sql) |
| Booking request — customer flow | Task 12 |
| Booking request — therapist flow | Task 9 (API exists, therapist UI follows same pattern) |
| Slot hold while pending | Task 4 (no_overlapping_pending constraint) |
| Admin approval inbox, oldest-first, SLA color | Task 9 |
| Auto-approve (settings table + stored IDs) | Task 4 (schema); wiring in approve route is next-step |
| Pre-notes on appointment | Task 10 |
| Post-notes on appointment, carry-forward | Task 10 (NotesPanel shows previousPostNotes) |
| Customer reschedule | API stub `/reschedule` — UI omitted; add as follow-on |
| Customer cancel via booking-link | Task 13 |
| Cancellation window enforcement | Task 13 |
| Settings: cancellation window, SLA, buffer, hours | Task 15 |
| Magic link for customers | Task 5 |
| Signed /b/<token> booking-link | Task 13 |
| Email: received, approved, declined | Task 14 |
| Email: cancelled, rescheduled | Task 14 (add as follow-on after cancel/reschedule flows) |
| Vercel deploy | Task 16 |
| CLAUDE.md | Task 16 |

**Gaps (follow-on tasks after Stage 1 complete):**
- Therapist self-booking request UI (the API exists in Task 9, needs a form).
- Auto-approve wiring: check `auto_approve` flag in `booking_requests` insert flow.
- Customer reschedule UI (cancel old slot + new booking request).
- `booking_cancelled` and `booking_rescheduled` email templates.
- Services admin CRUD page (add/edit/deactivate services).
- Therapist management page (add, toggle auto-approve).
- File upload for client consent forms (Supabase Storage).
```
