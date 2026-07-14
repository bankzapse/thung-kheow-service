import { NextResponse } from "next/server";
import { verifyOtp } from "@/lib/otp";
import { normalizeThaiPhone } from "@/lib/smsok";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const toE164Bare = (p: string) => "66" + p.replace(/^0/, "");
const MAX_FAILS = 5;
const LOCK_MS = 15 * 60 * 1000;

/**
 * ตั้งรหัสผ่านใหม่หลังยืนยัน OTP (ผ่านระบบ OTP ของแอป — ไม่พึ่ง Send SMS Hook ของ Supabase)
 * ป้องกัน brute-force ด้วยตาราง otp_throttle (ล็อก 15 นาทีเมื่อพลาด 5 ครั้ง) + ห้ามรีเซ็ตบัญชีผู้ดูแล
 */
export async function POST(req: Request) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ ok: false, error: "ระบบยังไม่พร้อม" }, { status: 404 });
  }
  const { phone, password, code, token } = await req.json().catch(() => ({}));
  const p = normalizeThaiPhone(String(phone || ""));
  if (!/^0\d{8,9}$/.test(p)) return NextResponse.json({ ok: false, error: "เบอร์ไม่ถูกต้อง" }, { status: 400 });
  if (String(password || "").length < 6) return NextResponse.json({ ok: false, error: "รหัสผ่านอย่างน้อย 6 ตัวอักษร" }, { status: 400 });

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const table = (n: string) => (admin as any).from(n);

  // 1) กัน brute-force: ถ้าถูกล็อกอยู่ → ปฏิเสธ
  const { data: th } = await table("otp_throttle").select("fails, locked_until").eq("phone", p).maybeSingle();
  if (th?.locked_until && new Date(th.locked_until).getTime() > Date.now()) {
    return NextResponse.json({ ok: false, error: "พยายามหลายครั้งเกินไป — ลองใหม่ในอีก 15 นาที" }, { status: 429 });
  }

  // 2) ยืนยัน OTP — พลาดแล้วนับครั้ง/ล็อก
  const v = verifyOtp(p, String(code || "").trim(), String(token || ""));
  if (!v.ok) {
    const fails = (th?.fails ?? 0) + 1;
    const locked = fails >= MAX_FAILS ? new Date(Date.now() + LOCK_MS).toISOString() : null;
    await table("otp_throttle").upsert({ phone: p, fails, locked_until: locked, updated_at: new Date().toISOString() });
    return NextResponse.json({ ok: false, error: v.error ?? "รหัส OTP ไม่ถูกต้องหรือหมดอายุ" }, { status: 400 });
  }

  // 3) หาบัญชีจากเบอร์ + ห้ามรีเซ็ตบัญชีผู้ดูแล/เจ้าของระบบผ่านช่องทางนี้
  const { data } = await table("profiles").select("id, role, owner").or(`phone.eq.${toE164Bare(p)},phone.eq.${p}`).limit(1);
  const row = (data as { id: string; role?: string; owner?: boolean }[] | null)?.[0];
  if (!row?.id) return NextResponse.json({ ok: false, error: "ไม่พบบัญชีสำหรับเบอร์นี้" }, { status: 404 });
  if (row.owner === true || row.role === "admin") {
    return NextResponse.json({ ok: false, error: "บัญชีผู้ดูแลรีเซ็ตผ่านช่องทางนี้ไม่ได้ — ติดต่อผู้ดูแลระบบ" }, { status: 403 });
  }

  const { error } = await admin.auth.admin.updateUserById(row.id, { password: String(password) });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  await table("otp_throttle").delete().eq("phone", p); // สำเร็จ → ล้างตัวนับ
  return NextResponse.json({ ok: true });
}
