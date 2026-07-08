"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { AuthShell } from "@/components/AuthShell";
import { supabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";
import { ArrowRight, Loader2, Phone, KeyRound, CheckCircle2 } from "lucide-react";

const PHONE_RE = /^0\d{8,9}$/;
const toE164 = (p: string) => "+66" + p.trim().replace(/^0/, "");

function ForgotForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "/login";
  const { resetPassword } = useStore();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const requestOtp = async () => {
    setErr("");
    if (!PHONE_RE.test(phone.trim())) return setErr("เบอร์โทรไม่ถูกต้อง (10 หลัก ขึ้นต้น 0)");
    if (supabaseConfigured) {
      setBusy(true);
      const { error } = await createClient().auth.signInWithOtp({ phone: toE164(phone) });
      setBusy(false);
      if (error) return setErr(error.message);
    }
    setStep(2);
  };

  const verifyOtp = async () => {
    setErr("");
    if (otp.trim().length !== 6) return setErr("กรอกรหัส OTP 6 หลัก");
    if (supabaseConfigured) {
      setBusy(true);
      const { error } = await createClient().auth.verifyOtp({ phone: toE164(phone), token: otp.trim(), type: "sms" });
      setBusy(false);
      if (error) return setErr(error.message);
    }
    setStep(3);
  };

  const savePassword = async () => {
    setErr("");
    if (password.length < 6) return setErr("รหัสผ่านอย่างน้อย 6 ตัวอักษร");
    if (password !== confirm) return setErr("รหัสผ่านยืนยันไม่ตรงกัน");
    setBusy(true);
    const res = await resetPassword(phone, password);
    setBusy(false);
    if (!res.ok) return setErr(res.error ?? "ตั้งรหัสผ่านใหม่ไม่สำเร็จ");
    setStep(4);
  };

  return (
    <AuthShell subtitle="ลืมรหัสผ่าน — ตั้งรหัสใหม่ด้วย OTP">
      {step === 1 && (
        <>
          <div className="mb-1 text-lg font-bold text-neutral-800">ลืมรหัสผ่าน</div>
          <p className="mb-4 text-sm text-neutral-500">กรอกเบอร์ที่สมัครไว้ เราจะส่งรหัส OTP ไปให้</p>
          <label className="label">เบอร์โทรศัพท์</label>
          <div className="relative">
            <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input className="input pl-9" inputMode="numeric" maxLength={10} placeholder="08x-xxx-xxxx" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} onKeyDown={(e) => e.key === "Enter" && requestOtp()} />
          </div>
          {err && <p className="mt-2 text-sm text-red-500">{err}</p>}
          <button className="btn-primary mt-3 w-full" onClick={requestOtp} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>ขอรหัส OTP <ArrowRight className="h-4 w-4" /></>}
          </button>
          <p className="mt-4 text-center text-sm text-neutral-500">
            จำรหัสผ่านได้แล้ว? <Link href={next} className="font-semibold text-brand-600">เข้าสู่ระบบ</Link>
          </p>
        </>
      )}

      {step === 2 && (
        <>
          <div className="mb-1 text-lg font-bold text-neutral-800">ยืนยันเบอร์โทร</div>
          <p className="mb-4 text-sm text-neutral-500">ส่งรหัส OTP 6 หลักไปที่ <span className="font-semibold text-neutral-700">{phone}</span></p>
          <input className="input tracking-[0.5em] text-center text-lg" inputMode="numeric" maxLength={6} placeholder="______" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} onKeyDown={(e) => e.key === "Enter" && verifyOtp()} />
          {!supabaseConfigured && <p className="mt-1.5 text-xs text-brand-600">🔐 โหมดทดลอง: กรอกเลขอะไรก็ได้ 6 หลัก</p>}
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
