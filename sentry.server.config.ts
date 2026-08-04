/**
 * Sentry — ฝั่ง server (Node runtime)
 * ไม่ตั้ง SENTRY_DSN = ปิดสนิท (พฤติกรรมเดิมทุกอย่าง) — fail-open เหมือนฟีเจอร์ออปชันอื่น
 */
import * as Sentry from "@sentry/nextjs";
import { scrubEvent } from "./src/lib/sentry-scrub";

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    sendDefaultPii: false, // ❌ ไม่ส่ง IP/คุกกี้/หัว request อัตโนมัติ
    beforeSend: scrubEvent, // กลบ PII (เบอร์/ชื่อ/อีเมล/LINE id) ก่อนส่ง
    ignoreErrors: ["NEXT_NOT_FOUND", "NEXT_REDIRECT"], // flow control ปกติของ Next ไม่ใช่ error
  });
}
