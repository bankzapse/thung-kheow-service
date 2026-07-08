"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { Segmented } from "@/components/ui";
import { supabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";
import { liffConfigured, getLineProfile, getLiffAccessToken } from "@/lib/liff";
import { Logo } from "@/components/Logo";
import type { Role } from "@/lib/types";
import { ArrowRight, Loader2, MessageCircle, User, Building2, ShieldCheck, Phone, Mail, KeyRound } from "lucide-react";

const toE164 = (p: string) => "+66" + p.trim().replace(/^0/, "");

export type PortalKey = "seller" | "franchise" | "company";

interface Portal {
  key: PortalKey;
  path: string;
  title: string; // ผู้ขาย
  label: string; // badge: สำหรับผู้ขาย
  subtitle: string;
  icon: React.ReactNode;
  theme: "green" | "teal" | "greenDeep";
  methods: ("phone" | "email")[];
  line: boolean;
  register: boolean;
  allowedRoles: Role[];
  demoUserId: string;
  demoHint: string;
}

const THEMES = {
  green: { grad: "from-brand-500 via-brand-600 to-brand-700", badge: "bg-brand-50 text-brand-700" },
  teal: { grad: "from-emerald-500 via-emerald-600 to-teal-700", badge: "bg-emerald-50 text-emerald-700" },
  greenDeep: { grad: "from-brand-600 via-brand-700 to-emerald-900", badge: "bg-brand-50 text-brand-700" },
};

export const PORTALS: Record<PortalKey, Portal> = {
  seller: {
    key: "seller",
    path: "/login",
    title: "ผู้ขาย",
    label: "สำหรับผู้ขาย",
    subtitle: "หย่อนขยะรีไซเคิล • สะสมแต้ม • แลกเป็นเงิน",
    icon: <User className="h-3.5 w-3.5" />,
    theme: "green",
    methods: ["phone", "email"],
    line: true,
    register: true,
    allowedRoles: ["seller"],
    demoUserId: "u-seller",
    demoHint: "081-234-5678",
  },
  franchise: {
    key: "franchise",
    path: "/login/franchise",
    title: "แฟรนไชส์",
    label: "สำหรับเจ้าของแฟรนไชส์",
    subtitle: "จัดการตู้ • ถุง • รายได้ & ส่วนแบ่ง",
    icon: <Building2 className="h-3.5 w-3.5" />,
    theme: "teal",
    methods: ["phone", "email"],
    line: false,
    register: false,
    allowedRoles: ["franchise"],
    demoUserId: "u-franchise",
    demoHint: "095-555-0000",
  },
  company: {
    key: "company",
    path: "/login/company",
    title: "บริษัท",
    label: "สำหรับทีมบริษัท (Admin)",
    subtitle: "ระบบหลังบ้าน • ภาพรวม & จัดการแฟรนไชส์",
    icon: <ShieldCheck className="h-3.5 w-3.5" />,
    theme: "greenDeep",
    methods: ["email"],
    line: false,
    register: false,
    allowedRoles: ["admin"],
    demoUserId: "u-admin",
    demoHint: "admin@demo.com",
  },
};

export function AuthScreen({ portalKey }: { portalKey: PortalKey }) {
  const portal = PORTALS[portalKey];
  const theme = THEMES[portal.theme];
  const router = useRouter();
  const { findByPhone, findByEmail, loginAs, loginWithLine, currentUser } = useStore();

  const [mode, setMode] = useState<"phone" | "email">(portal.methods[0]);
  const [lineBusy, setLineBusy] = useState(liffConfigured);
  const [phone, setPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const others = useMemo(() => Object.values(PORTALS).filter((p) => p.key !== portal.key), [portal.key]);

  // เดโม: ลิงก์ ?as=admin|franchise|seller|buyer → เข้าบทบาทนั้นทันที (สำหรับเทส)
  useEffect(() => {
    if (supabaseConfigured || currentUser) return;
    const DEMO: Record<string, string> = { admin: "u-admin", company: "u-admin", franchise: "u-franchise", seller: "u-seller", buyer: "u-buyer" };
    const as = new URLSearchParams(window.location.search).get("as");
    if (as && DEMO[as]) loginAs(DEMO[as]);
  }, [currentUser, loginAs]);

  // มี user แล้ว → ไปหน้าที่เหมาะกับ role
  useEffect(() => {
    if (!currentUser) return;
    const dest = currentUser.role === "admin" ? "/admin" : currentUser.role === "franchise" ? "/franchise" : currentUser.role === "buyer" ? "/shop" : "/home";
    router.replace(dest);
  }, [currentUser, router]);

  // ตรวจว่า role ตรงกับ portal (โหมดเดโม) — ไม่ตรง = เด้ง error
  const checkRole = (role: Role) => {
    if (portal.allowedRoles.includes(role)) return true;
    const owner = PORTALS[(["seller", "franchise", "company"] as PortalKey[]).find((k) => PORTALS[k].allowedRoles.includes(role)) ?? "seller"];
    setErr(`บัญชีนี้เป็นของ “${owner.title}” — โปรดเข้าที่หน้าเข้าสู่ระบบของ ${owner.title}`);
    return false;
  };

  const runLineLogin = useCallback(async () => {
    setErr("");
    setLineBusy(true);
    try {
      if (supabaseConfigured) {
        const token = await getLiffAccessToken();
        if (!token) return setLineBusy(false);
        const res = await fetch("/api/line/liff-login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accessToken: token }) });
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
    if (liffConfigured && portal.line) runLineLogin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runLineLogin]);

  if (liffConfigured && portal.line && lineBusy) {
    return (
      <div className="grid min-h-dvh place-items-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#06C755] text-white"><MessageCircle className="h-7 w-7" /></div>
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
    } else {
      const u = findByPhone(phone);
      if (!u) return portal.register ? router.push(`/register?phone=${encodeURIComponent(phone.trim())}`) : setErr("ไม่พบบัญชีนี้");
      if (!checkRole(u.role)) return;
      loginAs(u.id);
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
      if (!checkRole(u.role)) return;
      loginAs(u.id);
    }
  };

  return (
    <div className={`relative min-h-dvh overflow-hidden bg-gradient-to-br ${theme.grad}`}>
      <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />

      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-10">
        {/* brand */}
        <div className="mb-6 text-center text-white">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/95 p-2 shadow-lg">
            <Logo size={44} />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">ถุงเขียว</h1>
          <p className="mt-1 text-sm text-white/80">{portal.subtitle}</p>
        </div>

        {/* card */}
        <div className="rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-black/5">
          <div className={`mb-5 inline-flex items-center gap-1.5 rounded-full ${theme.badge} px-3 py-1 text-xs font-semibold`}>
            {portal.icon} {portal.label}
          </div>

          {portal.methods.length > 1 && (
            <div className="mb-4">
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
            </div>
          )}

          {mode === "phone" ? (
            <div className="space-y-3">
              <div>
                <label className="label">เบอร์โทรศัพท์</label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                  <input className="input pl-9" inputMode="numeric" placeholder="08x-xxx-xxxx" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={otpSent} />
                </div>
              </div>
              {otpSent && (
                <div className="animate-fade-in">
                  <label className="label">รหัส OTP</label>
                  <input className="input tracking-[0.5em]" inputMode="numeric" maxLength={6} placeholder="______" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} />
                  {!supabaseConfigured && <p className="mt-1.5 text-xs text-brand-600">🔐 โหมดทดลอง: กรอกเลขอะไรก็ได้ 6 หลัก</p>}
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
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                  <input className="input pl-9" type="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="label">รหัสผ่าน</label>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                  <input className="input pl-9" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
              </div>
              {err && <p className="text-sm text-red-500">{err}</p>}
              <button className="btn-primary w-full" onClick={emailLogin} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "เข้าสู่ระบบ"}
              </button>
            </div>
          )}

          {portal.line && liffConfigured && (
            <button onClick={runLineLogin} className="btn mt-3 w-full bg-[#06C755] text-white">
              <MessageCircle className="h-4 w-4" /> เข้าสู่ระบบด้วย LINE
            </button>
          )}

          {portal.register && (
            <p className="mt-4 text-center text-sm text-neutral-500">
              ยังไม่มีบัญชี? <Link href="/register" className="font-semibold text-brand-600">ลงทะเบียน</Link>
            </p>
          )}

          {!supabaseConfigured && (
            <p className="mt-4 rounded-xl bg-neutral-50 px-3 py-2 text-center text-xs text-neutral-500">
              โหมดทดลอง — {mode === "phone" ? "เบอร์" : "อีเมล"}: <span className="font-semibold text-neutral-700">{portal.demoHint}</span>
            </p>
          )}
        </div>

        {/* switch portals */}
        <div className="mt-6 text-center text-xs text-white/75">
          เข้าสู่ระบบสำหรับส่วนอื่น:{" "}
          {others.map((o, i) => (
            <span key={o.key}>
              {i > 0 && <span className="mx-1 text-white/40">·</span>}
              <Link href={o.path} className="font-semibold text-white underline-offset-2 hover:underline">{o.title}</Link>
            </span>
          ))}
        </div>

        <p className="mt-4 text-center text-[11px] text-white/60">
          การใช้บริการถือว่ายอมรับ{" "}
          <Link href="/terms" className="underline">ข้อกำหนดการใช้งาน</Link> และ{" "}
          <Link href="/privacy" className="underline">นโยบายความเป็นส่วนตัว</Link>
        </p>
      </div>
    </div>
  );
}
