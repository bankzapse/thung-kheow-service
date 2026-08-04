import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

type LatLng = { lat: number; lng: number };

/**
 * POST /api/route/matrix  { points: [{lat,lng}] }  (จุดแรก = ฐาน)
 * คืน distance/duration matrix จริงจาก Google Distance Matrix
 * ไม่มี GOOGLE_MAPS_API_KEY → { distances: null } (client fallback เป็น haversine)
 *
 * 🔒 ต้องล็อกอินเป็น buyer/admin — เดิมเปิดสาธารณะ ใครก็ยิงได้
 * 25 จุด = 625 elements ต่อคำขอ (สาขา P>10 ยิง Google 25 ครั้งต่อ 1 HTTP)
 * ปล่อยไว้ = ใครก็รันบิล Google Maps ของเราจนบานหรือจนโควตาหมด
 */
export async function POST(req: Request) {
  const key = process.env.GOOGLE_MAPS_API_KEY;

  // ถ้าเปิด Supabase → บังคับตรวจสิทธิ์ (โหมดเดโมไม่มี auth ให้ตรวจ)
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) return NextResponse.json({ distances: null, reason: "unauthorized" }, { status: 401 });
    const { data: me } = await supabase.from("profiles").select("role, roles").eq("id", auth.user.id).single();
    const row = me as { role?: string; roles?: string[] } | null;
    const roles = [row?.role, ...(Array.isArray(row?.roles) ? row.roles : [])];
    if (!roles.some((r) => r === "buyer" || r === "admin")) {
      return NextResponse.json({ distances: null, reason: "forbidden" }, { status: 403 });
    }
    // 🔒 per-user: กันยิงถล่ม Google Distance Matrix (ค่า API บาน) — 60 คำขอ / 10 นาที
    if (!(await rateLimit(supabase, `matrix_user:${auth.user.id}`, 60, 600))) {
      return NextResponse.json({ distances: null, reason: "rate_limited" }, { status: 429 });
    }
  }

  const body = await req.json().catch(() => ({}));
  const points: LatLng[] = body?.points;

  if (!key) return NextResponse.json({ distances: null, reason: "no_key" });
  if (!Array.isArray(points) || points.length < 2 || points.length > 25) {
    return NextResponse.json({ distances: null, reason: "bad_points" });
  }

  const P = points.length;
  const toStr = (p: LatLng) => `${p.lat},${p.lng}`;
  const all = points.map(toStr).join("|");
  const distances = Array.from({ length: P }, () => Array<number>(P).fill(0));
  const durations = Array.from({ length: P }, () => Array<number>(P).fill(0));

  const request = async (originsStr: string, originIdx: number[]) => {
    const url =
      `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(originsStr)}` +
      `&destinations=${encodeURIComponent(all)}&mode=driving&key=${key}`;
    const res = await fetch(url);
    const j = await res.json();
    if (j.status !== "OK") throw new Error(j.error_message || j.status);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    j.rows.forEach((row: any, ri: number) => {
      const oi = originIdx[ri];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      row.elements.forEach((el: any, dj: number) => {
        distances[oi][dj] = el.status === "OK" ? el.distance.value : 0;
        durations[oi][dj] = el.status === "OK" ? el.duration.value : 0;
      });
    });
  };

  try {
    if (P <= 10) {
      // เมทริกซ์เต็มในคำขอเดียว (P² ≤ 100 elements)
      await request(all, points.map((_, i) => i));
    } else {
      // เกิน 100 elements → ยิงทีละ origin
      for (let i = 0; i < P; i++) await request(toStr(points[i]), [i]);
    }
    return NextResponse.json({ distances, durations });
  } catch (e) {
    // 🔒 ไม่สะท้อนข้อความจาก Google กลับไป (รั่วสถานะ key/โควตา) — log ไว้ฝั่ง server พอ
    console.error("distance matrix failed:", e);
    return NextResponse.json({ distances: null, reason: "upstream_error" });
  }
}
