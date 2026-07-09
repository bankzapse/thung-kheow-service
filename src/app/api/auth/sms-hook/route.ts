import { NextResponse } from "next/server";
import crypto from "crypto";
import { sendSms, normalizeThaiPhone } from "@/lib/smsok";

export const runtime = "nodejs";

/**
 * Supabase Auth — Send SMS Hook
 * Supabase เรียก endpoint นี้เมื่อจะส่ง OTP (signUp/signInWithOtp ด้วยเบอร์)
 * → เราส่งต่อผ่าน SMS OK แทน Twilio
 *
 * ตั้งใน Supabase: Authentication → Hooks → Send SMS Hook → URL = https://<domain>/api/auth/sms-hook
 * แล้วเอา secret ที่ได้ (v1,whsec_...) มาใส่ env: SEND_SMS_HOOK_SECRET
 *
 * ยืนยันลายเซ็นตามสเปก Standard Webhooks (headers: webhook-id/-timestamp/-signature)
 */

function verifySignature(secretRaw: string, id: string, ts: string, body: string, sigHeader: string): boolean {
  const secret = secretRaw.replace(/^v1,/, "").replace(/^whsec_/, "");
  let key: Buffer;
  try {
    key = Buffer.from(secret, "base64");
  } catch {
    return false;
  }
  const expected = crypto.createHmac("sha256", key).update(`${id}.${ts}.${body}`).digest("base64");
  const exp = Buffer.from(expected);
  // header: "v1,<sig> v1,<sig2>" — ผ่านถ้าตรงอันใดอันหนึ่ง
  return sigHeader.split(" ").some((part) => {
    const sig = part.includes(",") ? part.split(",")[1] : part;
    const a = Buffer.from(sig);
    return a.length === exp.length && crypto.timingSafeEqual(a, exp);
  });
}

export async function POST(req: Request) {
  const secret = process.env.SEND_SMS_HOOK_SECRET;
  if (!secret) return NextResponse.json({ error: { http_code: 500, message: "hook not configured" } }, { status: 500 });

  const raw = await req.text();
  const id = req.headers.get("webhook-id") ?? "";
  const ts = req.headers.get("webhook-timestamp") ?? "";
  const sig = req.headers.get("webhook-signature") ?? "";

  if (!verifySignature(secret, id, ts, raw, sig)) {
    return NextResponse.json({ error: { http_code: 401, message: "invalid signature" } }, { status: 401 });
  }
  // กัน replay — timestamp ไม่เกิน 5 นาที
  const tsNum = Number(ts) * 1000;
  if (!tsNum || Math.abs(Date.now() - tsNum) > 5 * 60 * 1000) {
    return NextResponse.json({ error: { http_code: 400, message: "stale timestamp" } }, { status: 400 });
  }

  let payload: { user?: { phone?: string }; sms?: { otp?: string } };
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: { http_code: 400, message: "bad payload" } }, { status: 400 });
  }

  const phone = normalizeThaiPhone(payload.user?.phone ?? "");
  const otp = payload.sms?.otp ?? "";
  if (!/^0\d{8,9}$/.test(phone) || !otp) {
    return NextResponse.json({ error: { http_code: 400, message: "missing phone/otp" } }, { status: 400 });
  }

  const res = await sendSms(phone, `รหัสยืนยัน ถุงเขียว ของคุณคือ ${otp}`);
  if (!res.ok) {
    return NextResponse.json({ error: { http_code: 502, message: res.error } }, { status: 502 });
  }
  return NextResponse.json({});
}
