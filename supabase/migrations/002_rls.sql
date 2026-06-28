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

-- profiles
create policy "own profile" on profiles for select using (id = auth.uid() or is_admin());
create policy "admin manage profiles" on profiles for all using (is_admin());

-- clients: admin only
create policy "admin only clients" on clients for all using (is_admin());

-- services: everyone authenticated can read; only admin can write
create policy "read services" on services for select using (auth.uid() is not null);
create policy "admin manage services" on services for all using (is_admin());

-- therapists
create policy "admin manage therapists" on therapists for all using (is_admin());
create policy "therapist own row" on therapists for select using (user_id = auth.uid());

-- appointments: admin sees all; therapist sees own
create policy "admin all appointments" on appointments for all using (is_admin());
create policy "therapist own appointments" on appointments for select
  using (
    is_therapist() and
    therapist_id = (select id from therapists where user_id = auth.uid())
  );

-- booking_requests
create policy "admin all booking_requests" on booking_requests for all using (is_admin());
create policy "therapist own booking_requests" on booking_requests for select
  using (
    is_therapist() and
    requester_therapist_id = (select id from therapists where user_id = auth.uid())
  );
create policy "anyone can create booking_request" on booking_requests for insert
  with check (requester_type = 'customer' and requester_customer_id is null);

-- settings
create policy "read settings" on settings for select using (true);
create policy "admin manage settings" on settings for update using (is_admin());

-- booking_tokens: no RLS (service role only via API routes)
