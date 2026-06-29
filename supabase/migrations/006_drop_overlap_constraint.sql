-- Drop the single-pool exclusion constraints so pool_count > 1 is possible.
-- Overlap enforcement is now handled at the application level via pool_count setting.
do $$
declare
  c text;
begin
  select conname into c from pg_constraint
    where conrelid = 'appointments'::regclass and contype = 'x' limit 1;
  if c is not null then
    execute format('alter table appointments drop constraint %I', c);
  end if;

  select conname into c from pg_constraint
    where conrelid = 'booking_requests'::regclass and contype = 'x' limit 1;
  if c is not null then
    execute format('alter table booking_requests drop constraint %I', c);
  end if;
end $$;
