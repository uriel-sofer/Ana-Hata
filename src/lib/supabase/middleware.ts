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
          cookiesToSet.forEach(({ name, value }) =>
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
    pathname.startsWith("/calendar") ||
    pathname.startsWith("/approvals") ||
    pathname.startsWith("/settings");
  const isTherapistRoute = pathname.startsWith("/therapist");

  const loginUrl = () => {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  };

  if (!user && (isAdminRoute || isTherapistRoute)) return loginUrl();

  if (user && (isAdminRoute || isTherapistRoute)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role;
    if (isAdminRoute && role !== "admin") return loginUrl();
    if (isTherapistRoute && role !== "therapist" && role !== "admin") return loginUrl();
  }

  return supabaseResponse;
}
