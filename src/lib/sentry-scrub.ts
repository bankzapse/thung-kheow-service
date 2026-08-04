/**
 * กลบ PII ก่อนส่ง event ขึ้น Sentry (ใช้ร่วมทั้ง client/server/edge)
 *
 * แอปนี้ถือข้อมูลส่วนบุคคลเยอะ (เบอร์โทร ชื่อ ที่อยู่ พิกัด LINE id พร้อมเพย์ OTP token)
 * → ต้องกลบก่อนส่งออกนอกระบบ ไม่งั้นข้อมูลผู้ใช้รั่วไปที่ Sentry
 */
import type { ErrorEvent } from "@sentry/nextjs";

/** รูปแบบ PII ที่ต้องกลบในข้อความ/ค่าต่าง ๆ */
const PATTERNS: [RegExp, string][] = [
  [/\b0\d{8,9}\b/g, "[phone]"], // เบอร์ไทย 0xxxxxxxxx
  [/\b66\d{8,9}\b/g, "[phone]"], // เบอร์รูปแบบ +66
  [/\bU[0-9a-f]{32}\b/g, "[lineId]"], // LINE userId
  [/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email]"], // อีเมล
  [/\b\d{13}\b/g, "[id13]"], // บัตรประชาชน / พร้อมเพย์ 13 หลัก
];

function redact(s: string): string {
  let out = s;
  for (const [re, rep] of PATTERNS) out = out.replace(re, rep);
  return out;
}

function redactDeep(val: unknown, depth = 0): unknown {
  if (depth > 6 || val == null) return val;
  if (typeof val === "string") return redact(val);
  if (Array.isArray(val)) return val.map((v) => redactDeep(v, depth + 1));
  if (typeof val === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      out[k] = redactDeep(v, depth + 1);
    }
    return out;
  }
  return val;
}

/** beforeSend hook — คืน event ที่กลบ PII แล้ว (ไม่เคย return null เพื่อให้ยังเห็น error) */
export function scrubEvent(event: ErrorEvent): ErrorEvent {
  // 1) ตัดข้อมูลระบุตัวตนของผู้ใช้ (id/email/ip/username อาจเป็น PII ทั้งหมด)
  if (event.user) {
    event.user = event.user.id ? { id: "[redacted]" } : {};
  }

  // 2) ตัดส่วน request ที่อ่อนไหว (คุกกี้ · body · query · หัวที่มี token/ip)
  if (event.request) {
    delete event.request.cookies;
    delete event.request.data;
    delete event.request.query_string;
    const h = event.request.headers;
    if (h) {
      for (const key of ["authorization", "cookie", "x-forwarded-for", "x-real-ip", "x-line-signature"]) {
        delete h[key];
      }
    }
  }

  // 3) กลบ PII ในข้อความ error / exception / breadcrumb / extra
  if (event.message) event.message = redact(event.message);
  for (const ex of event.exception?.values ?? []) {
    if (ex.value) ex.value = redact(ex.value);
  }
  for (const b of event.breadcrumbs ?? []) {
    if (b.message) b.message = redact(b.message);
    if (b.data) b.data = redactDeep(b.data) as typeof b.data;
  }
  if (event.extra) event.extra = redactDeep(event.extra) as typeof event.extra;

  return event;
}
