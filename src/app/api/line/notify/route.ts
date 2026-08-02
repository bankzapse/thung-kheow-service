import { NextResponse } from "next/server";
import { statusMessage } from "@/lib/line";
import { notify, notifyReady, notifyViaService } from "@/lib/notify";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * POST /api/line/notify — push แจ้งเตือนผู้ขายผ่าน LINE OA
 * 🔒 เฉพาะผู้ใช้ที่ล็อกอินและเป็น operator (admin/buyer) — กันใช้ OA แบรนด์ส่งข้อความมั่ว/phishing
 * body: { to: lineUserId, message?, code?, status?, buyerName? }
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data: me } = await supabase.from("profiles").select("role, owner").eq("id", auth.user.id).single();
  const r = me as { role?: string; owner?: boolean } | null;
  if (!r || !(r.owner === true || r.role === "admin" || r.role === "buyer")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { to, message, code, status, buyerName } = body ?? {};
  if (!to) return NextResponse.json({ error: "missing 'to' (LINE userId)" }, { status: 400 });
  const text = message ?? (code && status ? statusMessage(code, status, buyerName) : null);
  if (!text) return NextResponse.json({ error: "missing message or (code+status)" }, { status: 400 });

  const result = await notify({ channels: ["line"], to: { lineUserId: to }, text });
  return NextResponse.json({ configured: notifyReady, viaService: notifyViaService, result });
}
