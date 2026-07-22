"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { AuthShell } from "@/components/AuthShell";
import { supabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/authError";
import { ArrowRight, Loader2, User, Phone, Mail, KeyRound } from "lucide-react";

const PHONE_RE = /^0\d{8,9}$/;
const toE164 = (p: string) => "+66" + p.trim().replace(/^0/, "");

function RegisterForm() {
  const router = useRouter();
  const { registerAccount, currentUser } = useStore();

  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [otp, setOtp] = useState("");
  const [otpToken, setOtpToken] = useState<string | null>(null);
  const [smsMode, setSmsMode] = useState(false); // true = ส่ง OTP จริงผ่าน SMS OK
  const [agreed, setAgreed] = useState(false); // ยินยอม PDPA + อายุ 15+
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (currentUser) router.replace("/home");
  }, [currentUser, router]);

  const requestOtp = async () => {
    if (busy) return;
    setErr("");
    if (name.trim().length < 2) return setErr("กรอกชื่อ-นามสกุล");
    if (!PHONE_RE.test(phone.trim())) return setErr("เบอร์โทรไม่ถูกต้อง (10 หลัก ขึ้นต้น 0)");
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) return setErr("อีเมลไม่ถูกต้อง");
    if (password.length < 6) return setErr("รหัสผ่านอย่างน้อย 6 ตัวอักษร");
    if (password !== confirm) return setErr("รหัสผ่านยืนยันไม่ตรงกัน");
    if (!agreed) return setErr("กรุณายอมรับข้อกำหนดและนโยบายความเป็นส่วนตัว");
    setBusy(true);
    try {
      // ส่ง OTP ผ่านระบบของแอปเอง (SMS OK) — ทั้งโหมด Supabase และเดโม (ไม่พึ่ง Send SMS Hook ที่อาจ 404)
      const r = await fetch("/api/otp/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: phone.trim() }) });
      const j = await r.json().catch(() => ({ ok: false }));
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

  const confirmOtp = async () => {
    if (busy) return;
    setErr("");
    if (otp.trim().length !== 6) return setErr("กรอกรหัส OTP 6 หลัก");
    setBusy(true);
    try {
      if (supabaseConfigured) {
        // สร้างบัญชีผ่าน service-role (ยืนยัน OTP ฝั่ง server) → แล้วเข้าสู่ระบบเพื่อรับ session
        const r = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim(), phone: phone.trim(), email: email || undefined, password, code: otp.trim(), token: otpToken, consent: agreed }) });
        const j = await r.json().catch(() => ({ ok: false }));
        if (!r.ok || j.ok === false) return setErr(friendlyError(j.error, "สมัครไม่สำเร็จ"));
        const { error } = await createClient().auth.signInWithPassword({ phone: toE164(phone), password });
        if (error) return setErr(friendlyError(error, "สมัครสำเร็จ — กรุณาเข้าสู่ระบบ"));
        return; // session → redirect effect
      }
      if (smsMode) {
        const v = await fetch("/api/otp/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: phone.trim(), code: otp.trim(), token: otpToken }) })
          .then((r) => r.json())
          .catch(() => ({ ok: false }));
        if (!v.ok) return setErr("รหัส OTP ไม่ถูกต้องหรือหมดอายุ — กดส่งรหัสใหม่");
      }
      const res = await registerAccount({ name, phone, email: email || undefined, password });
      if (!res.ok) return setErr(res.error ?? "สมัครไม่สำเร็จ");
      // demo: registerAccount ตั้ง currentUser แล้ว → redirect effect
    } catch (e) {
      setErr(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell subtitle="สมัครสมาชิก — เริ่มหย่อนถุงรับคะแนน">
      {step === 1 ? (
        <>
          <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
            <User className="h-3.5 w-3.5" /> สมัครสำหรับผู้ขาย
          </div>
          <div className="space-y-3">
            <Field label="ชื่อ-นามสกุล" icon={<User className="h-4 w-4" />}>
              <input className="input pl-9" placeholder="เช่น สมชาย ใจดี" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="เบอร์โทรศัพท์" icon={<Phone className="h-4 w-4" />}>
              <input className="input pl-9" inputMode="numeric" maxLength={10} placeholder="08x-xxx-xxxx" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} />
            </Field>
            <Field label="อีเมล (ไม่บังคับ)" icon={<Mail className="h-4 w-4" />}>
              <input className="input pl-9" type="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label="รหัสผ่าน" icon={<KeyRound className="h-4 w-4" />}>
              <input className="input pl-9" type="password" placeholder="อย่างน้อย 6 ตัวอักษร" value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
            <Field label="ยืนยันรหัสผ่าน" icon={<KeyRound className="h-4 w-4" />}>
              <input className="input pl-9" type="password" placeholder="พิมพ์รหัสผ่านอีกครั้ง" value={confirm} onChange={(e) => setConfirm(e.target.value)} onKeyDown={(e) => e.key === "Enter" && requestOtp()} />
            </Field>
            <label className="flex cursor-pointer items-start gap-2 pt-1 text-xs text-neutral-600">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-brand-600" />
              <span>
                ฉันมีอายุ 15 ปีขึ้นไป และได้อ่าน · ยอมรับ{" "}
                <Link href="/terms" className="font-semibold text-brand-600 underline">ข้อกำหนดการใช้งาน</Link> และ{" "}
                <Link href="/privacy" className="font-semibold text-brand-600 underline">นโยบายความเป็นส่วนตัว</Link>{" "}
                รวมถึงยินยอมให้เก็บและใช้ข้อมูลส่วนบุคคลตามนโยบายดังกล่าว
              </span>
            </label>
            {err && <p className="text-sm text-red-500">{err}</p>}
            <button className="btn-primary w-full" onClick={requestOtp} disabled={busy || !agreed}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>ขอรหัส OTP <ArrowRight className="h-4 w-4" /></>}
            </button>
          </div>
          <p className="mt-4 text-center text-sm text-neutral-500">
            มีบัญชีแล้ว? <Link href="/login" className="font-semibold text-brand-600">เข้าสู่ระบบ</Link>
          </p>
        </>
      ) : (
        <>
          <div className="mb-1 text-lg font-bold text-neutral-800">ยืนยันเบอร์โทร</div>
          <p className="mb-4 text-sm text-neutral-500">ส่งรหัส OTP 6 หลักไปที่ <span className="font-semibold text-neutral-700">{phone}</span></p>
          <input
            className="input tracking-[0.5em] text-center text-lg"
            inputMode="numeric"
            maxLength={6}
            placeholder="______"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) => e.key === "Enter" && confirmOtp()}
          />
          {!smsMode && <p className="mt-1.5 text-xs text-brand-600">🔐 โหมดทดลอง: กรอกเลขอะไรก็ได้ 6 หลัก</p>}
          {err && <p className="mt-2 text-sm text-red-500">{err}</p>}
          <button className="btn-primary mt-3 w-full" onClick={confirmOtp} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "ยืนยัน & สมัครสมาชิก"}
          </button>
          <div className="mt-2 flex items-center justify-between text-sm">
            <button className="text-neutral-500 hover:text-neutral-700" onClick={() => { setStep(1); setErr(""); setOtp(""); }} disabled={busy}>← แก้ไขข้อมูล</button>
            <button className="font-medium text-brand-600 disabled:opacity-50" onClick={() => { setOtp(""); requestOtp(); }} disabled={busy}>ส่งรหัสใหม่</button>
          </div>
        </>
      )}
    </AuthShell>
  );
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">{icon}</span>
        {children}
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="grid min-h-dvh place-items-center text-white">…</div>}>
      <RegisterForm />
    </Suspense>
  );
}
