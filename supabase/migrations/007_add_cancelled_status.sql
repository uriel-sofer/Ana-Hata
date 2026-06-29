-- Add 'cancelled' to booking_request_status enum (client-initiated withdrawal).
-- 'declined' remains the admin-initiated rejection status.
alter type booking_request_status add value if not exists 'cancelled';
