import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/supabase/audit";

export const runtime = "nodejs";

/**
 * ลบบัญชีที่ soft-delete แล้วแบบถาวร หลังพ้นช่วง grace (default 30 วัน)
 *   · ใช้สำหรับ Vercel Cron / เรียกมือ (ไม่ตั้ง secret = ปิด)
 *   · ลบผ่าน GoTrue admin API (วิธีที่ถูกต้อง) → cascade ลบ profile + ข้อมูลทั้งหมด
 *   เรียกด้วย: POST /api/account/purge  header: x-purge-secret: <ACCOUNT_PURGE_SECRET>
 *   ปรับ grace ได้: ?days=30  (ขั้นต่ำ 7 กันลบเร็วเกิน)
 */
const MAX_BATCH = 200;

export async function POST(req: Request) {
  const secret = process.env.ACCOUNT_PURGE_SECRET;
  if (!secret || req.headers.get("x-purge-secret") !== secret) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ ok: false, error: "not enabled" }, { status: 404 });

  const url = new URL(req.url);
  const days = Math.max(7, Number(url.searchParams.get("days")) || 30); // กันตั้ง grace สั้นเกินไป
  const cutoff = new Date(Date.now() - days * 86400_000).toISOString();

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id, deleted_at")
    .not("deleted_at", "is", null)
    .lt("deleted_at", cutoff)
    .limit(MAX_BATCH);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const targets = data ?? [];
  let purged = 0;
  const failed: string[] = [];
  for (const t of targets) {
    const { error: delErr } = await admin.auth.admin.deleteUser(t.id);
    if (delErr) { failed.push(t.id); continue; }
    purged++;
    // audit: auth user ถูกลบแล้ว → actor_id = null, เก็บ id ใน target_id
    await logAudit(admin, {
      actorId: null,
      actorRole: "system",
      action: "account.purge",
      targetType: "profile",
      targetId: t.id,
      summary: `ลบบัญชีถาวรหลังพ้น grace ${days} วัน`,
      metadata: { deletedAt: t.deleted_at, graceDays: days },
    });
  }

  return NextResponse.json({ ok: true, purged, failed: failed.length, batchCapped: targets.length === MAX_BATCH });
}
