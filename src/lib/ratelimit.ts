import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./supabase/database.types";

/** IP ผู้เรียกจาก header ของ proxy/Vercel (ตัวแรกใน x-forwarded-for) */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

/**
 * เช็ค rate limit แบบ fixed-window (counter อยู่ใน DB → shared ทุก instance บน serverless)
 * คืน true = ผ่าน (ทำต่อได้) · false = เกินลิมิต
 * fail-open: RPC พัง/ยังไม่รัน migration → คืน true (ไม่บล็อกผู้ใช้จริง)
 */
export async function rateLimit(
  sb: SupabaseClient<Database>,
  key: string,
  limit: number,
  windowSec: number,
): Promise<boolean> {
  try {
    const { data, error } = await sb.rpc("rate_limit_hit", {
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSec,
    });
    if (error) return true;
    return data !== false;
  } catch {
    return true;
  }
}
