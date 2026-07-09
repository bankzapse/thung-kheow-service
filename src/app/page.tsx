"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { supabaseConfigured } from "@/lib/supabase/config";
import { Logo } from "@/components/Logo";
import { User, Building2, ShieldCheck, Store, ChevronRight } from "lucide-react";

const PORTALS = [
  { id: "u-seller", label: "ผู้ขาย", desc: "หย่อนถุง · สะสมแต้ม · แลกเงิน", dest: "/home", icon: User, grad: "from-brand-500 to-brand-600" },
  { id: "u-franchise", label: "แฟรนไชส์", desc: "จัดการตู้ · ถุง · รายได้", dest: "/franchise", icon: Building2, grad: "from-emerald-500 to-teal-600" },
  { id: "u-admin", label: "บริษัท", desc: "ภาพรวม · อนุมัติ · โอนเงิน", dest: "/admin", icon: ShieldCheck, grad: "from-brand-600 to-emerald-700" },
  { id: "u-buyer", label: "ศูนย์คัดแยก", desc: "คัดแยก · ตีราคาถุง", dest: "/shop", icon: Store, grad: "from-slate-600 to-slate-700" },
];

export default function Index() {
  const { ready, loginAs } = useStore();
  const router = useRouter();

  // production (Supabase): ใช้ล็อกอินจริง
  useEffect(() => {
    if (supabaseConfigured && ready) router.replace("/login");
  }, [ready, router]);

  const enter = (id: string, dest: string) => {
    loginAs(id);
    router.push(dest);
  };

  if (supabaseConfigured) {
    return <div className="grid min-h-dvh place-items-center text-neutral-400">กำลังโหลด…</div>;
  }

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
          <p className="mt-1 text-sm text-white/80">เลือกระบบที่ต้องการเข้าใช้ — โหมดสาธิต ไม่ต้องล็อกอิน</p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {PORTALS.map((p) => (
            <button
              key={p.id}
              onClick={() => enter(p.id, p.dest)}
              className="group flex items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-lg ring-1 ring-black/5 transition active:scale-[0.98]"
            >
              <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${p.grad} text-white`}>
                <p.icon className="h-6 w-6" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold text-neutral-800">{p.label}</span>
                <span className="block text-xs text-neutral-400">{p.desc}</span>
              </span>
              <ChevronRight className="h-5 w-5 text-neutral-300 transition group-hover:translate-x-0.5 group-hover:text-brand-500" />
            </button>
          ))}
        </div>

        <p className="mt-6 text-center text-xs text-white/70">
          ข้อมูลทั้ง 3 ระบบเชื่อมกันชุดเดียว · หรือ{" "}
          <Link href="/login" className="font-semibold text-white underline underline-offset-2">เข้าสู่ระบบด้วยบัญชี</Link>
        </p>
      </div>
    </div>
  );
}
