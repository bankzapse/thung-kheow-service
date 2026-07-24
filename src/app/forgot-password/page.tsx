"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { AuthShell } from "@/components/AuthShell";
import { supabaseConfigured } from "@/lib/supabase/config";
import { friendlyError } from "@/lib/authError";
import { ArrowRight, Loader2, Phone, KeyRound, CheckCircle2 } from "lucide-react";

const PHONE_RE = /^0\d{8,9}$/;
const SUPPORT_TEL_DISPLAY = "089-261-6445"; // เบอร์บริษัท (ตรงกับ /terms · /privacy)

function ForgotForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "/login";
  const { resetPassword } = useStore();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpToken, setOtpToken] = useState<string | null>(null);
  const [smsMode, setSmsMode] = useState(false); // true = ส่ง OTP จริงผ่าน SMS OK
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const requestOtp = async () => {
    if (busy) return;
    setErr("");
    if (!PHONE_RE.test(phone.trim())) return setErr("เบอร์โทรไม่ถูกต้อง (10 หลัก ขึ้นต้น 0)");
    setBusy(true);
    try {
      // ส่ง OTP ผ่านระบบของแอปเอง (SMS OK ตรงๆ) — ทั้งโหมด Supabase และเดโม
      // (ไม่พึ่ง Send SMS Hook ของ Supabase ที่อาจตั้งค่าไม่ครบ)
      // purpose:"reset" → เช็คก่อนว่ามีบัญชีสำหรับเบอร์นี้ ถึงจะส่ง OTP (กัน SMS รั่ว)
      const r = await fetch("/api/otp/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: phone.trim(), purpose: "reset" }) });
      const j = await r.json().catch(() => ({ ok: false }));
      if (j.notFound) return setErr(`ไม่พบเบอร์ ${phone.trim()} ในระบบ — ตรวจเบอร์อีกครั้ง หรือติดต่อบริษัท ${SUPPORT_TEL_DISPLAY}`);
      if (!r.ok || j.ok === false) return setErr(friendlyError(j.error, "ส่งรหัส OTP ไม่สำเร็จ"));
      setSmsMode(!!j.configured);
      setOtpToken(j.token ?? null);
      setStep(2);
    } catch (e) {
      setErr(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async () => {
    if (busy) return;
    setErr("");
    if (otp.trim().length !== 6) return setErr("กรอกรหัส OTP 6 หลัก");
    setBusy(true);
    try {
      if (smsMode) {
        const v = await fetch("/api/otp/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: phone.trim(), code: otp.trim(), token: otpToken }) })
          .then((r) => r.json())
          .catch(() => ({ ok: false }));
        if (!v.ok) return setErr("รหัส OTP ไม่ถูกต้องหรือหมดอายุ — กดเปลี่ยนเบอร์เพื่อขอใหม่");
      }
      setStep(3);
    } catch (e) {
      setErr(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  const savePassword = async () => {
    if (busy) return;
    setErr("");
    if (password.length < 6) return setErr("รหัสผ่านอย่างน้อย 6 ตัวอักษร");
    if (password !== confirm) return setErr("รหัสผ่านยืนยันไม่ตรงกัน");
    setBusy(true);
    try {
      if (supabaseConfigured) {
        // ตั้งรหัสผ่านใหม่ผ่าน service-role (ยืนยัน OTP อีกครั้งฝั่ง server) — ไม่ต้องมี session
        const r = await fetch("/api/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: phone.trim(), password, code: otp.trim(), token: otpToken }) });
        const j = await r.json().catch(() => ({ ok: false }));
        if (!r.ok || j.ok === false) return setErr(friendlyError(j.error, "ตั้งรหัสผ่านใหม่ไม่สำเร็จ"));
        setStep(4);
        return;
      }
      const res = await resetPassword(phone, password);
      if (!res.ok) return setErr(res.error ?? "ตั้งรหัสผ่านใหม่ไม่สำเร็จ");
      setStep(4);
    } catch (e) {
      setErr(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell subtitle="ลืมรหัสผ่าน — ตั้งรหัสใหม่ด้วย OTP">
      {step === 1 && (
        <>
          <div className="mb-1 text-lg font-bold text-neutral-800">ลืมรหัสผ่าน</div>
          <p className="mb-4 text-sm text-neutral-500">กรอกเบอร์ที่ผูกไว้กับบัญชี เราจะส่งรหัส OTP ไปยืนยัน</p>
          <label className="label">เบอร์โทรศัพท์</label>
          <div className="relative">
            <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input className="input pl-9" inputMode="numeric" maxLength={10} placeholder="08x-xxx-xxxx" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} onKeyDown={(e) => e.key === "Enter" && requestOtp()} />
          </div>
          {err && <p className="mt-2 text-sm text-red-500">{err}</p>}
          <button className="btn-primary mt-3 w-full" onClick={requestOtp} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>ขอรหัส OTP <ArrowRight className="h-4 w-4" /></>}
          </button>
          <div className="mt-4 rounded-xl bg-neutral-50 px-3 py-2.5 text-xs text-neutral-500 ring-1 ring-neutral-100">
            จำเบอร์ที่ผูกไว้ไม่ได้ หรือบัญชีไม่มีเบอร์? ติดต่อบริษัทเพื่อรีเซ็ตให้:{" "}
            <a href={`tel:${SUPPORT_TEL_DISPLAY.replace(/-/g, "")}`} className="font-semibold text-brand-600">{SUPPORT_TEL_DISPLAY}</a>
          </div>
          <p className="mt-3 text-center text-sm text-neutral-500">
            จำรหัสผ่านได้แล้ว? <Link href={next} className="font-semibold text-brand-600">เข้าสู่ระบบ</Link>
          </p>
        </>
      )}

      {step === 2 && (
        <>
          <div className="mb-1 text-lg font-bold text-neutral-800">ยืนยันเบอร์โทร</div>
          <p className="mb-4 text-sm text-neutral-500">ส่งรหัส OTP 6 หลักไปที่ <span className="font-semibold text-neutral-700">{phone}</span></p>
          <input className="input tracking-[0.5em] text-center text-lg" inputMode="numeric" maxLength={6} placeholder="______" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} onKeyDown={(e) => e.key === "Enter" && verifyOtp()} />
          {!smsMode && <p className="mt-1.5 text-xs text-brand-600">🔐 โหมดทดลอง: กรอกเลขอะไรก็ได้ 6 หลัก</p>}
          {err && <p className="mt-2 text-sm text-red-500">{err}</p>}
          <button className="btn-primary mt-3 w-full" onClick={verifyOtp} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "ยืนยัน OTP"}
          </button>
          <button className="btn-ghost mt-2 w-full text-sm text-neutral-500" onClick={() => { setStep(1); setErr(""); }}>เปลี่ยนเบอร์</button>
        </>
      )}

      {step === 3 && (
        <>
          <div className="mb-1 text-lg font-bold text-neutral-800">ตั้งรหัสผ่านใหม่</div>
          <p className="mb-4 text-sm text-neutral-500">รหัสผ่านใหม่สำหรับเบอร์ {phone}</p>
          <div className="space-y-3">
            <div>
              <label className="label">รหัสผ่านใหม่</label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <input className="input pl-9" type="password" placeholder="อย่างน้อย 6 ตัวอักษร" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="label">ยืนยันรหัสผ่านใหม่</label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <input className="input pl-9" type="password" placeholder="พิมพ์อีกครั้ง" value={confirm} onChange={(e) => setConfirm(e.target.value)} onKeyDown={(e) => e.key === "Enter" && savePassword()} />
              </div>
            </div>
            {err && <p className="text-sm text-red-500">{err}</p>}
            <button className="btn-primary w-full" onClick={savePassword} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "บันทึกรหัสผ่านใหม่"}
            </button>
          </div>
        </>
      )}

      {step === 4 && (
        <div className="py-4 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-600">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <p className="text-lg font-bold text-neutral-800">ตั้งรหัสผ่านใหม่สำเร็จ</p>
          <p className="mt-1 text-sm text-neutral-500">เข้าสู่ระบบด้วยรหัสผ่านใหม่ได้เลย</p>
          <button className="btn-primary mt-4 w-full" onClick={() => router.replace(next)}>ไปหน้าเข้าสู่ระบบ</button>
        </div>
      )}
    </AuthShell>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="grid min-h-dvh place-items-center text-white">…</div>}>
      <ForgotForm />
    </Suspense>
  );
}
