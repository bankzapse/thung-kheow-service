import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Next 16: ใช้ convention ไฟล์ "proxy" แทน "middleware" (เดิม middleware.ts)
// ทำหน้าที่รีเฟรช session ของ Supabase ทุก request (ยกเว้น static assets ด้านล่าง)
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // ทุกเส้นทาง ยกเว้น static assets
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
