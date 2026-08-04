import "server-only"; // 🔒 เขียน audit ด้วย service-role เท่านั้น ห้าม import ฝั่ง client
import * as Sentry from "@sentry/nextjs";
import type { createAdminClient } from "./admin";

/**
 * บันทึก audit log การกระทำที่อ่อนไหว (เงิน/บัญชี/สิทธิ์)
 * — เขียนผ่าน service-role (bypass RLS) · เป็น append-only ตรวจย้อนหลังได้
 *
 * ⚠️ ห้ามใส่ PII/รหัสผ่านใน metadata — ให้ใส่แค่ตัวระบุ (id/จำนวน/โค้ด)
 * audit ต้องไม่ทำให้ action หลักพัง → ถ้า insert ล้มเหลว กลืน error แล้วส่งขึ้น Sentry แทน
 */
export interface AuditEntry {
  actorId: string | null;
  actorRole?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  summary?: string | null;
  metadata?: Record<string, unknown> | null;
}

export async function logAudit(admin: ReturnType<typeof createAdminClient>, e: AuditEntry): Promise<void> {
  try {
    const { error } = await admin.from("audit_logs").insert({
      actor_id: e.actorId,
      actor_role: e.actorRole ?? null,
      action: e.action,
      target_type: e.targetType ?? null,
      target_id: e.targetId != null ? String(e.targetId) : null,
      summary: e.summary ?? null,
      metadata: (e.metadata ?? null) as never,
    });
    if (error) throw new Error(error.message);
  } catch (err) {
    Sentry.captureException(err, { tags: { scope: "audit", audit_action: e.action } });
  }
}
