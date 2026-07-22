import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyLineAccessToken, fetchLineProfile } from "@/lib/line";

export const runtime = "nodejs";

/**
 * POST /api/line/liff-login  { accessToken }
 * แลก LIFF access token → Supabase session
 * 1) verify token กับ LINE + ดึงโปรไฟล์
 * 2) หา/สร้างผู้ใช้ Supabase (ผูก line_user_id)
 * 3) คืน email + OTP ให้ client เรียก verifyOtp เพื่อรับ session
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
  const email = `line_${profile.userId}@line.local`;

  // 3) หา/สร้างผู้ใช้ (ผูกด้วย line_user_id)
  const { data: existing } = await admin.from("profiles").select("id").eq("line_user_id", profile.userId).maybeSingle();
  if (!existing) {
    const { error: createErr } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { name: profile.displayName, role: "seller", line_user_id: profile.userId },
    });
    if (createErr && !/already/i.test(createErr.message)) {
      return NextResponse.json({ error: createErr.message }, { status: 500 });
    }
  }

  // 4) magic-link OTP → ให้ client แลกเป็น session
  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (linkErr || !link?.properties?.email_otp) {
    return NextResponse.json({ error: linkErr?.message ?? "สร้าง session ไม่สำเร็จ" }, { status: 500 });
  }
  return NextResponse.json({ email, otp: link.properties.email_otp });
}
