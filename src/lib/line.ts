/**
 * LINE OA integration helpers (server-only).
 * ต้องตั้งค่า env จึงจะทำงานจริง (ดู .env.example) — ถ้าไม่มี token จะ no-op อย่างปลอดภัย
 *
 * ใช้ 2 ช่องทางของ LINE:
 *  1) Messaging API (OA)   → push แจ้งเตือนสถานะงานให้ผู้ขาย
 *  2) LINE Login (OAuth)   → เชื่อมบัญชีผู้ใช้กับ LINE userId
 */
import crypto from "crypto";
import type { JobStatus } from "./types";

const MESSAGING_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const MESSAGING_SECRET = process.env.LINE_CHANNEL_SECRET;
// LIFF ไม่ได้ใช้ OAuth code flow → ต้องการแค่ Channel ID (public client_id)
// ไม่ต้องมี CHANNEL_SECRET / REDIRECT_URI เหมือน LINE Login แบบเว็บ
const LOGIN_CHANNEL_ID = process.env.LINE_LOGIN_CHANNEL_ID;

export const lineConfigured = Boolean(MESSAGING_TOKEN);
export const lineLoginConfigured = Boolean(LOGIN_CHANNEL_ID);

/** ส่งข้อความ (push) ไปยัง LINE userId — คืน {skipped:true} ถ้ายังไม่ตั้งค่า token */
export async function pushText(to: string, text: string) {
  if (!MESSAGING_TOKEN) return { skipped: true as const, reason: "LINE_CHANNEL_ACCESS_TOKEN not set" };
  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${MESSAGING_TOKEN}`,
    },
    body: JSON.stringify({ to, messages: [{ type: "text", text }] }),
  });
  return { ok: res.ok, status: res.status };
}

/** ตรวจ signature ของ webhook จาก LINE (ความปลอดภัย) */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!MESSAGING_SECRET || !signature) return false;
  const hash = crypto.createHmac("sha256", MESSAGING_SECRET).update(rawBody).digest("base64");
  try {
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
  } catch {
    return false;
  }
}

/** ข้อความแจ้งเตือนสถานะงาน (ภาษาไทย) */
export function statusMessage(code: string, status: JobStatus, buyerName?: string): string {
  const map: Record<JobStatus, string> = {
    submitted: `📮 รายการ ${code} ถูกส่งแล้ว กำลังรอผู้ซื้อรับงาน`,
    confirmed: `✅ ผู้ซื้อ${buyerName ? ` (${buyerName})` : ""} คอนเฟิร์มรับงาน ${code} แล้ว`,
    en_route: `🚚 คนขับกำลังเดินทางไปรับของ (${code}) โปรดเตรียมของให้พร้อม`,
    completed: `🎉 งาน ${code} สำเร็จแล้ว! ขอบคุณที่ใช้บริการ Recycle Fund`,
    cancelled: `⚠️ งาน ${code} ถูกยกเลิก`,
  };
  return map[status];
}

/* ---------------- LINE Login / LIFF (ฝั่ง server) ---------------- */

export interface LineProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
}

/**
 * 🔒 ตรวจว่า access token ถูกออกให้ "channel ของเรา" จริงและยังไม่หมดอายุ
 *
 * สำคัญมาก: GET /v2/profile รับ token ที่ออกจาก channel ไหนก็ได้ ถ้าไม่เช็ค client_id
 * ผู้โจมตีตั้ง LIFF ของตัวเอง หลอกเหยื่อกดยินยอม แล้วเอา token มายิงที่เรา = ยึดบัญชีได้
 */
export async function verifyLineAccessToken(accessToken: string): Promise<{ ok: boolean; reason?: string }> {
  if (!LOGIN_CHANNEL_ID) return { ok: false, reason: "LINE Login ยังไม่ตั้งค่า" };
  const res = await fetch(`https://api.line.me/oauth2/v2.1/verify?access_token=${encodeURIComponent(accessToken)}`);
  if (!res.ok) return { ok: false, reason: "token ไม่ถูกต้อง" };
  const j = (await res.json()) as { client_id?: string; expires_in?: number };
  if (j.client_id !== LOGIN_CHANNEL_ID) return { ok: false, reason: "token มาจาก channel อื่น" };
  if (!j.expires_in || j.expires_in <= 0) return { ok: false, reason: "token หมดอายุ" };
  return { ok: true };
}

/** โปรไฟล์ LINE จาก access token — เรียกหลัง verifyLineAccessToken ผ่านแล้วเท่านั้น */
export async function fetchLineProfile(accessToken: string): Promise<LineProfile | null> {
  const res = await fetch("https://api.line.me/v2/profile", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  return (await res.json()) as LineProfile;
}
