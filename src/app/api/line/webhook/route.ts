import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/line";
import { notify, notifyReady } from "@/lib/notify";
import { SITE_URL } from "@/lib/site";

export const runtime = "nodejs";

// LINE เรียก verify ตอนตั้งค่า webhook
export async function GET() {
  return NextResponse.json({ ok: true });
}

const liffId = process.env.NEXT_PUBLIC_LIFF_ID;

const WELCOME =
  "ยินดีต้อนรับสู่ถุงเขียว 🌱\n\n" +
  "คัดแยกขยะรีไซเคิลใส่ถุง → หย่อนที่ตู้ Drop Bag → สแกน QR → สะสมแต้ม → แลกเป็นเงินเข้าพร้อมเพย์\n\n" +
  "กดเมนูด้านล่างเพื่อเริ่มใช้งานได้เลย" +
  (liffId ? `\n\nเริ่มเลย: https://liff.line.me/${liffId}/home` : `\n\n${SITE_URL}`);

/**
 * POST /api/line/webhook — รับ event จาก LINE OA
 *
 * ตอนนี้จัดการ: follow → ทักทาย + บอกวิธีเริ่มใช้งาน (พร้อมลิงก์ LIFF)
 * event อื่นข้ามไป · ไม่ log userId ลง serverless log เพราะเป็น PII
 *
 * 📌 ไม่ผูก line_user_id ที่นี่ — การผูกบัญชีต้องยืนยันตัวตนผ่าน
 *    /api/line/link หรือ /api/line/complete-signup เท่านั้น
 *    (webhook รู้แค่ว่า "ใครกด add เพื่อน" ซึ่งไม่พอจะบอกว่าเป็นเจ้าของบัญชีไหน)
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get("x-line-signature");

  if (!verifyWebhookSignature(raw, signature)) {
    return new NextResponse("invalid signature", { status: 401 });
  }

  let body: { events?: { type?: string; source?: { userId?: string } }[] };
  try {
    body = JSON.parse(raw || "{}");
  } catch {
    return NextResponse.json({ ok: true }); // payload เพี้ยน — ตอบ 200 กัน LINE retry ไม่จบ
  }

  for (const ev of body.events ?? []) {
    if (ev.type !== "follow" || !ev.source?.userId || !notifyReady) continue;
    // ล้มเหลวก็ข้าม ไม่ให้ทั้ง batch พัง (ถ้าเราตอบ error LINE จะ retry ซ้ำ)
    // notify() ไม่ throw อยู่แล้ว — .catch ไว้กันเหนียวเฉย ๆ
    await notify({
      channels: ["line"],
      to: { lineUserId: ev.source.userId },
      text: WELCOME,
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
