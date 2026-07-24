import { NextResponse } from "next/server";
import { issueOtp } from "@/lib/otp";
import { sendSms, smsokConfigured, normalizeThaiPhone } from "@/lib/smsok";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const COOLDOWN_MS = 30 * 1000; // ขอซ้ำได้ทุก 30 วิ
const DAILY_CAP = 15; // ส่งได้ไม่เกิน 15 ครั้ง/เบอร์/วัน

const toE164Bare = (p: string) => "66" + p.replace(/^0/, "");

export async function POST(req: Request) {
  const { phone, purpose } = await req.json().catch(() => ({ phone: "" }));
  const p = normalizeThaiPhone(String(phone || ""));
  if (!/^0\d{8,9}$/.test(p)) return NextResponse.json({ ok: false, error: "invalid phone" }, { status: 400 });

  // ยังไม่ได้ตั้งค่า SMS OK → โหมดทดลอง (ข้าม OTP)
  if (!smsokConfigured) return NextResponse.json({ ok: true, configured: false });

  // กันสแปมแบบ shared (ตาราง otp_throttle) แทน in-memory ที่ bypass บน serverless ได้
  const hasDb = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const table = hasDb ? (n: string) => (createAdminClient() as any).from(n) : null;
  const today = new Date().toISOString().slice(0, 10);

  // 🔒 รีเซ็ตรหัสผ่าน: ต้องมีบัญชีสำหรับเบอร์นี้ก่อน ถึงจะส่ง OTP
  //    (กันคนสุ่มยิงขอ OTP รั่ว ๆ เปลืองค่า SMS + กันเบอร์ที่ไม่มีบัญชี)
  //    เบอร์ที่ไม่พบ → บอกให้ติดต่อบริษัท (เผื่อจำเบอร์ที่ผูกไว้ไม่ได้)
  if (purpose === "reset" && table) {
    try {
      const { data } = await table("profiles").select("id").or(`phone.eq.${toE164Bare(p)},phone.eq.${p}`).limit(1);
      if (!data?.length) {
        return NextResponse.json({ ok: false, notFound: true, error: "ไม่พบเบอร์นี้ในระบบ" }, { status: 404 });
      }
    } catch {
      /* อ่านไม่ได้ → ปล่อยผ่าน (best-effort) ดีกว่าบล็อกการรีเซ็ต */
    }
  }

  if (table) {
    try {
      const { data: th } = await table("otp_throttle").select("last_send, sends_day, sends_count, locked_until").eq("phone", p).maybeSingle();
      const now = Date.now();
      if (th?.locked_until && new Date(th.locked_until).getTime() > now) {
        return NextResponse.json({ ok: false, error: "พยายามหลายครั้งเกินไป — ลองใหม่ภายหลัง" }, { status: 429 });
      }
      if (th?.last_send && now - new Date(th.last_send).getTime() < COOLDOWN_MS) {
        const retryAfter = Math.ceil((COOLDOWN_MS - (now - new Date(th.last_send).getTime())) / 1000);
        return NextResponse.json({ ok: false, error: "รอสักครู่ก่อนขอรหัสใหม่", retryAfter }, { status: 429 });
      }
      const sentToday = th?.sends_day === today ? th.sends_count ?? 0 : 0;
      if (sentToday >= DAILY_CAP) {
        return NextResponse.json({ ok: false, error: "ขอรหัสเกินจำนวนที่กำหนดต่อวัน — ลองใหม่พรุ่งนี้" }, { status: 429 });
      }
    } catch {
      /* throttle store อ่านไม่ได้ → ปล่อยผ่าน (best-effort) */
    }
  }

  const { code, token, ttlMs } = issueOtp(p);
  const res = await sendSms(p, `รหัสยืนยัน ถุงเขียว ของคุณคือ ${code} (หมดอายุใน ${Math.round(ttlMs / 60000)} นาที)`);
  if (!res.ok) return NextResponse.json({ ok: false, error: res.error }, { status: 502 });

  if (table) {
    try {
      const { data: th2 } = await table("otp_throttle").select("sends_day, sends_count").eq("phone", p).maybeSingle();
      const base = th2?.sends_day === today ? th2.sends_count ?? 0 : 0;
      await table("otp_throttle").upsert({ phone: p, last_send: new Date().toISOString(), sends_day: today, sends_count: base + 1, updated_at: new Date().toISOString() });
    } catch {
      /* บันทึกไม่ได้ → ข้าม */
    }
  }
  return NextResponse.json({ ok: true, configured: true, token, ttlMs });
}
