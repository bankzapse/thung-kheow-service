import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Health / config check — บอกว่า env/config ครบไหม (คืนค่าเป็น boolean เท่านั้น ไม่เปิดเผย secret)
 * ใช้เช็คบน production ว่าทำไมส่ง OTP/สมัครไม่ได้ เช่น GET /api/health
 * ถ้า smsHook=false → ผู้ขายจะรับ OTP ไม่ได้ (Supabase Send SMS Hook ยังไม่พร้อม)
 */
export async function GET() {
  const has = (v?: string) => Boolean(v && v.trim());
  const supabase = has(process.env.NEXT_PUBLIC_SUPABASE_URL) && has(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  const serviceRole = has(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const smsok = has(process.env.SMSOK_API_KEY) && has(process.env.SMSOK_API_SECRET);
  const smsHook = has(process.env.SEND_SMS_HOOK_SECRET); // Supabase Send SMS Hook signing secret
  const otpSecret = has(process.env.OTP_SECRET); // ใช้เฉพาะโหมดเดโม (stateless OTP)

  const mode = supabase ? "supabase" : "demo";
  // ผู้ขายจะสมัคร/รับ OTP ได้ก็ต่อเมื่อ: โหมดเดโม (ข้าม OTP ได้) หรือ โหมด Supabase + hook ครบ + SMS OK ครบ
  const canSellerOtp = mode === "demo" ? true : smsHook && smsok;

  return NextResponse.json({
    ok: true,
    mode,
    rev: (process.env.VERCEL_GIT_COMMIT_SHA ?? "local").slice(0, 7), // commit ที่ deploy อยู่
    canSellerOtp,
    config: { supabase, serviceRole, smsok, smsHook, otpSecret },
    hint: canSellerOtp
      ? "พร้อมส่ง OTP ให้ผู้ขาย"
      : "ผู้ขายจะรับ OTP ไม่ได้ — ตั้ง SEND_SMS_HOOK_SECRET + เปิด Send SMS Hook ใน Supabase และตรวจ SMS OK (Sender อนุมัติ + มียอดเงิน)",
  });
}
