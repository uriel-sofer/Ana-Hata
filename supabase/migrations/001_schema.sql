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

-- Appointments (confirmed pool occupancy)
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
  -- No double-booking
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
  created_at timestamptz default now(),
  -- No overlapping pending requests
  exclude using gist (tstzrange(start_time, end_time) with &&)
    where (status = 'pending')
);

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

-- Signed booking link tokens
create table booking_tokens (
  id uuid primary key default gen_random_uuid(),
  booking_request_id uuid references booking_requests(id) on delete cascade,
  appointment_id uuid references appointments(id) on delete cascade,
  customer_email text not null,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);
