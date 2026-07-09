import { NextResponse } from "next/server";
import { issueOtp } from "@/lib/otp";
import { sendSms, smsokConfigured, normalizeThaiPhone } from "@/lib/smsok";

export const runtime = "nodejs";

// กันสแปมแบบเบา ๆ (in-memory, best-effort ต่อ instance)
const lastSent = new Map<string, number>();
const COOLDOWN_MS = 30 * 1000;

export async function POST(req: Request) {
  const { phone } = await req.json().catch(() => ({ phone: "" }));
  const p = normalizeThaiPhone(String(phone || ""));
  if (!/^0\d{8,9}$/.test(p)) return NextResponse.json({ ok: false, error: "invalid phone" }, { status: 400 });

  // ยังไม่ได้ตั้งค่า SMS OK → บอก client ให้ใช้โหมดทดลอง (ข้าม OTP)
  if (!smsokConfigured) return NextResponse.json({ ok: true, configured: false });

  const now = Date.now();
  const prev = lastSent.get(p);
  if (prev && now - prev < COOLDOWN_MS) {
    return NextResponse.json({ ok: false, error: "รอสักครู่ก่อนขอรหัสใหม่", retryAfter: Math.ceil((COOLDOWN_MS - (now - prev)) / 1000) }, { status: 429 });
  }

  const { code, token, ttlMs } = issueOtp(p);
  const res = await sendSms(p, `รหัสยืนยัน ถุงเขียว ของคุณคือ ${code} (หมดอายุใน ${Math.round(ttlMs / 60000)} นาที)`);
  if (!res.ok) return NextResponse.json({ ok: false, error: res.error }, { status: 502 });

  lastSent.set(p, now);
  return NextResponse.json({ ok: true, configured: true, token, ttlMs });
}
