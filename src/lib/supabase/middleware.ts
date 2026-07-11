import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";

const homeFor = (role?: string) => (role === "admin" ? "/admin" : "/home");

const isPublic = (path: string) =>
  path === "/" ||
  path.startsWith("/login") ||
  path.startsWith("/register") ||
  path.startsWith("/forgot-password") ||
  path.startsWith("/terms") ||
  path.startsWith("/privacy") ||
  path.startsWith("/delete-account") ||
  path.startsWith("/auth") ||
  path.startsWith("/api");

/**
 * รีเฟรช session + ป้องกัน route ตาม role (production)
 * ถ้ายังไม่ตั้งค่า env → ข้าม (เดโม localStorage — layout ฝั่ง client คุม role เอง)
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  if (!url || !key) return response;

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const role = (user?.user_metadata?.role as string | undefined) ?? undefined;

  if (!isPublic(path)) {
    const redirectTo = (to: string) => {
      const r = NextResponse.redirect(new URL(to, request.url));
      response.cookies.getAll().forEach((c) => r.cookies.set(c.name, c.value));
      return r;
    };
    if (!user) return redirectTo("/login");
    if (path.startsWith("/admin") && role !== "admin") return redirectTo(homeFor(role));
    if (path.startsWith("/shop") && role !== "buyer") return redirectTo(homeFor(role));
    // แอดมินไม่ควรอยู่ในแอปมือถือ → ส่งไป /admin
    if (role === "admin" && !path.startsWith("/admin")) return redirectTo("/admin");
  }

  return response;
}
