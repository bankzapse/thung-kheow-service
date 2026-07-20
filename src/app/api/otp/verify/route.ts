import { NextResponse } from "next/server";
import { verifyOtp } from "@/lib/otp";
import { normalizeThaiPhone } from "@/lib/smsok";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const MAX_FAILS = 5;
const LOCK_MS = 15 * 60 * 1000;

/**
 * ยืนยัน OTP (ใช้โดยหน้าที่ไม่ได้สร้างบัญชี/เปลี่ยนรหัสผ่านทันที)
 *
 * 🔒 ต้องนับครั้งผิดร่วมตาราง otp_throttle เดียวกับ register/reset-password
 * เดิม endpoint นี้ไม่มี throttle เลย → เป็น oracle ให้เดารหัส 6 หลักได้ไม่จำกัด
 * ภายใน TTL 5 นาที (โทเคนเป็น HMAC ไร้สถานะ เดาผิดกี่ครั้งก็ยังใช้ได้)
 * แล้วเอาโค้ดที่เดาถูกไปยิง reset-password ครั้งเดียวโดยไม่โดนล็อก
 */
export async function POST(req: Request) {
  const { phone, code, token } = await req.json().catch(() => ({}));
  const p = normalizeThaiPhone(String(phone || ""));
  if (!/^0\d{8,9}$/.test(p)) return NextResponse.json({ ok: false, error: "invalid phone" }, { status: 400 });

  const hasDb = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const table = hasDb ? (n: string) => (createAdminClient() as any).from(n) : null;

  if (table) {
    const { data: th } = await table("otp_throttle").select("fails, locked_until").eq("phone", p).maybeSingle();
    if (th?.locked_until && new Date(th.locked_until).getTime() > Date.now()) {
      return NextResponse.json({ ok: false, error: "พยายามหลายครั้งเกินไป — ลองใหม่ในอีก 15 นาที" }, { status: 429 });
    }
    const res = verifyOtp(p, String(code || "").trim(), String(token || ""));
    if (!res.ok) {
      const fails = (th?.fails ?? 0) + 1;
      const locked = fails >= MAX_FAILS ? new Date(Date.now() + LOCK_MS).toISOString() : null;
      await table("otp_throttle").upsert({ phone: p, fails, locked_until: locked, updated_at: new Date().toISOString() });
      return NextResponse.json({ ok: false, error: res.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }

  // ไม่มี DB (โหมดเดโม) — ยังตรวจลายเซ็นตามปกติ แต่ไม่มีที่เก็บตัวนับ
  const res = verifyOtp(p, String(code || "").trim(), String(token || ""));
  if (!res.ok) return NextResponse.json({ ok: false, error: res.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
