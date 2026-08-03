import "server-only"; // 🔒 build error ถ้าถูก import จากฝั่ง client (ถือ service_role key ห้ามหลุด)
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Supabase admin client (service_role) — server-only เท่านั้น!
 * ใช้ bypass RLS + จัดการผู้ใช้ (เช่น แลก LIFF token → session)
 * ห้าม import ในโค้ดฝั่ง client เด็ดขาด
 */
export function createAdminClient() {
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
