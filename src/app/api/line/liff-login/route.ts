import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyLineAccessToken, fetchLineProfile } from "@/lib/line";

export const runtime = "nodejs";

/**
 * POST /api/line/liff-login  { accessToken }
 * แลก LIFF access token → Supabase session (เฉพาะคนที่ผูกบัญชีไว้แล้ว)
 *
 * ⚠️ ไม่สร้างบัญชีให้อัตโนมัติอีกแล้ว — เดิมสร้างเลยทำให้ได้บัญชีที่
 *    ไม่มีเบอร์ (โอนเงินไม่ได้ · กู้บัญชีไม่ได้) และไม่มีบันทึกคำยินยอม (PDPA)
 *    ยังไม่ผูก → คืน { needsSetup: true } ให้ client พาไปหน้ายืนยันเบอร์
 *    แล้วจบที่ POST /api/line/complete-signup
 */
export async function POST(req: Request) {
  const { accessToken } = await req.json().catch(() => ({}));
  if (!accessToken) return NextResponse.json({ error: "missing accessToken" }, { status: 400 });
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ error: "Supabase admin ยังไม่ตั้งค่า" }, { status: 500 });
  }

  // 1) 🔒 verify ว่า access token ถูกออกให้ "channel ของเรา" จริง (ดู lib/line.ts)
  const v = await verifyLineAccessToken(accessToken);
  if (!v.ok) return NextResponse.json({ error: "LINE token ไม่ถูกต้อง" }, { status: 401 });

  // 2) profile จาก LINE
  const profile = await fetchLineProfile(accessToken);
  if (!profile) return NextResponse.json({ error: "อ่านโปรไฟล์ LINE ไม่สำเร็จ" }, { status: 502 });

  const admin = createAdminClient();

  // 3) ผูกบัญชีไว้หรือยัง — ยังไม่ผูก = ต้องไปยืนยันเบอร์ + ให้ความยินยอมก่อน
  const { data: existing } = await admin.from("profiles").select("id").eq("line_user_id", profile.userId).maybeSingle();
  if (!existing) {
    return NextResponse.json({ needsSetup: true, displayName: profile.displayName });
  }

  // 4) magic-link OTP → ให้ client แลกเป็น session
  // ต้องใช้อีเมล "จริง" ของ auth user — คนที่สมัครด้วยเบอร์แล้วมาผูก LINE ทีหลัง
  // จะไม่ใช่ line_<id>@line.local (ดู /api/line/link ที่เติมอีเมลให้ถ้ายังไม่มี)
  const { data: au } = await admin.auth.admin.getUserById((existing as { id: string }).id);
  const email = au?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "บัญชีนี้ยังเข้าผ่าน LINE ไม่ได้ — ลองเชื่อมบัญชีใหม่อีกครั้ง" }, { status: 409 });
  }
  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (linkErr || !link?.properties?.email_otp) {
    return NextResponse.json({ error: linkErr?.message ?? "สร้าง session ไม่สำเร็จ" }, { status: 500 });
  }
  return NextResponse.json({ email, otp: link.properties.email_otp });
}
