"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { BottomNav } from "@/components/BottomNav";
import { Ban } from "lucide-react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { ready, currentUser, logout } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (ready && !currentUser) router.replace("/");
  }, [ready, currentUser, router]);

  if (!ready || !currentUser) {
    return <div className="grid min-h-dvh place-items-center text-neutral-400">กำลังโหลด…</div>;
  }

  // บัญชีถูกแอดมินระงับ → บล็อกการใช้งาน
  if (currentUser.status === "suspended") {
    return (
      <div className="grid min-h-dvh place-items-center px-8 text-center">
        <div>
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-500">
            <Ban className="h-7 w-7" />
          </div>
          <h1 className="text-lg font-bold text-neutral-800">บัญชีถูกระงับการใช้งาน</h1>
          <p className="mt-1 text-sm text-neutral-500">กรุณาติดต่อผู้ดูแลระบบเพื่อขอเปิดใช้งานอีกครั้ง</p>
          <button
            onClick={() => {
              logout();
              router.replace("/");
            }}
            className="btn-outline mx-auto mt-5"
          >
            ออกจากระบบ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh">
      {children}
      <BottomNav role={currentUser.role} />
    </div>
  );
}
