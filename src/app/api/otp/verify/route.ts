import { NextResponse } from "next/server";
import { verifyOtp } from "@/lib/otp";
import { normalizeThaiPhone } from "@/lib/smsok";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { phone, code, token } = await req.json().catch(() => ({}));
  const p = normalizeThaiPhone(String(phone || ""));
  const res = verifyOtp(p, String(code || "").trim(), String(token || ""));
  if (!res.ok) return NextResponse.json({ ok: false, error: res.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
