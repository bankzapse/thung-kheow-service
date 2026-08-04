/**
 * Sentry — ฝั่ง edge (middleware / edge routes)
 * ไม่ตั้ง SENTRY_DSN = ปิดสนิท
 */
import * as Sentry from "@sentry/nextjs";
import { scrubEvent } from "./src/lib/sentry-scrub";

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    beforeSend: scrubEvent,
    ignoreErrors: ["NEXT_NOT_FOUND", "NEXT_REDIRECT"],
  });
}
