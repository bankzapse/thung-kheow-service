import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyLineAccessToken, fetchLineProfile } from "@/lib/line";

export const runtime = "nodejs";

/**
 * POST /api/line/link — ผูกบัญชี LINE เข้ากับผู้ใช้ที่ล็อกอินอยู่
 * body: { accessToken }  (จาก liff.getAccessToken())
 *
 * ใช้ตอนผู้ใช้เดิม (สมัครด้วยเบอร์) กด "เชื่อมบัญชี LINE" — ทำให้ครั้งหน้า
 * ล็อกอินผ่าน LIFF ได้เลย และไม่เกิดบัญชีซ้ำ
 *
 * 🔒 line_user_id ถูก trigger ตรึงไม่ให้ client เขียนเอง (ดู migration line_identity)
 * จึงต้องผ่าน route นี้ ซึ่งตรวจ token กับ LINE ก่อนแล้วเขียนด้วย service-role
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const { accessToken } = await req.json().catch(() => ({}));
  if (!accessToken) return NextResponse.json({ ok: false, error: "missing accessToken" }, { status: 400 });

  // ตรวจว่า token ออกให้ channel ของเราจริง แล้วค่อยเชื่อโปรไฟล์
  const v = await verifyLineAccessToken(String(accessToken));
  if (!v.ok) return NextResponse.json({ ok: false, error: "LINE token ไม่ถูกต้อง" }, { status: 401 });
  const profile = await fetchLineProfile(String(accessToken));
  if (!profile) return NextResponse.json({ ok: false, error: "อ่านโปรไฟล์ LINE ไม่สำเร็จ" }, { status: 502 });

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const table = (n: string) => (admin as any).from(n);

  // LINE บัญชีนี้ถูกผูกกับ user อื่นไปแล้วหรือยัง
  const { data: taken } = await table("profiles").select("id").eq("line_user_id", profile.userId).maybeSingle();
  const owner = (taken as { id?: string } | null)?.id;
  if (owner && owner !== auth.user.id) {
    return NextResponse.json(
      { ok: false, error: "บัญชี LINE นี้ถูกผูกกับผู้ใช้อื่นแล้ว" },
      { status: 409 },
    );
  }

  const { error } = await table("profiles")
    .update({ line_user_id: profile.userId, line_connected: true })
    .eq("id", auth.user.id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  // การล็อกอินผ่าน LIFF ใช้ magic-link ซึ่งต้องมีอีเมล — บัญชีที่สมัครด้วยเบอร์ยังไม่มี
  // เติมให้ (ถ้ายังไม่มี) ไม่งั้นผูกแล้วแต่ครั้งหน้ากดเข้าด้วย LINE จะไม่ผ่าน
  if (!auth.user.email) {
    await admin.auth.admin.updateUserById(auth.user.id, {
      email: `line_${profile.userId}@line.local`,
      email_confirm: true,
    });
  }

  return NextResponse.json({ ok: true, displayName: profile.displayName });
}
