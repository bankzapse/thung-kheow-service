import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/supabase/audit";

/**
 * ลบบัญชีตัวเอง (in-app account deletion) — บังคับโดย App Store / Play
 * ตรวจ session ของผู้เรียก → ลบ auth user ด้วย service_role
 * → cascade ลบ profiles → mesh_bags / point_transactions / redemptions / ฯลฯ ทั้งหมด
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  // อ่านบทบาทก่อนลบ (หลังลบ profile จะหายไปตาม cascade)
  const { data: prof } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();

  const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  // 📝 audit หลังลบสำเร็จ — actor_id = null (auth user ถูกลบแล้ว, กัน FK พัง) เก็บ id ไว้ใน target_id แทน
  await logAudit(admin, {
    actorId: null,
    actorRole: prof?.role ?? null,
    action: "account.delete_self",
    targetType: "profile",
    targetId: user.id,
    summary: "ลบบัญชีตัวเอง (in-app account deletion)",
  });

  await supabase.auth.signOut().catch(() => {});
  return NextResponse.json({ ok: true });
}
