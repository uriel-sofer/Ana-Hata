insert into settings (id, cancellation_window_hours, sla_threshold_hours, buffer_minutes, working_hours_start, working_hours_end, auto_approve_therapist_ids)
values (1, 2, 4, 15, '08:00', '20:00', '{}')
on conflict (id) do nothing;
