"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { Segmented } from "@/components/ui";
import { supabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";
import { liffConfigured, getLineProfile, getLiffAccessToken } from "@/lib/liff";
import { ArrowRight, Store, Truck, ShieldCheck, Loader2, MessageCircle } from "lucide-react";
import { Logo } from "@/components/Logo";

const toE164 = (p: string) => "+66" + p.trim().replace(/^0/, "");

export default function LoginPage() {
  const router = useRouter();
  const { findByPhone, findByEmail, loginAs, loginWithLine, currentUser } = useStore();
  const [mode, setMode] = useState<"phone" | "email">("phone");
  const [lineBusy, setLineBusy] = useState(liffConfigured);

  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  // เดโม: ลิงก์ ?as=admin|franchise|seller|buyer → เข้าบทบาทนั้นทันที (สำหรับเทส)
  useEffect(() => {
    if (supabaseConfigured || currentUser) return;
    const DEMO: Record<string, string> = {
      admin: "u-admin",
      company: "u-admin",
      franchise: "u-franchise",
      seller: "u-seller",
      buyer: "u-buyer",
    };
    const as = new URLSearchParams(window.location.search).get("as");
    if (as && DEMO[as]) loginAs(DEMO[as]);
  }, [currentUser, loginAs]);

  // เมื่อมี user (จากเดโม หรือ Supabase session) → ไปหน้าที่เหมาะกับ role
  useEffect(() => {
    if (!currentUser) return;
    const dest = currentUser.role === "admin" ? "/admin" : currentUser.role === "franchise" ? "/franchise" : "/home";
    router.replace(dest);
  }, [currentUser, router]);

  // LIFF: auto-login ด้วยบัญชี LINE (Supabase → แลก token เป็น session · เดโม → user ในเครื่อง)
  const runLineLogin = useCallback(async () => {
    setErr("");
    setLineBusy(true);
    try {
      if (supabaseConfigured) {
        const token = await getLiffAccessToken();
        if (!token) return setLineBusy(false);
        const res = await fetch("/api/line/liff-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken: token }),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok || !j.email) {
          setErr(j.error ?? "เข้าสู่ระบบด้วย LINE ไม่สำเร็จ");
          return setLineBusy(false);
        }
        const { error } = await createClient().auth.verifyOtp({ email: j.email, token: j.otp, type: "email" });
        if (error) {
          setErr(error.message);
          return setLineBusy(false);
        }
        // session → onAuthStateChange → effect redirect
      } else {
        const profile = await getLineProfile();
        if (profile) loginWithLine(profile);
        else setLineBusy(false);
      }
    } catch {
      setLineBusy(false);
    }
  }, [loginWithLine]);

  useEffect(() => {
    if (liffConfigured) runLineLogin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runLineLogin]);

  if (liffConfigured && lineBusy) {
    return (
      <div className="grid min-h-dvh place-items-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#06C755] text-white">
            <MessageCircle className="h-7 w-7" />
          </div>
          <p className="font-semibold text-neutral-700">กำลังเข้าสู่ระบบผ่าน LINE…</p>
          <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
        </div>
      </div>
    );
  }

  const sendOtp = async () => {
    setErr("");
    if (!/^0\d{8,9}$/.test(phone.trim())) return setErr("กรุณากรอกเบอร์โทรให้ถูกต้อง");
    if (supabaseConfigured) {
      setBusy(true);
      const { error } = await createClient().auth.signInWithOtp({ phone: toE164(phone) });
      setBusy(false);
      if (error) return setErr(error.message);
    }
    setOtpSent(true);
  };

  const verifyOtp = async () => {
    setErr("");
    if (otp.trim().length !== 6) return setErr("กรอกรหัส OTP 6 หลัก");
    if (supabaseConfigured) {
      setBusy(true);
      const { error } = await createClient().auth.verifyOtp({ phone: toE164(phone), token: otp.trim(), type: "sms" });
      setBusy(false);
      if (error) return setErr(error.message);
      // store hydrate ผ่าน onAuthStateChange → effect ด้านบน redirect
    } else {
      const u = findByPhone(phone);
      if (u) loginAs(u.id);
      else router.push(`/register?phone=${encodeURIComponent(phone.trim())}`);
    }
  };

  const emailLogin = async () => {
    setErr("");
    if (supabaseConfigured) {
      setBusy(true);
      const { error } = await createClient().auth.signInWithPassword({ email: email.trim(), password });
      setBusy(false);
      if (error) return setErr(error.message);
    } else {
      const u = findByEmail(email);
      if (!u) return setErr("ไม่พบบัญชีนี้ — กรุณาลงทะเบียนก่อน");
      loginAs(u.id);
    }
  };

  return (
    <div className="min-h-dvh bg-white">
      <div className="relative overflow-hidden bg-brand-600 px-6 pb-10 pt-14 text-white">
        <div className="absolute -right-8 -top-10 h-40 w-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-12 -left-6 h-32 w-32 rounded-full bg-white/10" />
        <div className="relative">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white p-1.5 shadow-card">
            <Logo size={40} />
          </div>
          <h1 className="text-2xl font-extrabold">ถุงเขียว</h1>
          <p className="mt-1 text-sm text-white/85">หย่อนขยะรีไซเคิล • สะสมแต้ม • แลกเป็นเงิน</p>
        </div>
      </div>

      <div className="mx-auto -mt-6 max-w-md px-5">
        <div className="card space-y-4">
          <Segmented
            value={mode}
            onChange={(v) => {
              setMode(v);
              setErr("");
            }}
            options={[
              { value: "phone", label: "เบอร์โทรศัพท์" },
              { value: "email", label: "อีเมล" },
            ]}
          />

          {mode === "phone" ? (
            <div className="space-y-3">
              <div>
                <label className="label">เบอร์โทรศัพท์</label>
                <input className="input" inputMode="numeric" placeholder="08x-xxx-xxxx" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={otpSent} />
              </div>
              {otpSent && (
                <div className="animate-fade-in">
                  <label className="label">รหัส OTP</label>
                  <input className="input tracking-[0.5em]" inputMode="numeric" maxLength={6} placeholder="______" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} />
                  {!supabaseConfigured && <p className="mt-1.5 text-xs text-brand-600">🔐 โหมดเดโม: กรอกเลขอะไรก็ได้ 6 หลัก</p>}
                </div>
              )}
              {err && <p className="text-sm text-red-500">{err}</p>}
              {!otpSent ? (
                <button className="btn-primary w-full" onClick={sendOtp} disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>ขอรหัส OTP <ArrowRight className="h-4 w-4" /></>}
                </button>
              ) : (
                <button className="btn-primary w-full" onClick={verifyOtp} disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "ยืนยันเข้าสู่ระบบ"}
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="label">อีเมล</label>
                <input className="input" type="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <label className="label">รหัสผ่าน</label>
                <input className="input" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              {err && <p className="text-sm text-red-500">{err}</p>}
              <button className="btn-primary w-full" onClick={emailLogin} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "เข้าสู่ระบบ"}
              </button>
              {!supabaseConfigured && <p className="text-center text-xs text-neutral-400">เดโม: seller@demo.com / buyer@demo.com (รหัสอะไรก็ได้)</p>}
            </div>
          )}

          {liffConfigured && (
            <button onClick={runLineLogin} className="btn w-full bg-[#06C755] text-white">
              <MessageCircle className="h-4 w-4" /> เข้าสู่ระบบด้วย LINE
            </button>
          )}
          <p className="text-center text-sm text-neutral-500">
            ยังไม่มีบัญชี?{" "}
            <Link href="/register" className="font-semibold text-brand-600">ลงทะเบียน</Link>
          </p>
        </div>

        {!supabaseConfigured && (
          <>
            <div className="mt-5">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-neutral-400">
                <ShieldCheck className="h-3.5 w-3.5" /> เข้าใช้แบบเดโมทันที (มีข้อมูลตัวอย่าง)
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => loginAs("u-seller")} className="card flex flex-col items-start gap-1.5 text-left hover:shadow-float">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-100 text-brand-700"><Store className="h-5 w-5" /></div>
                  <p className="font-semibold text-neutral-800">ผู้ขาย</p>
                  <p className="text-xs text-neutral-400">มีของเก่าจะขาย</p>
                </button>
                <button onClick={() => loginAs("u-buyer")} className="card flex flex-col items-start gap-1.5 text-left hover:shadow-float">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700"><Truck className="h-5 w-5" /></div>
                  <p className="font-semibold text-neutral-800">ผู้ซื้อ / คนขับ</p>
                  <p className="text-xs text-neutral-400">รับซื้อ + จัดตาราง</p>
                </button>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-center gap-4">
              <button onClick={() => loginAs("u-franchise")} className="text-xs font-medium text-neutral-400 hover:text-brand-600">
                เจ้าของแฟรนไชส์ →
              </button>
              <span className="text-neutral-300">·</span>
              <button onClick={() => loginAs("u-admin")} className="text-xs font-medium text-neutral-400 hover:text-brand-600">
                ผู้ดูแลระบบ (Admin) →
              </button>
            </div>
          </>
        )}
      </div>
      <footer className="px-6 pb-8 pt-4 text-center text-xs text-neutral-400">
        การใช้บริการถือว่ายอมรับ{" "}
        <Link href="/terms" className="text-brand-600">ข้อกำหนดการใช้งาน</Link> และ{" "}
        <Link href="/privacy" className="text-brand-600">นโยบายความเป็นส่วนตัว</Link>
      </footer>
    </div>
  );
}
