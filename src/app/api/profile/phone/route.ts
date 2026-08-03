import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import { normalizeThaiPhone } from "@/lib/smsok";
import { phoneOrFilter } from "@/lib/phone";

export const runtime = "nodejs";

const toE164 = (p: string) => "+66" + p.replace(/^0/, "");
const toBare = (p: string) => "66" + p.replace(/^0/, "");

/**
 * POST /api/profile/phone  — ผู้ใช้แก้เบอร์ของตัวเอง
 * body: { phone }
 *
 * เบอร์ไม่ได้ถูก guard ให้ client เขียนตรง (freeze แล้ว) → ต้องผ่าน endpoint นี้เพื่อ:
 *  1) เช็คว่าเบอร์ไม่ซ้ำกับบัญชีอื่น (กันชนกัน → flow ค้นบัญชีจากเบอร์เพี้ยน)
 *  2) ซิงค์ auth.users.phone ให้ตรงกับ profiles.phone
 *  3) ตั้ง phone_verified = false (เพราะเปลี่ยนเบอร์ = ยังไม่ยืนยัน → ต้อง verify ก่อนถอน)
 */
export async function POST(req: Request) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ ok: false, error: "ระบบยังไม่พร้อม" }, { status: 404 });
  }
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const caller = auth?.user;
  if (!caller) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const { phone } = await req.json().catch(() => ({}));
  const p = normalizeThaiPhone(String(phone || ""));
  if (!/^0\d{8,9}$/.test(p)) return NextResponse.json({ ok: false, error: "เบอร์ไม่ถูกต้อง" }, { status: 400 });

  const admin = createAdminClient();
  const table = <T extends keyof Database["public"]["Tables"]>(n: T) => admin.from(n);

  // 1) กันเบอร์ซ้ำ (บัญชีอื่น)
  const { data: dup } = await table("profiles")
    .select("id")
    .or(phoneOrFilter(p))
    .neq("id", caller.id)
    .limit(1);
  if ((dup as { id: string }[] | null)?.length) {
    return NextResponse.json({ ok: false, error: "เบอร์นี้มีบัญชีอื่นใช้อยู่แล้ว" }, { status: 409 });
  }

  // 2) ซิงค์ auth.users.phone (unverified) — ถ้าเบอร์ชนใน auth จะ error ตรงนี้
  const { error: eAuth } = await admin.auth.admin.updateUserById(caller.id, { phone: toE164(p), phone_confirm: false });
  if (eAuth) {
    const m = eAuth.message ?? "อัปเดตเบอร์ไม่สำเร็จ";
    return NextResponse.json({ ok: false, error: /registered|already|exists|duplicate/i.test(m) ? "เบอร์นี้มีบัญชีอื่นใช้อยู่แล้ว" : m }, { status: 400 });
  }

  // 3) เขียน profiles.phone + phone_verified=false (service-role → ผ่าน guard)
  const { error: eProf } = await table("profiles").update({ phone: toBare(p), phone_verified: false }).eq("id", caller.id);
  if (eProf) return NextResponse.json({ ok: false, error: eProf.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
