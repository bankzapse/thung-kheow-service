import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Health check สาธารณะ — คืนแค่ ok/mode/rev (พอสำหรับ uptime monitor)
 * 🔒 ไม่เปิดเผยผังว่ามี secret ตัวไหนตั้งไว้แล้วบ้าง / hint การตั้งค่า / LINE channel id
 *    รายละเอียดวินิจฉัย config ย้ายไป GET /api/health/detail (ต้องมี header x-health-secret)
 */
export async function GET() {
  const supabase = Boolean((process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim());
  return NextResponse.json({
    ok: true,
    mode: supabase ? "supabase" : "demo",
    rev: (process.env.VERCEL_GIT_COMMIT_SHA ?? "local").slice(0, 7),
  });
}
