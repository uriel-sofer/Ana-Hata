import { Resend } from "resend";

export function getResend(): Resend {
  return new Resend(process.env.RESEND_API_KEY!);
}

export const FROM = "onboarding@resend.dev";
