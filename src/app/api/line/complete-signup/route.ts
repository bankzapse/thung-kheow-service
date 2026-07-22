import { NextResponse } from "next/server";
import { verifyOtp } from "@/lib/otp";
import { normalizeThaiPhone } from "@/lib/smsok";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyLineAccessToken, fetchLineProfile } from "@/lib/line";
import { CONSENT_VERSION } from "@/lib/consent";

export const runtime = "nodejs";

const toE164 = (p: string) => "+66" + p.replace(/^0/, "");
const toBare = (p: string) => "66" + p.replace(/^0/, "");
const MAX_FAILS = 5;
const LOCK_MS = 15 * 60 * 1000;

/**
 * POST /api/line/complete-signup
 * body: { accessToken, phone, code, token, consent, name? }
 *
 * ปิดจ๊อบการเข้าใช้ครั้งแรกด้วย LINE — ทำ 3 อย่างในคำขอเดียว:
 *  1) ยืนยันเบอร์ด้วย OTP (จำเป็น: ใช้โอนเงิน · ติดต่อ · กู้บัญชีตอน LINE หาย)
 *  2) เบอร์ตรงกับบัญชีเดิม → ผูก LINE เข้าบัญชีนั้น (กันคะแนนแตกเป็น 2 ก้อน)
 *     ไม่ตรง → สร้างบัญชีใหม่
 *  3) บันทึกคำยินยอม PDPA (เวลา + เวอร์ชันนโยบาย + ช่องทาง)
 *
 * 🔒 ไม่เชื่อ userId ที่ client ส่งมา — verify access token กับ LINE ใหม่ทุกครั้ง
 */
export async function POST(req: Request) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ ok: false, error: "ระบบยังไม่พร้อม" }, { status: 404 });
  }
  const { accessToken, phone, code, token, consent, name } = await req.json().catch(() => ({}));

  if (consent !== true) {
    return NextResponse.json({ ok: false, error: "ต้องยอมรับข้อกำหนดและนโยบายความเป็นส่วนตัวก่อน" }, { status: 400 });
  }
  const p = normalizeThaiPhone(String(phone || ""));
  if (!/^0\d{8,9}$/.test(p)) return NextResponse.json({ ok: false, error: "เบอร์ไม่ถูกต้อง" }, { status: 400 });
  if (!accessToken) return NextResponse.json({ ok: false, error: "missing accessToken" }, { status: 400 });

  // 🔒 token ต้องมาจาก channel ของเราจริง แล้วค่อยเชื่อ userId
  const v = await verifyLineAccessToken(String(accessToken));
  if (!v.ok) return NextResponse.json({ ok: false, error: "LINE token ไม่ถูกต้อง" }, { status: 401 });
  const profile = await fetchLineProfile(String(accessToken));
  if (!profile) return NextResponse.json({ ok: false, error: "อ่านโปรไฟล์ LINE ไม่สำเร็จ" }, { status: 502 });

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const table = (n: string) => (admin as any).from(n);

  // LINE นี้ถูกผูกไปแล้ว → ไม่ต้องทำซ้ำ (กันกดย้อน/ยิงซ้ำ)
  const { data: already } = await table("profiles").select("id").eq("line_user_id", profile.userId).maybeSingle();
  if (already?.id) {
    return NextResponse.json({ ok: false, error: "บัญชี LINE นี้ผูกไว้แล้ว — กดเข้าสู่ระบบด้วย LINE ได้เลย" }, { status: 409 });
  }

  // ── ยืนยัน OTP (นับครั้งผิดร่วมตารางเดียวกับ register/reset) ──
  const { data: th } = await table("otp_throttle").select("fails, locked_until").eq("phone", p).maybeSingle();
  if (th?.locked_until && new Date(th.locked_until).getTime() > Date.now()) {
    return NextResponse.json({ ok: false, error: "พยายามหลายครั้งเกินไป — ลองใหม่ในอีก 15 นาที" }, { status: 429 });
  }
  const ok = verifyOtp(p, String(code || "").trim(), String(token || ""));
  if (!ok.ok) {
    const fails = (th?.fails ?? 0) + 1;
    const locked = fails >= MAX_FAILS ? new Date(Date.now() + LOCK_MS).toISOString() : null;
    await table("otp_throttle").upsert({ phone: p, fails, locked_until: locked, updated_at: new Date().toISOString() });
    return NextResponse.json({ ok: false, error: ok.error ?? "รหัส OTP ไม่ถูกต้องหรือหมดอายุ" }, { status: 400 });
  }
  await table("otp_throttle").delete().eq("phone", p);

  const consentPatch = {
    consent_at: new Date().toISOString(),
    consent_version: CONSENT_VERSION,
    consent_source: "line",
  };
  const lineEmail = `line_${profile.userId}@line.local`;

  // ── มีบัญชีเบอร์นี้อยู่แล้วไหม ──
  const { data: found } = await table("profiles")
    .select("id, line_user_id, role, status")
    .or(`phone.eq.${toBare(p)},phone.eq.${p}`)
    .limit(1);
  const row = (found as { id: string; line_user_id?: string | null; role?: string; status?: string }[] | null)?.[0];

  if (row?.id) {
    // ── ผูก LINE เข้าบัญชีเดิม ──
    if (row.line_user_id) {
      return NextResponse.json(
        { ok: false, error: "เบอร์นี้ผูกกับบัญชี LINE อื่นอยู่แล้ว — ติดต่อผู้ดูแลระบบ" },
        { status: 409 },
      );
    }
    if (row.status === "suspended") {
      return NextResponse.json({ ok: false, error: "บัญชีถูกระงับการใช้งาน" }, { status: 403 });
    }
    // 🔒 ผูกได้เฉพาะบัญชีผู้ขาย — กันคนยึดบัญชีแอดมิน/ศูนย์คัดแยกผ่านช่องทางนี้
    if (row.role && row.role !== "seller") {
      return NextResponse.json(
        { ok: false, error: "บัญชีนี้เข้าผ่าน LINE ไม่ได้ — ใช้เบอร์และรหัสผ่าน" },
        { status: 403 },
      );
    }

    const { data: au } = await admin.auth.admin.getUserById(row.id);
    if (!au?.user?.email) {
      const { error: eMail } = await admin.auth.admin.updateUserById(row.id, { email: lineEmail, email_confirm: true });
      if (eMail) return NextResponse.json({ ok: false, error: eMail.message }, { status: 500 });
    }
    const { error: eUpd } = await table("profiles")
      .update({ line_user_id: profile.userId, line_connected: true, ...consentPatch })
      .eq("id", row.id);
    if (eUpd) return NextResponse.json({ ok: false, error: eUpd.message }, { status: 500 });

    return NextResponse.json({ ok: true, linked: true, email: au?.user?.email ?? lineEmail });
  }

  // ── สร้างบัญชีใหม่ (เบอร์ยืนยันแล้ว + ยินยอมแล้ว) ──
  const { data: created, error: eCreate } = await admin.auth.admin.createUser({
    phone: toE164(p),
    phone_confirm: true,
    email: lineEmail,
    email_confirm: true,
    user_metadata: { name: String(name || profile.displayName || "").trim() || "ผู้ใช้ LINE", role: "seller", line_user_id: profile.userId },
  });
  if (eCreate || !created?.user) {
    const m = eCreate?.message ?? "สร้างบัญชีไม่สำเร็จ";
    return NextResponse.json(
      { ok: false, error: /registered|already|exists|duplicate/i.test(m) ? "เบอร์นี้มีบัญชีอยู่แล้ว" : m },
      { status: 400 },
    );
  }
  // trigger handle_new_user สร้าง profile ให้แล้ว — เติมคำยินยอม (client เขียนเองไม่ได้)
  await table("profiles").update(consentPatch).eq("id", created.user.id);

  return NextResponse.json({ ok: true, linked: false, email: lineEmail });
}
