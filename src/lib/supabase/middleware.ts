import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refresca la sesión Supabase en cada request y aplica route guards:
 * - /app/**  → requiere sesión. Si no, redirige a /login.
 * - /login   → si hay sesión, redirige a /app.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const url = request.nextUrl.clone();

  if (url.pathname.startsWith("/app") && !user) {
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (url.pathname === "/login" && user) {
    url.pathname = "/app";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
