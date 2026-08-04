import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/supabase/audit";

/**
 * ลบบัญชีตัวเอง (in-app account deletion) — บังคับโดย App Store / Play
 *
 * Soft-delete (กู้คืนได้ในช่วง grace) แทนการลบถาวรทันที:
 *   1) set profiles.deleted_at = now() (service-role → guard ไม่ตรึง)
 *   2) ban auth user → ล็อกอินไม่ได้อีก (ทั้ง password และ token refresh)
 *   3) sign out session ปัจจุบัน
 * ข้อมูลยังอยู่ (กู้คืนได้) · ลบถาวรจริงทำภายหลังผ่าน /api/account/purge หลังพ้น grace
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
  const { data: prof } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();

  // 1) mark soft-deleted
  const { error: markErr } = await admin.from("profiles").update({ deleted_at: new Date().toISOString() }).eq("id", user.id);
  if (markErr) {
    return NextResponse.json({ error: markErr.message }, { status: 500 });
  }

  // 2) ban ผู้ใช้ → ล็อกอินไม่ได้ (ยาว ๆ; ยกเลิกได้ด้วย ban_duration: 'none' ตอนกู้คืน)
  const { error: banErr } = await admin.auth.admin.updateUserById(user.id, { ban_duration: "876000h" });
  if (banErr) {
    // ban ไม่สำเร็จ → ย้อน deleted_at กลับ เพื่อไม่ให้ค้างสถานะครึ่ง ๆ กลาง ๆ (ล็อกอินได้แต่ถูกมาร์กลบ)
    await admin.from("profiles").update({ deleted_at: null }).eq("id", user.id);
    return NextResponse.json({ error: banErr.message }, { status: 500 });
  }

  // 📝 audit — auth user ยังอยู่ (แค่ ban) → actor_id ใช้ได้ตามปกติ
  await logAudit(admin, {
    actorId: user.id,
    actorRole: prof?.role ?? null,
    action: "account.soft_delete",
    targetType: "profile",
    targetId: user.id,
    summary: "ผู้ใช้ลบบัญชีตัวเอง (soft-delete · กู้คืนได้ในช่วง grace)",
  });

  // 3) ออกจากระบบ session ปัจจุบัน
  await supabase.auth.signOut().catch(() => {});
  return NextResponse.json({ ok: true });
}
