import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { pushText, lineConfigured } from "@/lib/line";
import { formatBaht, thaiMonthLabel } from "@/lib/utils";
import type { LuckyDrawConfig } from "@/lib/luckyDraw";

export const runtime = "nodejs";

const bad = (msg: string, status = 400) => NextResponse.json({ ok: false, error: msg }, { status });

/**
 * แจ้งผล LINE ตอนประกาศผลชิงโชค (แอดมินเรียกหลังจับรางวัล)
 * - ผู้โชคดี: ข้อความยินดี + รางวัล
 * - ผู้ร่วมสนุก (ที่มีสิทธิ์ แต่ไม่ถูก): ข้อความประกาศผล
 * ไม่ตั้ง LINE_CHANNEL_ACCESS_TOKEN = no-op (คืน skipped)
 */
export async function POST(req: Request) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return bad("not enabled", 404);

  // 🔒 ยืนยันผู้เรียกเป็นแอดมิน
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const caller = auth?.user;
  if (!caller) return bad("unauthorized", 401);
  const { data: me } = await supabase.from("profiles").select("role, roles, owner").eq("id", caller.id).single();
  const meRow = me as { role?: string; roles?: string[]; owner?: boolean } | null;
  const isAdmin = !!meRow && (meRow.owner === true || meRow.role === "admin" || (Array.isArray(meRow.roles) && meRow.roles.includes("admin")));
  if (!isAdmin) return bad("forbidden", 403);

  if (!lineConfigured) return NextResponse.json({ ok: true, skipped: "LINE not configured", sent: 0 });

  const body = await req.json().catch(() => ({}));
  const month = String(body?.month || "");
  if (!/^\d{4}-\d{2}$/.test(month)) return bad("รูปแบบเดือนไม่ถูกต้อง");
  const participantIds: string[] = Array.isArray(body?.participantIds) ? body.participantIds.map(String) : [];

  const admin = createAdminClient();

  // อ่านรอบจาก app_config (source of truth)
  const { data: row } = await admin.from("app_config").select("value").eq("key", "lucky_draw").maybeSingle();
  const cfg = (row?.value ?? null) as LuckyDrawConfig | null;
  const round = cfg?.rounds?.[month];
  if (!round || round.status !== "drawn") return bad("รอบนี้ยังไม่ได้ประกาศผล");
  const title = cfg?.title || "ชิงโชค";
  const monthLabel = thaiMonthLabel(month);
  // ลิงก์เปิดแอปหน้าผลรางวัลใน LINE (LIFF) — ถ้าตั้ง LIFF ID
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
  const appLink = liffId ? `\n\n👉 ดูสิทธิ์ & ผลรางวัล: https://liff.line.me/${liffId}/rewards` : "";

  const winners = round.winners ?? [];
  const winnerIds = new Set(winners.map((w) => w.userId));
  const otherIds = participantIds.filter((id) => !winnerIds.has(id));
  const allIds = [...new Set([...winners.map((w) => w.userId), ...otherIds])];
  if (!allIds.length) return NextResponse.json({ ok: true, sent: 0 });

  // batch resolve LINE ids
  const { data: profs } = await admin.from("profiles").select("id, line_user_id").in("id", allIds);
  const lineOf = new Map<string, string | null>((profs ?? []).map((p) => [p.id as string, (p.line_user_id as string | null) ?? null]));

  let sent = 0;
  let skipped = 0;

  // ผู้โชคดี
  for (const w of winners) {
    const to = lineOf.get(w.userId);
    if (!to) { skipped++; continue; }
    const prizeVal = w.prizeValue > 0 ? ` (มูลค่า ฿${formatBaht(w.prizeValue)})` : "";
    const text = `🎉 ยินดีด้วย! คุณเป็นผู้โชคดีจากกิจกรรม “${title}” ประจำเดือน${monthLabel}\n\n🏆 รางวัล: ${w.prizeName}${prizeVal}\n\nทีมงานถุงเขียวจะติดต่อกลับเพื่อมอบรางวัลเร็ว ๆ นี้ ขอบคุณที่ร่วมสนุกครับ 🙏${appLink}`;
    try { await pushText(to, text); sent++; } catch { skipped++; }
  }

  // ผู้ร่วมสนุก (ไม่ถูกรางวัล)
  for (const id of otherIds) {
    const to = lineOf.get(id);
    if (!to) { skipped++; continue; }
    const text = `📢 ประกาศผลกิจกรรม “${title}” ประจำเดือน${monthLabel}แล้ว!\n\nขอบคุณที่ร่วมสนุก 🍀 เปิดแอปเพื่อดูผลผู้โชคดี — และสะสมสิทธิ์ลุ้นรอบใหม่ได้เลย ✨${appLink}`;
    try { await pushText(to, text); sent++; } catch { skipped++; }
  }

  return NextResponse.json({ ok: true, sent, skipped, winners: winners.length });
}
