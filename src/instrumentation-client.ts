/**
 * Sentry — ฝั่ง client (เบราว์เซอร์)
 * ไม่ตั้ง NEXT_PUBLIC_SENTRY_DSN = ปิดสนิท
 */
import * as Sentry from "@sentry/nextjs";
import { scrubEvent } from "./lib/sentry-scrub";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0, // ปิด session replay (อัดหน้าจอ = PII เยอะ)
    replaysOnErrorSampleRate: 0,
    sendDefaultPii: false,
    beforeSend: scrubEvent,
  });
}

// ให้ Sentry เก็บ navigation ของ App Router (client-side routing)
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
