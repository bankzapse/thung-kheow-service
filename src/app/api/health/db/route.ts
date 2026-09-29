import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // ห้าม cache — ต้องยิง DB จริงทุกครั้ง

/**
 * Keep-alive — แตะ DB/REST จริง เพื่อกัน Supabase Free "หลับ" (pause หลังไม่มี activity 7 วัน)
 * /api/health เฉย ๆ ไม่พอ (ไม่แตะ DB) · ตัวนี้ยิง REST 1 query เบา ๆ ให้โปรเจกต์นับว่า active
 * ยิงโดย GitHub Action (.github/workflows/keep-alive.yml) ทุก ~3 วัน
 *
 * หมายเหตุ: ป้องกันการ "หลับ" เท่านั้น — ถ้าหลับไปแล้วต้องกดปลุกใน dashboard เอง
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return NextResponse.json({ ok: false, reason: "no-supabase-env" }, { status: 503 });
  try {
    const r = await fetch(`${url}/rest/v1/material_prices?select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    return NextResponse.json({ ok: r.ok, db: r.status }, { status: r.ok ? 200 : 502 });
  } catch {
    return NextResponse.json({ ok: false, reason: "db-unreachable" }, { status: 502 });
  }
}
