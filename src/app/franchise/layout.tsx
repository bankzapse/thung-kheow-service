"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { franchiseById } from "@/lib/selectors";
import { LogOut, ArrowLeft } from "lucide-react";
import { Logo } from "@/components/Logo";
import Link from "next/link";

export default function FranchiseLayout({ children }: { children: React.ReactNode }) {
  const { ready, currentUser, logout, db } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (!currentUser) router.replace("/login");
    else if (currentUser.role !== "franchise") router.replace("/home");
  }, [ready, currentUser, router]);

  if (!ready || !currentUser || currentUser.role !== "franchise") {
    return <div className="grid min-h-dvh place-items-center text-neutral-400">กำลังโหลด…</div>;
  }

  const fr = franchiseById(db, currentUser.franchiseId ?? "");

  return (
    <div className="min-h-dvh bg-neutral-100">
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          <Link href="/franchise" className="flex items-center gap-2">
            <Logo size={30} />
            <span className="font-bold text-neutral-800">
              Green<span className="text-brand-600">Drop</span>{" "}
              <span className="font-medium text-neutral-400">· {fr ? <>แฟรนไชส์ <span className="font-mono">{fr.code}</span></> : "แฟรนไชส์"}</span>
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/home" className="btn-ghost !px-2 !py-2 text-sm text-neutral-500"><ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">กลับแอป</span></Link>
            <button onClick={logout} className="btn-ghost !px-2 !py-2 text-sm text-neutral-500"><LogOut className="h-4 w-4" /> ออก</button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
