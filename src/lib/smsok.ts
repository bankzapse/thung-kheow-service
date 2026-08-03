/**
 * SMS OK gateway client (server-only)
 * Docs: https://developer.smsok.co  ·  API: https://api.smsok.co
 *   POST /s  (HTTP Basic auth: API_KEY:API_SECRET)
 *   body: { sender, text, destinations: [{ destination }] }
 *   เบอร์ปลายทางเป็นรูปแบบไทย 0xxxxxxxxx
 *
 * ตั้งค่าใน env (อย่า commit ค่า secret):
 *   SMSOK_API_KEY, SMSOK_API_SECRET, SMSOK_SENDER (ดีฟอลต์ "MindFull"), SMSOK_API_URL (ออปชัน)
 *   ⚠️ SMSOK_SENDER ต้องเป็นชื่อผู้ส่งที่ลงทะเบียนแบบ Transactional/OTP กับ SMS OK
 *      ไม่งั้นค่ายจะกรองเป็น SMS โฆษณา (เบอร์ที่ตั้ง anti-spam จะไม่ได้รับ OTP)
 */

const API_URL = process.env.SMSOK_API_URL || "https://api.smsok.co";
const API_KEY = process.env.SMSOK_API_KEY;
const API_SECRET = process.env.SMSOK_API_SECRET;
const SENDER = process.env.SMSOK_SENDER || "MindFull";

/** ตั้งค่า SMS OK ครบหรือยัง (มี key + secret) */
export const smsokConfigured = Boolean(API_KEY && API_SECRET);

/** normalize เบอร์ไทยเป็น 0xxxxxxxxx (รับ +66/66/0 นำหน้า) */
export function normalizeThaiPhone(phone: string): string {
  const digits = (phone || "").replace(/\D/g, "");
  if (digits.startsWith("66")) return "0" + digits.slice(2);
  if (digits.startsWith("0")) return digits;
  return digits ? "0" + digits : "";
}

export type SendSmsResult = { ok: true; balance?: number; price?: number } | { ok: false; error: string; status?: number };

/** ส่ง SMS หนึ่งเบอร์ */
export async function sendSms(to: string, text: string): Promise<SendSmsResult> {
  if (!smsokConfigured) return { ok: false, error: "SMSOK not configured" };
  const destination = normalizeThaiPhone(to);
  // OTP ส่งได้เฉพาะมือถือ 10 หลัก (06/08/09) — เดิม /^0\d{8,9}$/ รับเบอร์บ้าน 9 หลักด้วย
  // แล้วยิงไปเบอร์ที่รับ SMS ไม่ได้ → ผู้ใช้รอโค้ดที่ไม่มีวันมา
  if (!/^0[689]\d{8}$/.test(destination)) return { ok: false, error: "ต้องเป็นเบอร์มือถือ 10 หลัก (06/08/09)" };

  const auth = Buffer.from(`${API_KEY}:${API_SECRET}`).toString("base64");
  try {
    const res = await fetch(`${API_URL}/s`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}` },
      body: JSON.stringify({ sender: SENDER, text, destinations: [{ destination }] }),
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data?.error?.description || data?.error?.name || `HTTP ${res.status}`;
      return { ok: false, error: msg, status: res.status };
    }
    return { ok: true, balance: data?.remaining_balance, price: data?.total_price };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "network error" };
  }
}
