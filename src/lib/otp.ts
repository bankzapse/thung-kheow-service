/**
 * OTP แบบไร้สถานะ (stateless) — ไม่ต้องมี DB
 * ออกโค้ด 6 หลัก + โทเคนที่เซ็น HMAC ผูกกับ (เบอร์, เวลาหมดอายุ, โค้ด)
 * ฝั่ง verify ส่ง (เบอร์, โค้ด, โทเคน) กลับมา แล้วเซิร์ฟเวอร์คำนวณลายเซ็นใหม่เทียบ
 * โค้ดจริงไม่เคยถูกเก็บ/ส่งกลับหา client — กันปลอมได้เพราะลายเซ็นผูกกับโค้ด
 */
import crypto from "crypto";

const SECRET = process.env.OTP_SECRET || process.env.SMSOK_API_SECRET || "dev-otp-secret-change-me";
const TTL_MS = 5 * 60 * 1000; // 5 นาที

const b64url = (s: string) => Buffer.from(s).toString("base64url");
const sign = (data: string) => crypto.createHmac("sha256", SECRET).update(data).digest("base64url");

/** สุ่มโค้ด 6 หลัก + โทเคน */
export function issueOtp(phone: string): { code: string; token: string; ttlMs: number } {
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  const exp = Date.now() + TTL_MS;
  const head = b64url(JSON.stringify({ phone, exp }));
  const sig = sign(`${head}.${code}`);
  return { code, token: `${head}.${sig}`, ttlMs: TTL_MS };
}

/** ตรวจโค้ดกับโทเคน */
export function verifyOtp(phone: string, code: string, token: string): { ok: boolean; error?: string } {
  if (!token || !code) return { ok: false, error: "missing" };
  const parts = token.split(".");
  if (parts.length !== 2) return { ok: false, error: "bad token" };
  const [head, sig] = parts;
  let payload: { phone?: string; exp?: number };
  try {
    payload = JSON.parse(Buffer.from(head, "base64url").toString("utf8"));
  } catch {
    return { ok: false, error: "bad token" };
  }
  if (payload.phone !== phone) return { ok: false, error: "phone mismatch" };
  if (!payload.exp || Date.now() > payload.exp) return { ok: false, error: "expired" };
  const expected = sign(`${head}.${code}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return { ok: false, error: "invalid code" };
  return { ok: true };
}
