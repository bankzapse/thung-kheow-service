"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { supabaseConfigured } from "@/lib/supabase/config";
import { Logo } from "@/components/Logo";
import { BootLoader, Spinner } from "@/components/ui";
import type { Role } from "@/lib/types";
import { User, Building2, ShieldCheck, Store, ChevronRight, ArrowLeft, Check } from "lucide-react";

// meta ต่อบทบาท (ใช้ทั้งหน้าสลับบทบาท และ demo bypass)
const ROLE_META: Record<Role, { label: string; desc: string; dest: string; icon: typeof User; grad: string; demoId: string }> = {
  seller: { label: "ผู้ขาย", desc: "หย่อนถุง · สะสมแต้ม · แลกเงิน", dest: "/home", icon: User, grad: "from-brand-500 to-brand-600", demoId: "u-seller" },
  franchise: { label: "แฟรนไชส์", desc: "จัดการตู้ · ถุง · รายได้", dest: "/franchise", icon: Building2, grad: "from-emerald-500 to-teal-600", demoId: "u-franchise" },
  admin: { label: "บริษัท", desc: "ภาพรวม · อนุมัติ · โอนเงิน", dest: "/admin", icon: ShieldCheck, grad: "from-brand-600 to-emerald-700", demoId: "u-admin" },
  buyer: { label: "ศูนย์คัดแยก", desc: "คัดแยก · ตีราคาถุง", dest: "/shop", icon: Store, grad: "from-slate-600 to-slate-700", demoId: "u-buyer" },
};
const ROLE_ORDER: Role[] = ["seller", "franchise", "admin", "buyer"];

// ปิด demo bypass เมื่อมี backend จริง (Supabase) หรือสั่งปิดชัดเจนด้วย NEXT_PUBLIC_DEMO=off
const DEMO_DISABLED = supabaseConfigured || process.env.NEXT_PUBLIC_DEMO === "off";

export default function AppChooser() {
  const { ready, currentUser, loginAs, switchRole } = useStore();
  const router = useRouter();
  const [busy, setBusy] = useState<Role | null>(null);

  // ยังไม่ล็อกอิน + ปิด demo → ไปหน้าเข้าสู่ระบบ
  useEffect(() => {
    if (DEMO_DISABLED && ready && !currentUser) router.replace("/login");
  }, [ready, currentUser, router]);

  if (!ready) return <BootLoader />;

  // ── โหมดสลับบทบาท (ล็อกอินแล้ว) ──
  if (currentUser) {
    const myRoles = ROLE_ORDER.filter((r) => (currentUser.roles ?? [currentUser.role]).includes(r));
    const enterRole = async (r: Role) => {
      if (busy) return;
      if (r === currentUser.role) { router.replace(ROLE_META[r].dest); return; }
      setBusy(r);
      const ok = await switchRole(r);
      setBusy(null);
      if (ok) router.replace(ROLE_META[r].dest);
    };
    return (
      <Shell subtitle={myRoles.length > 1 ? "เลือกบทบาทที่ต้องการเข้าใช้งาน" : "เข้าสู่ระบบของคุณ"}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {myRoles.map((r) => {
            const m = ROLE_META[r];
            const active = r === currentUser.role;
            return (
              <button
                key={r}
                onClick={() => enterRole(r)}
                disabled={!!busy}
                className="group relative flex items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-lg ring-1 ring-black/5 transition active:scale-[0.98] disabled:opacity-70"
              >
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${m.grad} text-white`}>
                  <m.icon className="h-6 w-6" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 font-bold text-neutral-800">
                    {m.label}
                    {active && <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-700">ใช้งานอยู่</span>}
                  </span>
                  <span className="block text-xs text-neutral-400">{m.desc}</span>
                </span>
                {busy === r ? <Spinner className="h-5 w-5 text-brand-500" /> : active ? <Check className="h-5 w-5 text-brand-500" /> : <ChevronRight className="h-5 w-5 text-neutral-300 transition group-hover:translate-x-0.5 group-hover:text-brand-500" />}
              </button>
            );
          })}
        </div>
        {myRoles.length === 1 && (
          <p className="mt-6 text-center text-xs text-white/70">บัญชีนี้มีบทบาทเดียว — ผู้ดูแลสามารถเพิ่มบทบาทให้ได้</p>
        )}
      </Shell>
    );
  }

  // ── โหมดเดโม (ยังไม่ล็อกอิน) : เลือกระบบไม่ต้องล็อกอิน ──
  if (DEMO_DISABLED) return <BootLoader />; // กำลัง redirect ไป /login
  const enterDemo = (r: Role) => { loginAs(ROLE_META[r].demoId); router.push(ROLE_META[r].dest); };
  return (
    <Shell subtitle="เลือกระบบที่ต้องการเข้าใช้ — โหมดสาธิต ไม่ต้องล็อกอิน">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ROLE_ORDER.map((r) => {
          const m = ROLE_META[r];
          return (
            <button key={r} onClick={() => enterDemo(r)} className="group flex items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-lg ring-1 ring-black/5 transition active:scale-[0.98]">
              <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${m.grad} text-white`}>
                <m.icon className="h-6 w-6" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold text-neutral-800">{m.label}</span>
                <span className="block text-xs text-neutral-400">{m.desc}</span>
              </span>
              <ChevronRight className="h-5 w-5 text-neutral-300 transition group-hover:translate-x-0.5 group-hover:text-brand-500" />
            </button>
          );
        })}
      </div>
      <p className="mt-6 text-center text-xs text-white/70">
        ข้อมูลทั้ง 3 ระบบเชื่อมกันชุดเดียว · หรือ{" "}
        <Link href="/login" className="font-semibold text-white underline underline-offset-2">เข้าสู่ระบบด้วยบัญชี</Link>
      </p>
    </Shell>
  );
}

function Shell({ subtitle, children }: { subtitle: string; children: React.ReactNode }) {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700">
      <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-6 py-10">
        <div className="mb-7 text-center text-white">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/95 p-2 shadow-lg">
            <Logo size={44} />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">ถุงเขียว</h1>
          <p className="mt-1 text-sm text-white/80">{subtitle}</p>
        </div>
        {children}
        <Link href="/" className="mt-4 inline-flex items-center justify-center gap-1 text-center text-xs text-white/60 hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" /> กลับหน้าหลัก
        </Link>
      </div>
    </div>
  );
}
