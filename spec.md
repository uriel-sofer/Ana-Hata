# Anahata CRM — Specification

**Client:** Anahata Water Therapy Center (ana-hata.co.il)
**Owner:** Moran Ben Yishai Malach
**Status:** Stage 1 spec (planning, pre-implementation)
**Last updated:** 2026-06-17

---

## 1. Background

Anahata is a water-therapy center in Hanaton, Israel. Services include Watsu, prenatal Watsu, couples sessions, water play therapy for children, breathing in water, and group workshops. A single warm-water pool is the shared physical resource. Moran is the founder, primary therapist, and admin. Other independent therapists rent pool time from her (rent handled outside this system).

The CRM is a Hebrew, RTL web application. Stage 1 focuses on customer information, appointments, and approvals. Communication and payments are deferred to later stages.

---

## 2. Goals (stage 1)

1. Centralize customer information (profile, intake, history, notes).
2. Manage the pool calendar as a single source of truth — no double-booking.
3. Let customers and external therapists request bookings; Moran approves.
4. Capture pre- and post-appointment notes per session.
5. Mask client identity from anyone who isn't Moran.

## 3. Non-goals (stage 1)

- Communication / messaging (WhatsApp, SMS, broadcast) — stage 2
- Payments, invoicing, accounting integrations — stage 2
- Therapist rent tracking — handled outside the system
- Session packages / bundles — later
- Group workshops with multiple seats per slot — TBD (likely later)
- Online marketing, lead capture beyond a booking request

---

## 4. Roles & permissions

### 4.1 Admin (Moran — also a therapist)
- Full access to everything.
- Manages services catalog, prices, therapists, vouchers, settings.
- Has her own client roster with full client files (intake, history, notes).
- Sees the whole pool calendar with full identities.
- Approves / declines booking requests.
- Can maintain an "auto-approve" allowlist (specific therapists; possibly trusted customers later).

### 4.2 Therapists (other than Moran)
- Real login.
- Reserve pool time for themselves; requests require Moran's approval (unless on the auto-approve list).
- See the pool calendar with **masked** identities — they see "busy" blocks but not who booked them, and not any client names.
- See their own bookings in full.
- **Cannot** see Moran's clients, intake, notes, files, or any customer PII.

### 4.3 Customers (Moran's clients)
- **No persistent login.** Access via Supabase Auth **email magic link** (delivered by Resend). On every confirmation email they also receive a signed booking-link (`/b/<token>`) to manage that specific booking without any identification step.
- Can self-book into Moran's available slots → request goes to Moran's approval queue.
- Can request reschedule (new approval cycle) and cancel (within window).
- See their own upcoming and past sessions, intake form, gift vouchers.
- **Cannot** see clinical notes Moran writes about them.

---

## 5. Core entities

### 5.1 Client
- Identity: full name, phone, email, city, date of birth, gender.
- Tags / segments: pregnant, military family, child, couple, returning, VIP, etc.
- Intake form: health background, emotional context, contraindications, goals, referral source.
- Session history (derived from appointments).
- Files: signed consent forms, referrals, etc. (Supabase Storage).
- Derived metrics: total sessions, last visit, next visit.

Visible only to admin.

### 5.2 Service
- Name (Hebrew), description, duration (minutes), price (ILS).
- Active / inactive.
- Catalog content **TBD** — client will provide.

### 5.3 Appointment
- Client (admin-only field) → Service → Therapist → Slot (start, end).
- Status: `scheduled` | `completed` | `no_show` | `cancelled`.
- **Pre-notes** (intent / prep) — written by Moran before the session, visible at a glance on the appointment card.
- **Post-notes** (clinical reflection) — written after, becomes part of client history, admin-only.
- Notes structure: TBD (freeform vs. lightweight fields like mood-before/after; voice memos a possible nice-to-have; carry-forward of previous post-notes when opening a new appointment is desired).

### 5.4 Booking request
- Requester: customer **or** therapist.
- Target: service + slot (or for therapist: slot only).
- Status: `pending` | `approved` | `declined` | `expired`.
- While pending, the slot is **locked** (hold).
- Approval rules: manual by default; auto-approve for whitelisted therapists.
- Reschedule = new approval cycle (old slot releases, new slot held).

### 5.5 Therapist (non-admin)
- Profile, contact, auth identity.
- Auto-approve flag.
- Owns their bookings.

### 5.6 Pool / calendar
- One pool — single shared resource.
- Working hours: TBD (configurable setting).
- Buffer between sessions: TBD (configurable setting, default suggestion 15–30 min).
- No double-booking — enforced at DB level (Postgres exclusion constraint on `tstzrange`).

### 5.7 Settings (admin-editable, no code change)
- Cancellation window for customers — default **2 hours** before session start.
- SLA threshold for "overdue" approval color — default 4 hours.
- Auto-approve allowlist.
- Buffer between sessions.
- Pool working hours.

---

## 6. Key flows

### 6.1 Customer self-booking
1. Customer visits booking page → picks service → sees available slots (admin's calendar + buffer applied).
2. Picks a slot → enters name + email + phone (or signs in via magic link if returning).
3. Submits → **booking request** created, slot **held**, confirmation email sent ("we'll confirm shortly").
4. Moran sees it in the pending queue → approves or declines.
5. On approve → confirmation email with booking-link. On decline → polite decline email.

### 6.2 Therapist slot reservation
1. Therapist logs in → sees masked calendar → picks a free slot.
2. Submits reservation → status `pending` (unless on auto-approve list).
3. Moran approves/declines (or auto-approve fires instantly).
4. On approve → slot is theirs, masked to everyone except Moran and the owner.

### 6.3 Customer reschedule
1. Customer opens booking-link → "change time" → picks new slot.
2. New booking request created, old slot releases on submission, new slot held.
3. Approval required again.

### 6.4 Customer cancellation
1. Customer opens booking-link → "cancel".
2. Allowed if `now < start_time − cancellation_window` (default 2h).
3. Outside window → message: "Please contact Moran to cancel."

### 6.5 Pre / post notes
1. Before the session: Moran opens the appointment, types pre-notes. Pre-notes show on the day's calendar card so she sees them walking into the pool.
2. After the session: Moran marks `completed` and writes post-notes. Post-notes accumulate on the client's history.
3. When opening a new appointment with the same client, the previous post-notes are shown as context (carry-forward).

### 6.6 Pending approvals inbox (admin)
- Single view sorted oldest-first.
- Color-coded by age vs. SLA (green → yellow → red).
- One-click approve / decline.

---

## 7. Stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router, TypeScript) |
| Hosting | Vercel |
| DB / Auth / Storage | Supabase (Postgres + RLS + Auth + Storage) |
| Email | Resend |
| UI | Tailwind + shadcn/ui, RTL Hebrew |

### 7.1 Auth model
- **Admin & therapists**: Supabase Auth (email+password or Google OAuth).
- **Customers**: Supabase Auth email magic link (delivered by Resend). Plus signed `/b/<token>` booking-links in every confirmation as a no-friction shortcut for that specific booking.

### 7.2 Data integrity
- Postgres exclusion constraint on appointment time ranges → no double-booking, race-safe.
- Row-Level Security:
  - Therapists can read free/busy timestamps but not client identity columns.
  - Notes table readable only by admin.
  - Customers can read/update only their own bookings.

### 7.3 Email touchpoints (stage 1)
- Magic link
- Booking request received ("we'll confirm shortly")
- Booking approved
- Booking declined
- Booking rescheduled (approved)
- Booking cancelled

(All other communications — reminders, follow-ups, broadcasts — are stage 2.)

### 7.4 Deployment
- Vercel project linked to GitHub repo.
- Supabase project (free tier to start).
- Resend domain set up with `anahata.co.il` → sender `noreply@anahata.co.il`.
- Required env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`.

---

## 8. Open items (to confirm with client)

- Services catalog content (names, durations, prices).
- Pool working hours.
- Buffer between sessions (minutes).
- Customer access method confirmation — assumed: email magic link + booking-link shortcut.
- Pre/post notes structure: freeform vs. lightweight fields; voice memos; carry-forward confirmed yes.
- Group workshops — stage 1 or later (assumed: later).
- Therapist onboarding flow — assumed: Moran creates the account / invites by email.
- Gift vouchers — included in stage 1 or deferred? (Currently listed as an entity; confirm.)

---

## 9. Stage 2+ (parked)

- Communication: WhatsApp / SMS / email templates, automated reminders, two-way messaging, broadcasts.
- Payments: cash / Bit / bank transfer / invoice integration (Green Invoice, iCount, Morning).
- Session packages / bundles.
- Therapist rent tracking and monthly invoicing (if Moran ever wants it in-system).
- Customer waitlist for full slots.
- Reports & dashboards (revenue, retention, no-show rate, popular services).
- Group workshops with multiple seats per slot.
