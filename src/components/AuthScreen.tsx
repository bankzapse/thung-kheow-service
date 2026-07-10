"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useStore, DEMO_PASSWORD } from "@/lib/store";
import { supabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";
import { liffConfigured, getLineProfile, getLiffAccessToken } from "@/lib/liff";
import { AuthShell } from "@/components/AuthShell";
import type { Role } from "@/lib/types";
import { Loader2, MessageCircle, User, Building2, ShieldCheck, Phone, KeyRound, PackageSearch, ArrowLeft } from "lucide-react";

export type PortalKey = "seller" | "franchise" | "company" | "center";
const PHONE_RE = /^0\d{8,9}$/;

interface Portal {
  key: PortalKey;
  path: string;
  title: string;
  label: string;
  subtitle: string;
  icon: React.ReactNode;
  grad: string;
  badge: string;
  line: boolean;
  register: boolean;
  allowedRoles: Role[];
  demoPhone: string;
}

export const PORTALS: Record<PortalKey, Portal> = {
  seller: {
    key: "seller",
    path: "/login",
    title: "ผู้ขาย",
    label: "สำหรับผู้ขาย",
    subtitle: "หย่อนขยะรีไซเคิล • สะสมแต้ม • แลกเป็นเงิน",
    icon: <User className="h-3.5 w-3.5" />,
    grad: "from-brand-500 via-brand-600 to-brand-700",
    badge: "bg-brand-50 text-brand-700",
    line: true,
    register: true,
    allowedRoles: ["seller"],
    demoPhone: "0812345678",
  },
  franchise: {
    key: "franchise",
    path: "/login/franchise",
    title: "แฟรนไชส์",
    label: "สำหรับเจ้าของแฟรนไชส์",
    subtitle: "จัดการตู้ • ถุง • รายได้ & ส่วนแบ่ง",
    icon: <Building2 className="h-3.5 w-3.5" />,
    grad: "from-emerald-500 via-emerald-600 to-teal-700",
    badge: "bg-emerald-50 text-emerald-700",
    line: false,
    register: false,
    allowedRoles: ["franchise"],
    demoPhone: "0955550000",
  },
  company: {
    key: "company",
    path: "/login/company",
    title: "บริษัท",
    label: "สำหรับทีมบริษัท (Admin)",
    subtitle: "ระบบหลังบ้าน • ภาพรวม & จัดการแฟรนไชส์",
    icon: <ShieldCheck className="h-3.5 w-3.5" />,
    grad: "from-brand-600 via-brand-700 to-emerald-900",
    badge: "bg-brand-50 text-brand-700",
    line: false,
    register: false,
    allowedRoles: ["admin"],
    demoPhone: "0900000000",
  },
  center: {
    key: "center",
    path: "/login/center",
    title: "ศูนย์คัดแยก",
    label: "สำหรับศูนย์คัดแยก",
    subtitle: "คัดแยก • ตีราคาถุง • ให้คะแนน",
    icon: <PackageSearch className="h-3.5 w-3.5" />,
    grad: "from-slate-600 via-slate-700 to-slate-800",
    badge: "bg-slate-100 text-slate-700",
    line: false,
    register: false,
    allowedRoles: ["buyer"],
    demoPhone: "0876543210",
  },
};

export function AuthScreen({ portalKey }: { portalKey: PortalKey }) {
  const portal = PORTALS[portalKey];
  const router = useRouter();
  const { loginWithPassword, loginAs, switchRole, loginWithLine, currentUser } = useStore();

  const [lineBusy, setLineBusy] = useState(liffConfigured && portal.line);
  const [phone, setPhone] = useState("");
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

  // เลือก role เป้าหมายของ portal นี้ที่บัญชีถือได้ (รองรับ multi-role) — คืน null ถ้าไม่มีสิทธิ์
  const targetRoleFor = (u: { role: Role; roles?: Role[] }): Role | null => {
    const has = u.roles ?? [u.role];
    return portal.allowedRoles.find((r) => has.includes(r)) ?? null;
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

  const doLogin = async () => {
    if (busy) return;
    setErr("");
    if (!PHONE_RE.test(phone.trim())) return setErr("กรอกเบอร์โทรให้ถูกต้อง (10 หลัก ขึ้นต้น 0)");
    if (!password) return setErr("กรอกรหัสผ่าน");
    setBusy(true);
    try {
      const res = await loginWithPassword(phone, password);
      if (!res.ok) return setErr(res.error ?? "เข้าสู่ระบบไม่สำเร็จ");
      if (res.user) {
        // เดโม: กันเข้าผิดส่วน + ตั้ง active role ให้ตรง portal (รองรับ multi-role)
        const target = targetRoleFor(res.user);
        if (!target) return setErr(`บัญชีนี้ไม่มีสิทธิ์เข้าส่วน “${portal.title}”`);
        // ตั้ง active role ให้ตรง portal ก่อน loginAs (กัน redirect ไป role เดิม)
        if (res.user.role !== target) await switchRole(target, res.user.id);
        loginAs(res.user.id);
      }
      // supabase: session ถูกตั้งแล้ว → redirect effect จัดการ (สลับบทบาทได้ที่หน้า “สลับระบบ”)
    } catch {
      setErr("เชื่อมต่อไม่สำเร็จ — ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      subtitle={portal.subtitle}
      grad={portal.grad}
      footer={
        <>
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
          <Link href="/" className="mt-4 inline-flex w-full items-center justify-center gap-1 text-xs text-white/70 hover:text-white">
            <ArrowLeft className="h-3.5 w-3.5" /> กลับหน้าหลัก
          </Link>
        </>
      }
    >
      <div className={`mb-5 inline-flex items-center gap-1.5 rounded-full ${portal.badge} px-3 py-1 text-xs font-semibold`}>
        {portal.icon} {portal.label}
      </div>

      <div className="space-y-3">
        <div>
          <label className="label">เบอร์โทรศัพท์</label>
          <div className="relative">
            <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              className="input pl-9"
              inputMode="numeric"
              maxLength={10}
              placeholder="08x-xxx-xxxx"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && doLogin()}
            />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="label">รหัสผ่าน</label>
            <Link href={`/forgot-password?next=${portal.path}`} className="text-xs font-medium text-brand-600">ลืมรหัสผ่าน?</Link>
          </div>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              className="input pl-9"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doLogin()}
            />
          </div>
        </div>
        {err && <p className="text-sm text-red-500">{err}</p>}
        <button className="btn-primary w-full" onClick={doLogin} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "เข้าสู่ระบบ"}
        </button>
      </div>

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
          โหมดทดลอง — เบอร์: <span className="font-semibold text-neutral-700">{portal.demoPhone}</span> · รหัส: <span className="font-semibold text-neutral-700">{DEMO_PASSWORD}</span>
        </p>
      )}
    </AuthShell>
  );
}
