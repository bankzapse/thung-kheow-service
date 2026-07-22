import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";

const homeFor = (role?: string) => (role === "admin" ? "/admin" : "/home");

const isPublic = (path: string) =>
  path === "/" ||
  // ไฟล์ที่ bot/เบราว์เซอร์ต้องเข้าถึงได้เสมอ — ถ้าโดนเด้งไป /login
  // Googlebot จะอ่าน robots/sitemap ไม่ได้ และ PWA จะติดตั้งไม่ได้
  path === "/robots.txt" ||
  path === "/sitemap.xml" ||
  path === "/manifest.webmanifest" ||
  path.startsWith("/opengraph-image") ||
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
/**
 * ปลายทางจาก ?liff.state= — LIFF โหลด "หน้าแรก" พร้อมพารามิเตอร์นี้ก่อนเสมอ
 * แล้วค่อยพาไปหน้าจริง ถ้าปล่อยให้ redirect ฝั่ง client ผู้ใช้จะเห็นหน้าการตลาด
 * แวบหนึ่ง (ต้องรอโหลด HTML + JS + hydrate ก่อน) → ดักที่ middleware แทน ไม่มีแวบ
 *
 * เขียนตัวกรองไว้ตรงนี้เอง ไม่ import จาก lib/utils เพื่อไม่ให้ middleware bundle
 * ต้องลาก clsx/tailwind-merge ติดมาด้วย
 */
function liffTarget(request: NextRequest): string | null {
  if (request.nextUrl.pathname !== "/") return null;
  const raw = request.nextUrl.searchParams.get("liff.state");
  if (!raw) return null;
  const s = raw.trim();
  // 🔒 กัน open redirect: "//evil.com" กับ "/\evil.com" เบราว์เซอร์อ่านเป็นโดเมนภายนอก
  if (!s.startsWith("/") || s.startsWith("//") || s.startsWith("/\\")) return null;
  if (s === "/" || /^\/(login|register|forgot-password|auth)(\/|\?|$)/.test(s)) return null;
  return s;
}

export async function updateSession(request: NextRequest) {
  // ทำก่อนทุกอย่าง — ไม่ต้องรอตรวจ session ด้วยซ้ำ (ปลายทางจะถูกตรวจในรอบถัดไปเอง)
  const liffPath = liffTarget(request);
  if (liffPath) return NextResponse.redirect(new URL(liffPath, request.url));

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
    // ยังไม่ล็อกอิน → ไปหน้าล็อกอิน พร้อมจำปลายทางไว้ (?next=) ให้กลับมาที่เดิมได้
    // สำคัญกับ deep link เช่น LINE rich menu ที่ลิงก์ตรงมา /points, /drop
    // (ปลายทางถูกกรองอีกชั้นด้วย safeNextPath ฝั่ง client ก่อนใช้จริง)
    if (!user) {
      const nextPath = path + request.nextUrl.search;
      return redirectTo(`/login?next=${encodeURIComponent(nextPath)}`);
    }
    if (path.startsWith("/admin") && role !== "admin") return redirectTo(homeFor(role));
    if (path.startsWith("/shop") && role !== "buyer") return redirectTo(homeFor(role));
    // แอดมินไม่ควรอยู่ในแอปมือถือ → ส่งไป /admin
    if (role === "admin" && !path.startsWith("/admin")) return redirectTo("/admin");
  }

  return response;
}
