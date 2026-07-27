import { NextResponse } from "next/server";
import { normalizeThaiPhone } from "@/lib/smsok";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyLineAccessToken, fetchLineProfile } from "@/lib/line";
import { CONSENT_VERSION } from "@/lib/consent";

export const runtime = "nodejs";

const toE164 = (p: string) => "+66" + p.replace(/^0/, "");
const toBare = (p: string) => "66" + p.replace(/^0/, "");

/**
 * POST /api/line/complete-signup
 * body: { accessToken, phone, consent, name? }
 *
 * เข้าใช้ครั้งแรกด้วย LINE (ไม่ต้องใช้ OTP SMS) — ทำในคำขอเดียว:
 *  1) เก็บเบอร์ไว้ (ยังไม่ยืนยัน — ใช้ติดต่อ/โอนเงินตอนแลกคะแนน)
 *  2) สร้างบัญชีใหม่ (ผูกกับ LINE)
 *  3) บันทึกคำยินยอม PDPA (เวลา + เวอร์ชันนโยบาย + ช่องทาง)
 *
 * 🔒 ความปลอดภัย: ไม่ผูกเข้าบัญชีเดิมโดยดูจากเบอร์เพียงอย่างเดียว เพราะไม่มี OTP
 *    พิสูจน์ว่าเป็นเจ้าของเบอร์จริง (กันยึดบัญชีคนอื่นด้วยการพิมพ์เบอร์เขา) →
 *    ถ้าเบอร์ตรงบัญชีเดิม ให้เข้าด้วยเบอร์+รหัสผ่าน แล้วผูก LINE ในหน้าโปรไฟล์
 *    (/api/line/link ซึ่งต้องล็อกอินก่อน = ทางผูกที่ปลอดภัย)
 *
 * 🔒 ไม่เชื่อ userId ที่ client ส่งมา — verify access token กับ LINE ใหม่ทุกครั้ง
 */
export async function POST(req: Request) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ ok: false, error: "ระบบยังไม่พร้อม" }, { status: 404 });
  }
  const { accessToken, phone, consent, name } = await req.json().catch(() => ({}));

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

  const consentPatch = {
    consent_at: new Date().toISOString(),
    consent_version: CONSENT_VERSION,
    consent_source: "line",
  };
  const lineEmail = `line_${profile.userId}@line.local`;

  // ── เบอร์นี้มีบัญชีอยู่แล้วไหม ──
  // 🔒 ไม่มี OTP พิสูจน์ความเป็นเจ้าของเบอร์ → ไม่ผูกเข้าบัญชีเดิมอัตโนมัติ (กันยึดบัญชี)
  //    ให้เจ้าของบัญชีเข้าด้วยเบอร์+รหัสผ่าน แล้วผูก LINE เองในหน้าโปรไฟล์
  const { data: found } = await table("profiles")
    .select("id")
    .or(`phone.eq.${toBare(p)},phone.eq.${p}`)
    .limit(1);
  if ((found as { id: string }[] | null)?.length) {
    return NextResponse.json(
      { ok: false, error: "เบอร์นี้มีบัญชีอยู่แล้ว — เข้าสู่ระบบด้วยเบอร์และรหัสผ่าน แล้วผูก LINE ที่หน้าโปรไฟล์ (ถ้าเข้าไม่ได้ ติดต่อผู้ดูแล)" },
      { status: 409 },
    );
  }

  // ── สร้างบัญชีใหม่ (เก็บเบอร์ไว้ แต่ยังไม่ยืนยัน — ไม่ได้ใช้ OTP + ยินยอมแล้ว) ──
  const { data: created, error: eCreate } = await admin.auth.admin.createUser({
    phone: toE164(p),
    phone_confirm: false,
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
