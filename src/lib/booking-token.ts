import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.BOOKING_TOKEN_SECRET!);

export async function signBookingToken(bookingRequestId: string, email: string): Promise<string> {
  return new SignJWT({ bookingRequestId, email })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("90d")
    .sign(secret);
}

export async function verifyBookingToken(
  token: string
): Promise<{ bookingRequestId: string; email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return {
      bookingRequestId: payload.bookingRequestId as string,
      email: payload.email as string,
    };
  } catch {
    return null;
  }
}
