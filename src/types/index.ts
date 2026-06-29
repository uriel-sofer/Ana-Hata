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
  pool_count: number;
};

export type SlotAvailability = {
  start: Date;
  end: Date;
  available: boolean;
};
