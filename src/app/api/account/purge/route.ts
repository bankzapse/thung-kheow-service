import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/supabase/audit";

export const runtime = "nodejs";

/**
 * ลบบัญชีที่ soft-delete แล้วแบบถาวร หลังพ้นช่วง grace (default 30 วัน)
 *   · ลบผ่าน GoTrue admin API (วิธีที่ถูกต้อง) → cascade ลบ profile + ข้อมูลทั้งหมด
 *
 * เรียกได้ 2 ทาง:
 *   · Vercel Cron (GET) — auth อัตโนมัติด้วย header  Authorization: Bearer <CRON_SECRET>
 *   · เรียกมือ (GET/POST) — header  x-purge-secret: <ACCOUNT_PURGE_SECRET>
 *   ไม่ตั้ง secret ทั้งคู่ = ปิด (401)
 *   ปรับ grace: ?days=30 (ขั้นต่ำ 7)
 */
const MAX_BATCH = 200;

function authorized(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.get("authorization") === `Bearer ${cronSecret}`) return true; // Vercel Cron
  const purgeSecret = process.env.ACCOUNT_PURGE_SECRET;
  if (purgeSecret && req.headers.get("x-purge-secret") === purgeSecret) return true; // เรียกมือ
  return false;
}

async function handle(req: Request) {
  if (!authorized(req)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
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

// Vercel Cron ยิงแบบ GET · เรียกมือได้ทั้ง GET/POST
export const GET = handle;
export const POST = handle;
