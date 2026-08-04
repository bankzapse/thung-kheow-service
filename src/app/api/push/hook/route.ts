import { NextResponse } from "next/server";
import { sendToUser, pushConfigured } from "@/lib/push";
import { pushText, lineConfigured } from "@/lib/line";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatBaht } from "@/lib/utils";

export const runtime = "nodejs";

/**
 * ปลายทางสำหรับ Supabase Database Webhook — แจ้งเตือนอัตโนมัติ (device push + LINE OA)
 * ตั้งใน Supabase: Database → Webhooks → Create (ใส่ header x-webhook-secret = <PUSH_HOOK_SECRET>)
 *   • point_transactions [INSERT]  → "ได้รับคะแนน" (push)
 *   • redemptions        [UPDATE]  → "โอนเงินแล้ว" / "คำขอถอนไม่สำเร็จ" (push + LINE)
 *   • profiles           [UPDATE]  → "อนุมัติบัญชี" / "บัญชีถูกปฏิเสธ" (LINE)  ← เพิ่มใหม่
 */

/** หา line_user_id ของผู้ใช้ (สำหรับ event ที่ record ไม่มี line_user_id เช่น redemptions) */
async function lineUserIdOf(userId: string): Promise<string | null> {
  try {
    const admin = createAdminClient();
    const { data } = await admin.from("profiles").select("line_user_id").eq("id", userId).maybeSingle();
    return data?.line_user_id ?? null;
  } catch {
    return null;
  }
}

/** แจ้งเตือนผู้ใช้ทั้ง device push (FCM) และ LINE OA เท่าที่ตั้งค่าไว้ (ล้มเหลวช่องไหนไม่กระทบอีกช่อง) */
async function notify(opts: {
  userId: string;
  lineUserId?: string | null;
  push?: { title: string; body: string };
  line?: string;
}) {
  if (pushConfigured && opts.push) {
    try { await sendToUser(opts.userId, opts.push.title, opts.push.body); } catch { /* push ล้ม — ข้าม */ }
  }
  if (lineConfigured && opts.line) {
    const to = opts.lineUserId ?? (await lineUserIdOf(opts.userId));
    if (to) { try { await pushText(to, opts.line); } catch { /* LINE ล้ม — ข้าม */ } }
  }
}

export async function POST(req: Request) {
  const secret = process.env.PUSH_HOOK_SECRET;
  if (!secret || req.headers.get("x-webhook-secret") !== secret) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  // ไม่ตั้งทั้ง push และ LINE = ไม่มีช่องแจ้งเตือน → ข้าม
  if (!pushConfigured && !lineConfigured) return NextResponse.json({ ok: true, skipped: "no channel configured" });

  const body = await req.json().catch(() => ({}));
  const table = body?.table as string;
  const type = body?.type as string; // INSERT | UPDATE | DELETE
  const rec = body?.record ?? {};
  const old = body?.old_record ?? {};

  try {
    if (table === "point_transactions" && type === "INSERT" && rec.type === "earn" && rec.user_id) {
      await notify({
        userId: rec.user_id,
        push: { title: "ถุงเขียว 🎉", body: `คุณได้รับ ${formatBaht(Number(rec.points))} คะแนนจากการรีไซเคิล` },
      });
    } else if (table === "redemptions" && type === "UPDATE" && rec.user_id) {
      const baht = formatBaht(Number(rec.amount_baht));
      if (rec.status === "paid" && old.status !== "paid") {
        await notify({
          userId: rec.user_id,
          push: { title: "ถุงเขียว 💸", body: `โอนเงินแลกแต้ม ฿${baht} ให้คุณแล้ว` },
          line: `💸 โอนเงินแลกแต้ม ฿${baht} เข้าบัญชีของคุณเรียบร้อยแล้ว ขอบคุณที่ร่วมรีไซเคิลกับถุงเขียว 🌱`,
        });
      } else if (rec.status === "rejected" && old.status !== "rejected") {
        await notify({
          userId: rec.user_id,
          push: { title: "ถุงเขียว", body: `คำขอถอนเงิน ฿${baht} ไม่สำเร็จ — คืนแต้มแล้ว` },
          line: `⚠️ คำขอถอนเงิน ฿${baht} ไม่สำเร็จ ระบบคืนแต้มเข้าบัญชีของคุณแล้ว — ตรวจสอบบัญชีรับเงินแล้วลองใหม่ได้ในแอป`,
        });
      }
    } else if (table === "profiles" && type === "UPDATE") {
      const newStatus = rec?.payout?.status;
      const oldStatus = old?.payout?.status;
      if (newStatus && newStatus !== oldStatus && rec.id) {
        if (newStatus === "approved") {
          await notify({
            userId: rec.id,
            lineUserId: rec.line_user_id,
            line: `✅ บัญชีรับเงินของคุณได้รับการอนุมัติแล้ว — ถอนเงินแลกแต้มได้เลยในแอปถุงเขียว 🌱`,
          });
        } else if (newStatus === "rejected") {
          await notify({
            userId: rec.id,
            lineUserId: rec.line_user_id,
            line: `❌ บัญชีรับเงินของคุณไม่ผ่านการตรวจสอบ — กรุณาแก้ไขข้อมูลบัญชี/สำเนา book bank แล้วส่งใหม่ในแอป`,
          });
        }
      }
    }
  } catch {
    /* อย่าให้ webhook พังเพราะการแจ้งเตือนล้ม */
  }
  return NextResponse.json({ ok: true });
}
