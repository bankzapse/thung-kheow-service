/**
 * ส่งแจ้งเตือน — ทางเดียวที่โค้ดในแอปนี้ควรเรียก
 *
 * ตั้ง NOTIFY_SERVICE_URL + NOTIFY_APP_SECRET → ยิงผ่าน notify-service (ตัวกลาง)
 * ไม่ตั้ง → ใช้ของเดิมในโปรเซส (lib/line.ts · lib/smsok.ts) เหมือนก่อนหน้านี้ทุกอย่าง
 *
 * ตั้งใจให้ "env เป็นสวิตช์" — merge แล้วยังไม่มีอะไรเปลี่ยนจนกว่าจะตั้ง env
 * และถ้าตัวกลางมีปัญหา ถอด env ออกก็กลับไปทางเดิมได้ทันที ไม่ต้อง revert โค้ด
 *
 * ⚠️ ไม่มี fallback อัตโนมัติจาก service → local โดยเจตนา
 *    ถ้าตัวกลางส่งไปแล้วแต่ตอบกลับไม่ทัน (timeout) การส่งซ้ำในเครื่องจะทำให้
 *    ผู้ใช้ได้ข้อความสองรอบ — ยอมให้ล้มเหลวชัด ๆ ดีกว่าส่งซ้ำเงียบ ๆ
 *
 * ⚠️ ห้ามให้การแจ้งเตือนบล็อกงานหลัก — ฟังก์ชันนี้ไม่ throw เลย คืน ok:false แทน
 *    ผู้เรียกควรใช้แบบ fire-and-forget
 */
import { pushText, lineConfigured } from "./line";
import { sendSms, smsokConfigured } from "./smsok";

const SERVICE_URL = process.env.NOTIFY_SERVICE_URL?.trim().replace(/\/+$/, "");
const APP_SECRET = process.env.NOTIFY_APP_SECRET?.trim();
const APP_ID = process.env.NOTIFY_APP_ID?.trim() || "thung-kheow-service";

/** กันตัวกลางค้างแล้วลาก request ของเราค้างตาม */
const TIMEOUT_MS = 5_000;

/** ยิงผ่านตัวกลางอยู่หรือเปล่า (ใช้ใน /api/health ได้) */
export const notifyViaService = Boolean(SERVICE_URL && APP_SECRET);

/** ส่งแจ้งเตือนได้ไหม (ทางใดทางหนึ่ง) — ใช้แทนการเช็ค lineConfigured ตรง ๆ */
export const notifyReady = notifyViaService || lineConfigured || smsokConfigured;

export type NotifyChannel = "line" | "sms";

export interface NotifyOptions {
  /** ลำดับสำคัญ — เป็นลำดับ fallback ด้วย */
  channels: NotifyChannel[];
  to: { lineUserId?: string; phone?: string };
  text: string;
  /** fallback (ดีฟอลต์) = หยุดทันทีที่สำเร็จช่องหนึ่ง · all = ส่งทุกช่องที่ส่งได้ */
  mode?: "fallback" | "all";
}

export interface NotifyOutcome {
  ok: boolean;
  via: "service" | "local";
  error?: string;
}

export async function notify(o: NotifyOptions): Promise<NotifyOutcome> {
  const mode = o.mode ?? "fallback";
  return notifyViaService
    ? viaService({ ...o, mode })
    : viaLocal({ ...o, mode });
}

async function viaService(o: Required<NotifyOptions>): Promise<NotifyOutcome> {
  try {
    const res = await fetch(`${SERVICE_URL}/api/v1/notify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-app-id": APP_ID,
        Authorization: `Bearer ${APP_SECRET}`,
      },
      body: JSON.stringify({
        channels: o.channels,
        to: o.to,
        text: o.text,
        mode: o.mode,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, via: "service", error: `notify ${res.status}: ${body.slice(0, 200)}` };
    }
    return { ok: true, via: "service" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "network error";
    return { ok: false, via: "service", error: msg };
  }
}

/** ทางเดิม — พฤติกรรมเหมือนก่อนมี notify-service ทุกอย่าง */
async function viaLocal(o: Required<NotifyOptions>): Promise<NotifyOutcome> {
  let lastError: string | undefined;
  let anyOk = false;

  for (const channel of o.channels) {
    try {
      if (channel === "line") {
        if (!lineConfigured || !o.to.lineUserId) continue;
        const r = await pushText(o.to.lineUserId, o.text);
        if ("ok" in r && r.ok) {
          anyOk = true;
          if (o.mode === "fallback") break;
        } else {
          lastError = `LINE ${"status" in r ? r.status : "ส่งไม่สำเร็จ"}`;
        }
      } else {
        if (!o.to.phone) continue;
        const r = await sendSms(o.to.phone, o.text);
        if (r.ok) {
          anyOk = true;
          if (o.mode === "fallback") break;
        } else {
          lastError = r.error;
        }
      }
    } catch (e) {
      lastError = e instanceof Error ? e.message : "unknown error";
    }
  }

  return anyOk
    ? { ok: true, via: "local" }
    : { ok: false, via: "local", error: lastError ?? "ไม่มีช่องทางที่ส่งได้" };
}
