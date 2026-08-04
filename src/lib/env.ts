import "server-only"; // ตรวจ env ฝั่ง server เท่านั้น
import { z } from "zod";

/**
 * ตรวจความถูกต้องของ Environment Variables ตอน server เริ่มทำงาน
 * — จับ config ผิด/ขาด "ตั้งแต่ตอนบูต" แทนที่จะไปพังกลางทางแบบสุ่ม
 * — ไม่ throw (fail-open): แค่ log ชัด ๆ + ส่งขึ้น Sentry เมื่อเป็น prod
 *   (แอปออกแบบให้ optional feature ปิดเองเมื่อไม่มี env — ไม่ควรล้มทั้งเว็บ)
 */

const isProd = process.env.VERCEL_ENV === "production";

const urlSchema = z.string().url();
const promptpaySchema = z.string().refine(
  (v) => { const d = v.replace(/\D/g, ""); return /^0\d{9}$/.test(d) || /^\d{13}$/.test(d); },
  "ต้องเป็นเบอร์มือถือ 10 หลัก (0xxxxxxxxx) หรือเลข 13 หลัก",
);
const jsonSchema = z.string().refine(
  (v) => { try { JSON.parse(v); return true; } catch { return false; } },
  "ต้องเป็น JSON ที่ parse ได้",
);

/** ตรวจ "รูปแบบ" ของ env ที่มีค่า (ตัวที่ไม่ได้ตั้งจะข้าม) */
const formatSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: urlSchema.optional(),
  NEXT_PUBLIC_SITE_URL: urlSchema.optional(),
  NEXT_PUBLIC_SENTRY_DSN: urlSchema.optional(),
  SENTRY_DSN: urlSchema.optional(),
  NEXT_PUBLIC_COMPANY_PROMPTPAY: promptpaySchema.optional(),
  FCM_SERVICE_ACCOUNT_JSON: jsonSchema.optional(),
});

/** env ที่ "จำเป็นบน production" — ไม่ตั้ง = ฟีเจอร์หลักพัง */
const REQUIRED_IN_PROD: { key: string; why: string; check?: () => boolean }[] = [
  { key: "NEXT_PUBLIC_SUPABASE_URL", why: "ต่อฐานข้อมูล/auth ไม่ได้ (จะตกโหมดเดโม)" },
  { key: "SUPABASE_SERVICE_ROLE_KEY", why: "API ฝั่ง server (admin/OTP/LINE) ทำงานไม่ได้" },
  {
    key: "NEXT_PUBLIC_SUPABASE_ANON_KEY|NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    why: "client ต่อ Supabase ไม่ได้",
    check: () => !!(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
  },
  { key: "OTP_SECRET", why: "verify OTP ปิดตาย (fail-closed)" },
  { key: "SMSOK_API_KEY", why: "ส่ง SMS OTP ไม่ได้" },
  { key: "SMSOK_API_SECRET", why: "ส่ง SMS OTP ไม่ได้" },
  { key: "NEXT_PUBLIC_COMPANY_PROMPTPAY", why: "ปิดช่องทางเติมเครดิต (fail-closed)" },
];

const has = (key: string) => {
  const v = process.env[key];
  return typeof v === "string" && v.trim() !== "";
};

export interface EnvReport {
  ok: boolean;
  formatErrors: string[]; // env ที่ "มีค่าแต่รูปแบบผิด"
  missingRequired: string[]; // env จำเป็นบน prod ที่ขาด
}

/** ตรวจ env แล้วคืนรายงาน (ไม่ throw) */
export function checkEnv(): EnvReport {
  const parsed = formatSchema.safeParse(process.env);
  const formatErrors = parsed.success
    ? []
    : parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);

  const missingRequired = REQUIRED_IN_PROD.filter((r) => (r.check ? !r.check() : !has(r.key))).map(
    (r) => `${r.key} — ${r.why}`,
  );

  return { ok: formatErrors.length === 0 && missingRequired.length === 0, formatErrors, missingRequired };
}

/** เรียกตอน server บูต — log ชัด ๆ + แจ้ง Sentry เมื่อ prod มีปัญหา (ไม่ทำเว็บล้ม) */
export async function validateServerEnv(): Promise<void> {
  const rep = checkEnv();
  if (rep.ok) {
    console.log("[env] ✅ ตรวจ environment variables ผ่าน");
    return;
  }

  const lines: string[] = ["[env] ⚠️ พบปัญหา environment variables:"];
  for (const e of rep.formatErrors) lines.push(`  · รูปแบบผิด: ${e}`);
  // ตัวที่จำเป็นบน prod — เตือนเสมอ แต่ระบุความรุนแรงตาม env ปัจจุบัน
  for (const m of rep.missingRequired) lines.push(`  · ${isProd ? "ขาด (prod)" : "ยังไม่ตั้ง"}: ${m}`);
  const msg = lines.join("\n");

  if (isProd && (rep.formatErrors.length || rep.missingRequired.length)) {
    console.error(msg);
    try {
      const Sentry = await import("@sentry/nextjs");
      Sentry.captureMessage("Environment misconfiguration ตอนบูต\n" + msg, "warning");
    } catch {
      /* Sentry ไม่พร้อม (ไม่ได้ตั้ง DSN) — ข้าม */
    }
  } else {
    // dev/preview: เป็นเรื่องปกติที่ยังไม่ตั้งครบ → เตือนเบา ๆ
    console.warn(msg);
  }
}
