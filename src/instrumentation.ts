/**
 * Next.js instrumentation — โหลด Sentry config ตาม runtime
 * (ถ้าไม่ตั้ง DSN config เหล่านี้จะไม่ init อะไรเลย)
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

// ส่ง error ของ nested React Server Components ให้ Sentry (no-op ถ้าไม่ได้ init)
export { captureRequestError as onRequestError } from "@sentry/nextjs";
