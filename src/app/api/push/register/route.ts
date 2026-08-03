import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** เก็บ device token ของผู้ใช้ที่ล็อกอินอยู่ (เรียกจากแอป native หลัง register push) */
export async function POST(req: Request) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return NextResponse.json({ ok: false, error: "not enabled" }, { status: 404 });
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const { token, platform } = await req.json().catch(() => ({}));
  if (!token || typeof token !== "string") return NextResponse.json({ ok: false, error: "missing token" }, { status: 400 });

  const { error } = await supabase.from("device_tokens").upsert({ token, user_id: user.id, platform: platform ?? null, updated_at: new Date().toISOString() });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
