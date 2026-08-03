import { NextResponse } from "next/server";
import { verifyOtp } from "@/lib/otp";
import { normalizeThaiPhone } from "@/lib/smsok";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";

export const runtime = "nodejs";

const toE164 = (p: string) => "+66" + p.replace(/^0/, "");
const toBare = (p: string) => "66" + p.replace(/^0/, "");
const MAX_FAILS = 5;
const LOCK_MS = 15 * 60 * 1000;

/**
 * POST /api/profile/verify-phone — ยืนยันเบอร์ของตัวเองด้วย OTP → ตั้ง phone_verified=true
 * body: { phone, code, token }
 * ใช้กับด่าน "verify เบอร์ก่อนถอนครั้งแรก"
 */
export async function POST(req: Request) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ ok: false, error: "ระบบยังไม่พร้อม" }, { status: 404 });
  }
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const caller = auth?.user;
  if (!caller) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const { phone, code, token } = await req.json().catch(() => ({}));
  const p = normalizeThaiPhone(String(phone || ""));
  if (!/^0\d{8,9}$/.test(p)) return NextResponse.json({ ok: false, error: "เบอร์ไม่ถูกต้อง" }, { status: 400 });

  const admin = createAdminClient();
  const table = <T extends keyof Database["public"]["Tables"]>(n: T) => admin.from(n);

  // นับครั้งผิดร่วมตาราง otp_throttle เดียวกับ register/reset
  const { data: th } = await table("otp_throttle").select("fails, locked_until").eq("phone", p).maybeSingle();
  if (th?.locked_until && new Date(th.locked_until).getTime() > Date.now()) {
    return NextResponse.json({ ok: false, error: "พยายามหลายครั้งเกินไป — ลองใหม่ในอีก 15 นาที" }, { status: 429 });
  }
  const res = verifyOtp(p, String(code || "").trim(), String(token || ""));
  if (!res.ok) {
    const fails = (th?.fails ?? 0) + 1;
    const locked = fails >= MAX_FAILS ? new Date(Date.now() + LOCK_MS).toISOString() : null;
    await table("otp_throttle").upsert({ phone: p, fails, locked_until: locked, updated_at: new Date().toISOString() });
    return NextResponse.json({ ok: false, error: res.error ?? "รหัส OTP ไม่ถูกต้องหรือหมดอายุ" }, { status: 400 });
  }
  await table("otp_throttle").delete().eq("phone", p);

  // เบอร์ที่ verify ต้องเป็นเบอร์ของบัญชีนี้เอง (กัน verify เบอร์คนอื่น) — เทียบกับ profiles.phone
  const { data: me } = await table("profiles").select("phone").eq("id", caller.id).maybeSingle();
  const myPhone = (me?.phone ?? "").replace(/\D/g, "");
  if (myPhone && myPhone !== toBare(p) && myPhone !== p) {
    return NextResponse.json({ ok: false, error: "เบอร์ที่ยืนยันไม่ตรงกับเบอร์ในบัญชี — แก้เบอร์ให้ตรงก่อน" }, { status: 400 });
  }

  // ยืนยันสำเร็จ → set verified + sync auth phone_confirm
  await admin.auth.admin.updateUserById(caller.id, { phone: toE164(p), phone_confirm: true });
  const { error: eProf } = await table("profiles").update({ phone: toBare(p), phone_verified: true }).eq("id", caller.id);
  if (eProf) return NextResponse.json({ ok: false, error: eProf.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
