import { NextResponse } from "next/server";
import { verifyOtp } from "@/lib/otp";
import { normalizeThaiPhone } from "@/lib/smsok";
import { createAdminClient } from "@/lib/supabase/admin";
import { CONSENT_VERSION } from "@/lib/consent";

export const runtime = "nodejs";

const toE164 = (p: string) => "+66" + p.replace(/^0/, "");
const toBare = (p: string) => "66" + p.replace(/^0/, "");
const MAX_FAILS = 5;
const LOCK_MS = 15 * 60 * 1000;

/**
 * สมัครสมาชิกผู้ขายผ่าน OTP ของแอปเอง (SMS OK) — ไม่พึ่ง Send SMS Hook ของ Supabase (ที่ 404)
 * ยืนยัน OTP ฝั่ง server แล้วสร้างบัญชีด้วย service-role (trigger ตั้ง role=seller)
 * body: { name, phone, email?, password, code, token }
 */
export async function POST(req: Request) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ ok: false, error: "ระบบยังไม่พร้อม" }, { status: 404 });
  }
  const { name, phone, email, password, code, token, consent } = await req.json().catch(() => ({}));
  // PDPA ม.19 — ต้องพิสูจน์ได้ว่าผู้ใช้ยินยอม เดิม checkbox อยู่ฝั่ง client อย่างเดียว
  if (consent !== true) {
    return NextResponse.json({ ok: false, error: "ต้องยอมรับข้อกำหนดและนโยบายความเป็นส่วนตัวก่อน" }, { status: 400 });
  }
  const p = normalizeThaiPhone(String(phone || ""));
  if (String(name || "").trim().length < 2) return NextResponse.json({ ok: false, error: "กรอกชื่อ-นามสกุล" }, { status: 400 });
  if (!/^0\d{8,9}$/.test(p)) return NextResponse.json({ ok: false, error: "เบอร์ไม่ถูกต้อง" }, { status: 400 });
  if (String(password || "").length < 6) return NextResponse.json({ ok: false, error: "รหัสผ่านอย่างน้อย 6 ตัวอักษร" }, { status: 400 });
  if (email && !/^\S+@\S+\.\S+$/.test(String(email).trim())) return NextResponse.json({ ok: false, error: "อีเมลไม่ถูกต้อง" }, { status: 400 });

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const table = (n: string) => (admin as any).from(n);

  // กัน brute-force OTP (ใช้ตารางร่วมกับ reset)
  const { data: th } = await table("otp_throttle").select("fails, locked_until").eq("phone", p).maybeSingle();
  if (th?.locked_until && new Date(th.locked_until).getTime() > Date.now()) {
    return NextResponse.json({ ok: false, error: "พยายามหลายครั้งเกินไป — ลองใหม่ในอีก 15 นาที" }, { status: 429 });
  }
  const v = verifyOtp(p, String(code || "").trim(), String(token || ""));
  if (!v.ok) {
    const fails = (th?.fails ?? 0) + 1;
    const locked = fails >= MAX_FAILS ? new Date(Date.now() + LOCK_MS).toISOString() : null;
    await table("otp_throttle").upsert({ phone: p, fails, locked_until: locked, updated_at: new Date().toISOString() });
    return NextResponse.json({ ok: false, error: v.error ?? "รหัส OTP ไม่ถูกต้องหรือหมดอายุ" }, { status: 400 });
  }

  // กันเบอร์ซ้ำ
  const { data: dup } = await table("profiles").select("id").or(`phone.eq.${toBare(p)},phone.eq.${p}`).limit(1);
  if ((dup as unknown[] | null)?.length) return NextResponse.json({ ok: false, error: "เบอร์นี้มีบัญชีอยู่แล้ว — เข้าสู่ระบบได้เลย" }, { status: 409 });

  const { data: created, error } = await admin.auth.admin.createUser({
    phone: toE164(p), password: String(password), phone_confirm: true,
    email: email ? String(email).trim() : undefined, email_confirm: email ? true : undefined,
    user_metadata: { name: String(name).trim(), role: "seller" }, // role ถูก trigger บังคับ seller อยู่แล้ว
  });
  if (error) return NextResponse.json({ ok: false, error: /registered|already|exists|duplicate/i.test(error.message) ? "เบอร์นี้มีบัญชีอยู่แล้ว" : error.message }, { status: 400 });

  // บันทึกคำยินยอม (client เขียนคอลัมน์นี้เองไม่ได้ — ถูก trigger ตรึงไว้)
  if (created?.user) {
    await table("profiles").update({
      consent_at: new Date().toISOString(),
      consent_version: CONSENT_VERSION,
      consent_source: "register",
    }).eq("id", created.user.id);
  }

  await table("otp_throttle").delete().eq("phone", p);
  return NextResponse.json({ ok: true });
}
