import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Health รายละเอียด (config/secret map + hint) — เฉพาะผู้ที่มี header ลับ
 * 🔒 ต้องส่ง header  x-health-secret = <HEALTH_SECRET>  (แบบเดียวกับ /api/push/hook)
 *    ไม่ตั้ง HEALTH_SECRET = ปิด endpoint นี้ (คืน 404) — กันเผลอเปิดผังของลับสาธารณะ
 * ค่าเป็น boolean ว่ามี secret ตั้งไว้ไหม ไม่ได้คืนตัว secret จริง
 */
export async function GET(req: Request) {
  const secret = process.env.HEALTH_SECRET?.trim();
  if (!secret || req.headers.get("x-health-secret") !== secret) {
    return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  }

  const has = (v?: string) => Boolean(v && v.trim());
  const supabase = has(process.env.NEXT_PUBLIC_SUPABASE_URL) && has(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  const serviceRole = has(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const smsok = has(process.env.SMSOK_API_KEY) && has(process.env.SMSOK_API_SECRET);
  const otpSecret = has(process.env.OTP_SECRET);
  const otpReady = otpSecret; // ไม่มี fallback แล้ว (ดู lib/otp.ts) — ต้องตั้ง OTP_SECRET เอง

  const liffId = process.env.NEXT_PUBLIC_LIFF_ID?.trim() || null;
  const lineChannelId = process.env.LINE_LOGIN_CHANNEL_ID?.trim() || null;
  const canLineLogin = Boolean(liffId && lineChannelId && supabase && serviceRole);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || null;

  const mode = supabase ? "supabase" : "demo";
  const canSellerOtp = mode === "demo" ? true : smsok && otpReady;

  return NextResponse.json({
    ok: true,
    mode,
    rev: (process.env.VERCEL_GIT_COMMIT_SHA ?? "local").slice(0, 7),
    canSellerOtp,
    canLineLogin,
    smsSender: process.env.SMSOK_SENDER?.trim() || null,
    line: {
      liffId,
      lineChannelId,
      messagingApi: has(process.env.LINE_CHANNEL_ACCESS_TOKEN),
    },
    siteUrl,
    config: { supabase, serviceRole, smsok, otpSecret, otpReady },
    hint: !canSellerOtp
      ? "ผู้ขายจะรับ OTP ไม่ได้ — ตั้ง SMSOK_API_KEY/SMSOK_API_SECRET (Sender อนุมัติ + มียอดเงิน) และ OTP_SECRET"
      : "พร้อมส่ง OTP ให้ผู้ขาย",
  });
}
